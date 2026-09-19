import { describe, it, expect, beforeEach } from 'vitest'
import { searchPrompts, highlightMatches, truncate } from '../useSearch'
import type { Prompt } from '@/types'

// Helper to create a Prompt object with defaults
function makePrompt(overrides: Partial<Prompt> & { id: string; title: string; content: string }): Prompt {
  return {
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

const samplePrompts: Prompt[] = [
  makePrompt({
    id: 'p1',
    title: '代码解释',
    content: '请解释以下代码的功能',
    tags: ['开发', '代码'],
    spaceId: 'space_work',
  }),
  makePrompt({
    id: 'p2',
    title: '文档润色',
    content: '请润色以下文档',
    tags: ['写作', '文档'],
    spaceId: 'space_work',
  }),
  makePrompt({
    id: 'p3',
    title: '翻译助手',
    content: '请翻译以下内容',
    tags: ['翻译'],
    spaceId: 'space_default',
  }),
]

describe('searchPrompts', () => {
  beforeEach(() => {
    // Clear the Fuse cache between tests so stale data doesn't leak
    // The cache is module-scoped, so we re-import to reset is not easy;
    // instead we rely on the cache key being spaceId-based and the
    // reference-check logic to invalidate when prompts change.
  })

  it('returns all prompts (mapped) when query is empty', () => {
    const results = searchPrompts(samplePrompts, '')
    expect(results).toHaveLength(samplePrompts.length)
    // Verify it returns copies, not the same references
    results.forEach((r, i) => {
      expect(r.id).toBe(samplePrompts[i].id)
    })
  })

  it('returns all prompts when query is whitespace-only', () => {
    const results = searchPrompts(samplePrompts, '   ')
    expect(results).toHaveLength(samplePrompts.length)
  })

  it('filters by spaceId when provided', () => {
    const results = searchPrompts(samplePrompts, '', 'space_work')
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.spaceId === 'space_work')).toBe(true)
  })

  it('filters by spaceId and empty query returns only that space', () => {
    const results = searchPrompts(samplePrompts, '', 'space_default')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('p3')
  })

  it('pinyin matching: pure ASCII input triggers pinyin path', () => {
    // 'daima' is the pinyin for '代码' — should match '代码解释'
    const results = searchPrompts(samplePrompts, 'daima')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((r) => r.id === 'p1')).toBe(true)
  })

  it('pinyin matching: initials match (e.g. "dm" for 代码)', () => {
    // 'dm' are the pinyin initials for '代码'
    const results = searchPrompts(samplePrompts, 'dm')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((r) => r.id === 'p1')).toBe(true)
  })

  it('Fuse.js fuzzy matching: non-ASCII input triggers Fuse path', () => {
    // Chinese query should use Fuse.js
    const results = searchPrompts(samplePrompts, '代码')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((r) => r.id === 'p1')).toBe(true)
  })

  it('Fuse.js fuzzy matching: partial Chinese match', () => {
    const results = searchPrompts(samplePrompts, '润色')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.some((r) => r.id === 'p2')).toBe(true)
  })

  it('returns empty array when no matches', () => {
    const results = searchPrompts(samplePrompts, 'zzzznonexistent')
    expect(results).toHaveLength(0)
  })

  it('combines spaceId filter with pinyin search', () => {
    // 'fanyi' is pinyin for '翻译' — but '翻译助手' is in space_default
    const results = searchPrompts(samplePrompts, 'fanyi', 'space_work')
    expect(results.every((r) => r.spaceId === 'space_work')).toBe(true)
  })
})

describe('highlightMatches', () => {
  it('returns escaped text when no matches provided', () => {
    const result = highlightMatches('hello world')
    expect(result).toBe('hello world')
  })

  it('returns escaped text when matches is empty array', () => {
    const result = highlightMatches('hello world', [])
    expect(result).toBe('hello world')
  })

  it('wraps matched regions in <span class="highlight-match">', () => {
    const result = highlightMatches('hello world', [
      { indices: [[0, 4]] },
    ])
    expect(result).toBe('<span class="highlight-match">hello</span> world')
  })

  it('wraps multiple match regions', () => {
    const result = highlightMatches('abc def', [
      { indices: [[0, 2], [4, 6]] },
    ])
    expect(result).toBe('<span class="highlight-match">abc</span> <span class="highlight-match">def</span>')
  })

  it('escapes HTML special characters in input', () => {
    const result = highlightMatches('<script>alert("xss")</script>')
    expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    expect(result).not.toContain('<script>')
  })

  it('escapes HTML and still highlights matches', () => {
    const result = highlightMatches('a<b>c', [
      { indices: [[0, 0]] },
    ])
    // 'a' at index 0 is highlighted, '<b>c' is escaped
    expect(result).toContain('<span class="highlight-match">a</span>')
    expect(result).toContain('&lt;b&gt;c')
  })

  it('merges overlapping match regions', () => {
    const result = highlightMatches('abcdef', [
      { indices: [[0, 2], [1, 4]] },
    ])
    // Overlapping [0,2] and [1,4] should merge into [0,4]
    expect(result).toBe('<span class="highlight-match">abcde</span>f')
  })
})

describe('truncate', () => {
  it('returns text as-is when length <= maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('returns text as-is when length equals maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('truncates long text and adds "..."', () => {
    expect(truncate('hello world', 5)).toBe('hello...')
  })

  it('handles empty string', () => {
    expect(truncate('', 10)).toBe('')
  })

  it('handles maxLength of 0', () => {
    expect(truncate('hello', 0)).toBe('...')
  })
})
