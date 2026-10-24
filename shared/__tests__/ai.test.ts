/**
 * shared/ai.ts 单元测试：端点拼接、代码围栏剥离、重试与错误分类
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { chatEndpoint, stripCodeFence, optimizeText, testAiConnection } from '../ai'
import { DEFAULT_OPTIMIZE_TEMPLATE } from '../types'

const CONFIG = {
  aiBaseUrl: 'https://api.test.com',
  aiApiKey: 'sk-test',
  aiModel: 'test-model',
  optimizeTemplate: '你是测试模板',
  optimizeThinking: false,
}

/** 构造 200 响应（OpenAI 兼容结构） */
function okResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
  })
}

function errorResponse(status: number, body = ''): Response {
  return new Response(body, { status })
}

/** 取出 fetch 被调用时的请求体（JSON 已解析） */
async function requestBodyOf(call: number): Promise<Record<string, unknown>> {
  const fetchMock = vi.mocked(fetch)
  const init = fetchMock.mock.calls[call][1] as RequestInit
  return JSON.parse(String(init.body))
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('chatEndpoint', () => {
  it('拼接无 /v1 后缀的 Base URL', () => {
    expect(chatEndpoint('https://api.test.com')).toBe(
      'https://api.test.com/chat/completions'
    )
  })

  it('保留 /v1 后缀', () => {
    expect(chatEndpoint('https://api.test.com/v1')).toBe(
      'https://api.test.com/v1/chat/completions'
    )
  })

  it('去掉末尾多余斜杠', () => {
    expect(chatEndpoint('https://api.test.com/v1/')).toBe(
      'https://api.test.com/v1/chat/completions'
    )
  })
})

describe('stripCodeFence', () => {
  it('剥离带语言标记的代码围栏', () => {
    expect(stripCodeFence('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('剥离无语言标记的代码围栏', () => {
    expect(stripCodeFence('```\n优化结果\n```')).toBe('优化结果')
  })

  it('无围栏时返回原文（去除首尾空白）', () => {
    expect(stripCodeFence('  普通文本  ')).toBe('普通文本')
  })

  it('围栏未闭合时返回原文', () => {
    expect(stripCodeFence('```json\n{"a":1}')).toBe('```json\n{"a":1}')
  })
})

describe('optimizeText', () => {
  it('成功：携带模板、正文与禁用思考标记', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse('优化后文本'))
    const result = await optimizeText(CONFIG, '原文')
    expect(result).toBe('优化后文本')

    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      'https://api.test.com/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
        }),
      })
    )
    const body = await requestBodyOf(0)
    expect(body.model).toBe('test-model')
    expect(body.stream).toBe(false)
    expect(body.thinking).toEqual({ type: 'disabled' })
    expect(body.messages).toEqual([
      { role: 'system', content: '你是测试模板' },
      { role: 'user', content: '原文' },
    ])
  })

  it('模板为空串时回退到内置默认模板', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse('ok'))
    await optimizeText({ ...CONFIG, optimizeTemplate: '' }, '原文')
    const body = await requestBodyOf(0)
    expect((body.messages as Array<{ role: string; content: string }>)[0].content).toBe(
      DEFAULT_OPTIMIZE_TEMPLATE
    )
  })

  it('推理模式开启时不携带 thinking 字段', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse('ok'))
    await optimizeText({ ...CONFIG, optimizeThinking: true }, '原文')
    const body = await requestBodyOf(0)
    expect(body.thinking).toBeUndefined()
  })

  it('未配置 API Key 时直接抛错且不发请求', async () => {
    await expect(optimizeText({ ...CONFIG, aiApiKey: ' ' }, '原文')).rejects.toThrow(
      /API Key/
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('未配置 Base URL 时直接抛错', async () => {
    await expect(optimizeText({ ...CONFIG, aiBaseUrl: '' }, '原文')).rejects.toThrow(
      /Base URL/
    )
  })

  it('401 客户端错误不重试，并附带 API Key 提示', async () => {
    vi.mocked(fetch).mockResolvedValue(errorResponse(401, 'unauthorized'))
    await expect(optimizeText(CONFIG, '原文')).rejects.toThrow(/401.*API Key/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('5xx 服务端错误自动重试一次并成功', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(errorResponse(502, 'bad gateway'))
      .mockResolvedValueOnce(okResponse('重试成功'))
    const result = await optimizeText(CONFIG, '原文')
    expect(result).toBe('重试成功')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('网络故障自动重试一次并成功', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(okResponse('网络恢复'))
    const result = await optimizeText(CONFIG, '原文')
    expect(result).toBe('网络恢复')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('AI 返回空内容时抛错', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(''))
    await expect(optimizeText(CONFIG, '原文')).rejects.toThrow('AI 返回了空内容')
  })

  it('剥离响应中的代码围栏', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse('```\n优化结果\n```'))
    const result = await optimizeText(CONFIG, '原文')
    expect(result).toBe('优化结果')
  })

  it('超长输入截断到上限', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse('ok'))
    const longText = 'x'.repeat(13_000)
    await optimizeText(CONFIG, longText)
    const body = await requestBodyOf(0)
    const userMessage = (body.messages as Array<{ role: string; content: string }>)[1]
    expect(userMessage.content.length).toBe(12_000)
  })
})

describe('optimizeText 取消（外部 AbortSignal）', () => {
  it('调用前已中止：直接抛「已取消」且不发起请求', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(optimizeText(CONFIG, '原文', controller.signal)).rejects.toThrow('已取消')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('请求进行中中止：抛「已取消」且不重试', async () => {
    // fetch 永不完成，模拟慢请求；外部 abort 应立刻结束且不触发第二次尝试
    vi.mocked(fetch).mockImplementation(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          )
        })
    )
    const controller = new AbortController()
    const pending = optimizeText(CONFIG, '原文', controller.signal)
    // 让 optimizeText 先发起 fetch
    await Promise.resolve()
    controller.abort()
    await expect(pending).rejects.toThrow('已取消')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe('testAiConnection', () => {
  it('发送最小用户消息并返回回复', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse('OK'))
    const reply = await testAiConnection(
      CONFIG.aiBaseUrl,
      CONFIG.aiApiKey,
      CONFIG.aiModel,
      false
    )
    expect(reply).toBe('OK')
    const body = await requestBodyOf(0)
    expect(body.messages).toEqual([{ role: 'user', content: '请只回复两个字符：OK' }])
  })
})
