/**
 * AI 服务：OpenAI 兼容 Chat Completions 客户端（桌面端 + 浏览器扩展端共用）
 */

import { DEFAULT_OPTIMIZE_TEMPLATE, type AiSettings } from './types'

/** AI 请求配置（来自设置） */
export type AiConfig = AiSettings

/** Chat Completions 请求体 */
interface ChatRequestBody {
  model: string
  messages: ChatMessage[]
  temperature: number
  stream: boolean
  max_tokens?: number
  // 推理模式关闭时携带，向 DeepSeek 等混合推理模型请求跳过思考
  thinking?: { type: 'disabled' }
}

/** 请求超时（AI 生成可能较慢，放宽到 60 秒） */
const REQUEST_TIMEOUT_MS = 60_000

/** 输入文本超长截断上限（字符数） */
const MAX_INPUT_CHARS = 12_000

/** Chat Completions 请求消息 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 拼接 Chat Completions 端点
 * Base URL 可带或不带 /v1 后缀（如 https://api.deepseek.com 或 https://api.openai.com/v1）
 */
export function chatEndpoint(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '')
  return `${base}/chat/completions`
}

/** 去掉模型输出外层的 Markdown 代码块包裹（部分模型无视指令时兜底） */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('```')) {
    const withoutOpen = trimmed.slice(3)
    // 跳过语言标记行（```json / ```text 等）
    const newlineIndex = withoutOpen.indexOf('\n')
    const body = newlineIndex >= 0 ? withoutOpen.slice(newlineIndex + 1) : withoutOpen
    if (body.endsWith('```')) {
      return body.slice(0, -3).trim()
    }
  }
  return trimmed
}

/** 可重试错误：超时、网络故障、服务端临时错误（5xx/429） */
class RetryableError extends Error {}

/** 重试参数 */
const MAX_ATTEMPTS = 2
const RETRY_DELAY_MS = 1_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 流式回调：delta 为本次增量，fullText 为已累计全文（重试会从头重放） */
export type StreamDeltaHandler = (delta: string, fullText: string) => void

/**
 * 从 SSE 缓冲中提取并消费完整的 data: 行。
 * 返回 [增量文本, 剩余不完整行]；无法解析的行静默跳过
 */
export function consumeSseLines(buffer: string): [string, string] {
  const lines = buffer.split('\n')
  const remainder = lines.pop() ?? ''
  let delta = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) continue
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') continue
    try {
      const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: unknown } }> }
      const content = json?.choices?.[0]?.delta?.content
      if (typeof content === 'string') {
        delta += content
      }
    } catch {
      // 半截/非 JSON 行忽略（跨 chunk 的行由 remainder 保留到下一轮）
    }
  }
  return [delta, remainder]
}

/**
 * 调用 OpenAI 兼容 Chat Completions 接口（超时/网络/5xx/429 自动重试一次）
 * @param signal 外部取消信号（用户主动取消）：中止后抛出「已取消」且不重试
 * @param onDelta 传入时启用流式（stream: true）：每收到增量回调一次；
 *                流式下超时为「60s 无数据」而非总时长（推理模型思考阶段不计入）
 */
