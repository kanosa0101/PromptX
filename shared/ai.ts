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

/** 调用 OpenAI 兼容 Chat Completions 接口（超时/网络/5xx/429 自动重试一次） */
async function chat(config: AiConfig, messages: ChatMessage[]): Promise<string> {
  if (!config.aiApiKey.trim()) {
    throw new Error('未配置 API Key，请先在设置中填写')
  }
  if (!config.aiBaseUrl.trim()) {
    throw new Error('未配置 AI 服务地址（Base URL），请先在设置中填写')
  }

  let lastError: Error = new Error('AI 请求失败')

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

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
            stream: false,
            // 推理模式关闭时请求跳过思考（DeepSeek 等混合推理模型）
            ...(config.optimizeThinking ? {} : { thinking: { type: 'disabled' as const } }),
          } satisfies ChatRequestBody),
          signal: controller.signal,
        })
      } catch (error) {
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

      const data = await response.json().catch(() => {
        throw new Error('AI 响应解析失败')
      })
      const content: string = data?.choices?.[0]?.message?.content ?? ''
      const optimized = stripCodeFence(content)
      if (!optimized) {
        throw new Error('AI 返回了空内容')
      }
      return optimized
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (lastError instanceof RetryableError && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      throw lastError
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError
}

/** 用模板优化文本（system=优化模板，user=选中的原文） */
export async function optimizeText(config: AiConfig, text: string): Promise<string> {
  const userText =
    text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text
  return chat(config, [
    { role: 'system', content: config.optimizeTemplate || DEFAULT_OPTIMIZE_TEMPLATE },
    { role: 'user', content: userText },
  ])
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
