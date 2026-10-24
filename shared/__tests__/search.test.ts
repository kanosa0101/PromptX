/**
 * shared/search.ts 单元测试：搜索（模糊/拼音/空间过滤）与高亮转义
 * highlightMatches 的 HTML 转义是 v-html 的 XSS 防线，必须覆盖
 */
import { describe, it, expect } from 'vitest'
import { searchPrompts, highlightMatches, truncate } from '../search'
import type { Prompt } from '../types'

function makePrompt(overrides: Partial<Prompt>): Prompt {
  return {
    id: 'p1',
    title: '代码解释',
    content: '请解释以下代码',
    tags: [],
    spaceId: 'space_default',
    variables: [],
    usageCount: 0,
    lastUsedAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('searchPrompts', () => {
  const prompts = [
    makePrompt({ id: 'a', title: '代码解释', content: '请解释以下代码' }),
    makePrompt({ id: 'b', title: '翻译助手', content: '翻译成英文', tags: ['翻译'] }),
    makePrompt({ id: 'c', title: '代码重构', content: '重构', spaceId: 'space_work' }),
  ]

  it('无查询词时返回空间内全部条目（拷贝，不携带 matches）', () => {
    const results = searchPrompts(prompts, '', 'space_default')
    expect(results.map((r) => r.id)).toEqual(['a', 'b'])
    expect(results[0]).not.toBe(prompts[0])
  })

  it('按空间过滤', () => {
    const results = searchPrompts(prompts, '代码', 'space_work')
    expect(results.map((r) => r.id)).toEqual(['c'])
  })

  it('中文模糊搜索命中并返回匹配区间', () => {
    const results = searchPrompts(prompts, '代码', 'space_default')
    expect(results.map((r) => r.id)).toContain('a')
    const hit = results.find((r) => r.id === 'a')
    expect(hit?.matches?.length).toBeGreaterThan(0)
    expect(hit?.matches?.[0].indices.length).toBeGreaterThan(0)
  })

  it('拼音首字母搜索命中（dmjs → 代码解释）', () => {
    const results = searchPrompts(prompts, 'dmjs', 'space_default')
    expect(results.map((r) => r.id)).toContain('a')
  })

  it('全拼搜索命中（fanyi → 翻译助手）', () => {
    const results = searchPrompts(prompts, 'fanyi', 'space_default')
    expect(results.map((r) => r.id)).toContain('b')
  })

  it('拼音搜索也匹配标签', () => {
    const results = searchPrompts(prompts, 'fanyi', 'space_default')
    expect(results.map((r) => r.id)).toContain('b')
  })

  it('无命中返回空数组', () => {
    expect(searchPrompts(prompts, '不存在的关键词xyz', 'space_default')).toEqual([])
  })
})

describe('highlightMatches', () => {
  it('无匹配时返回转义后的纯文本', () => {
    expect(highlightMatches('普通文本')).toBe('普通文本')
  })

  it('转义 HTML 特殊字符（XSS 防线）', () => {
    const output = highlightMatches('<script>alert("x")</script>')
    expect(output).not.toContain('<script>')
    expect(output).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })

  it('在转义后的文本中插入高亮 span', () => {
    const output = highlightMatches('代码解释', [
      { indices: [[0, 1]] },
    ])
    expect(output).toBe('<span class="highlight-match">代码</span>解释')
  })

  it('对含特殊字符的文本正确高亮（索引按原文映射）', () => {
    // 原文 "a<b & c"，匹配 [1,1]（字符 <，转义后仍映射到正确位置）
    const output = highlightMatches('a<b & c', [{ indices: [[1, 1]] }])
    expect(output).toBe('a<span class="highlight-match">&lt;</span>b &amp; c')
  })

  it('合并重叠的匹配区间', () => {
    const output = highlightMatches('abcd', [
      { indices: [[0, 1]] },
      { indices: [[1, 2]] },
    ])
    expect(output).toBe('<span class="highlight-match">abc</span>d')
  })
})

describe('truncate', () => {
  it('短文本原样返回', () => {
    expect(truncate('abc', 10)).toBe('abc')
  })

  it('超长文本截断并追加省略号', () => {
    expect(truncate('abcdef', 3)).toBe('abc...')
  })
})