async function chat(
  config: AiConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
  onDelta?: StreamDeltaHandler,
): Promise<string> {
  if (!config.aiApiKey.trim()) {
    throw new Error('未配置 API Key，请先在设置中填写')
  }
  if (!config.aiBaseUrl.trim()) {
    throw new Error('未配置 AI 服务地址（Base URL），请先在设置中填写')
  }

  let lastError: Error = new Error('AI 请求失败')

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) {
      throw new Error('已取消')
    }

    const controller = new AbortController()
    const onExternalAbort = () => controller.abort()
    signal?.addEventListener('abort', onExternalAbort, { once: true })
    // 流式模式下收到数据即重置计时（空闲超时）；非流式为总时长超时
    let timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    }

    try {
      let response: Response
      try {
        response = await fetch(chatEndpoint(config.aiBaseUrl), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.aiApiKey.trim()}`,
          },
          body: JSON.stringify({
            model: config.aiModel.trim(),
            messages,
            temperature: 0.5,
            stream: Boolean(onDelta),
            // 推理模式关闭时请求跳过思考（DeepSeek 等混合推理模型）
            ...(config.optimizeThinking ? {} : { thinking: { type: 'disabled' as const } }),
          } satisfies ChatRequestBody),
          signal: controller.signal,
        })
      } catch (error) {
        // 用户取消：不重试、不当错误展示
        if (signal?.aborted) {
          throw new Error('已取消')
        }
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new RetryableError(`AI 请求超时（${REQUEST_TIMEOUT_MS / 1000}秒）`)
        }
        throw new RetryableError(
          `无法连接到 AI 服务: ${error instanceof Error ? error.message : String(error)}`
        )
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => '')
        const hint =
          response.status === 401 || response.status === 403
            ? '（请检查 API Key 是否正确）'
            : response.status === 404
              ? '（请检查 Base URL 与模型名，多数服务需要以 /v1 结尾）'
              : response.status === 429
                ? '（请求过于频繁或额度不足）'
                : ''
        const detail = errBody.trim().slice(0, 200)
        const message = `AI 接口返回 ${response.status}: ${hint} ${detail}`.trim()
        // 服务端临时性错误可重试；客户端错误（Key 错、参数错）重试无意义
        if (response.status >= 500 || response.status === 429) {
          throw new RetryableError(message)
        }
        throw new Error(message)
      }

      const contentType = response.headers.get('content-type') || ''
      if (onDelta && contentType.includes('text/event-stream') && response.body) {
        // 流式路径：逐块读取 SSE，聚合成全文
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let full = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          resetTimer()
          buffer += decoder.decode(value, { stream: true })
          const [delta, remainder] = consumeSseLines(buffer)
          buffer = remainder
          if (delta) {
            full += delta
            onDelta(delta, full)
          }
        }
        const optimized = stripCodeFence(full)
        if (!optimized) {
          throw new Error('AI 返回了空内容')
        }
        return optimized
      }

      // 非流式路径（未请求流式，或服务端忽略 stream 参数返回整体 JSON）
      const data = await response.json().catch(() => {
        throw new Error('AI 响应解析失败')
      })
      const content: string = data?.choices?.[0]?.message?.content ?? ''
      const optimized = stripCodeFence(content)
      if (!optimized) {
        throw new Error('AI 返回了空内容')
      }
      if (onDelta) {
        onDelta(optimized, optimized)
      }
      return optimized
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      // 用户取消不参与重试
      if (lastError.message === '已取消') {
        throw lastError
      }
      if (lastError instanceof RetryableError && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      throw lastError
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onExternalAbort)
    }
  }

  throw lastError
}

/** 用模板优化文本（system=优化模板，user=选中的原文）；传 onDelta 启用流式增量回调 */
export async function optimizeText(
  config: AiConfig,
  text: string,
  signal?: AbortSignal,
  onDelta?: StreamDeltaHandler,
): Promise<string> {
  const userText =
    text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text
  return chat(config, [
    { role: 'system', content: config.optimizeTemplate || DEFAULT_OPTIMIZE_TEMPLATE },
    { role: 'user', content: userText },
  ], signal, onDelta)
}

/** 测试连接：发送一条最小请求，返回模型回复 */
export async function testAiConnection(
  baseUrl: string,
  apiKey: string,
  model: string,
  optimizeThinking = false
): Promise<string> {
  return chat(
    {
      aiBaseUrl: baseUrl,
      aiApiKey: apiKey,
      aiModel: model,
      optimizeTemplate: DEFAULT_OPTIMIZE_TEMPLATE,
      optimizeThinking,
    },
    [{ role: 'user', content: '请只回复两个字符：OK' }]
  )
}
