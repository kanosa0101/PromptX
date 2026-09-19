import Fuse from 'fuse.js'
import { pinyin } from 'pinyin-pro'
import type { Prompt, SearchResult } from '@/types'

/**
 * 获取字符串的拼音首字母
 */
function getPinyinInitials(text: string): string {
  const py = pinyin(text, { pattern: 'first', toneType: 'none' })
  return py.toLowerCase().replace(/\s+/g, '')
}

/**
 * 获取字符串的完整拼音
 */
function getPinyinFull(text: string): string {
  return pinyin(text, { toneType: 'none', type: 'array' })
    .join('')
    .toLowerCase()
}

// Fuse.js 配置
const fuseOptions = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'content', weight: 0.3 },
    { name: 'tags', weight: 0.2 },
  ],
  threshold: 0.3,
  includeMatches: true,
  findAllMatches: true,
}

// Fuse 实例缓存（按空间 ID 缓存）
const fuseCache = new Map<string, Fuse<Prompt>>()

/**
 * 获取或创建 Fuse 实例（按空间 ID 缓存）
 */
function getFuseInstance(prompts: Prompt[], spaceId?: string): Fuse<Prompt> {
  const cacheKey = spaceId || '__all__'

  const cached = fuseCache.get(cacheKey)
  if (cached) {
    // 检查数据是否变化（通过引用比较）
    // Fuse 内部持有列表引用，如果列表没变则复用
    const cachedItems = cached.getIndex().docs as Prompt[]
    if (cachedItems === prompts || (cachedItems.length === prompts.length && cachedItems.every((item, i) => item.id === prompts[i]?.id))) {
      return cached
    }
  }

  const fuse = new Fuse(prompts, fuseOptions)
  fuseCache.set(cacheKey, fuse)
  return fuse
}

/**
 * 搜索提示词（支持拼音匹配和模糊搜索）
 */
export function searchPrompts(prompts: Prompt[], query: string, spaceId?: string): SearchResult[] {
  // 先按空间过滤
  const filtered = spaceId ? prompts.filter((p) => p.spaceId === spaceId) : prompts

  // 如果没有查询词，返回所有结果
  if (!query.trim()) {
    return filtered.map((p) => ({ ...p }))
  }

  const queryLower = query.toLowerCase()

  // 检查是否为拼音查询（纯字母）
  const isPinyinQuery = /^[a-zA-Z]+$/.test(queryLower)

  if (isPinyinQuery) {
    // 拼音搜索：匹配首字母或完整拼音
    return filtered
      .filter((p) => {
        const titleInitials = getPinyinInitials(p.title)
        const titleFull = getPinyinFull(p.title)
        const contentInitials = getPinyinInitials(p.content)
        const tagText = p.tags.join(' ')

        return (
          titleInitials.includes(queryLower) ||
          titleFull.includes(queryLower) ||
          contentInitials.includes(queryLower) ||
          // 也支持中文标题的英文部分匹配
          p.title.toLowerCase().includes(queryLower) ||
          p.content.toLowerCase().includes(queryLower) ||
          // 也搜索标签
          getPinyinFull(tagText).includes(queryLower) ||
          tagText.toLowerCase().includes(queryLower)
        )
      })
      .map((p) => ({ ...p }))
  }

  // Fuse.js 模糊搜索（使用缓存实例）
  const fuse = getFuseInstance(filtered, spaceId)
  const results = fuse.search(query)

  return results.map((r) => ({
    ...r.item,
    matches: r.matches?.map((m) => ({
      key: m.key || '',
      indices: m.indices as Array<[number, number]>,
    })),
  }))
}

/**
 * 向后兼容的别名（旧代码可能引用 useSearch）
 */
export const useSearch = searchPrompts

/**
 * HTML 特殊字符转义，防止 XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 高亮匹配文本
 */
export function highlightMatches(text: string, matches?: { indices: Array<[number, number]> }[]): string {
  if (!matches || matches.length === 0) {
    return escapeHtml(text)
  }

  // 先转义原始文本
  const escaped = escapeHtml(text)
  let result = escaped
  const positions: Array<[number, number]> = []

  matches.forEach((m) => {
    m.indices.forEach(([start, end]) => {
      positions.push([start, end])
    })
  })

  // 按位置排序
  positions.sort((a, b) => a[0] - b[0])

  // 合并重叠区域
  const merged: Array<[number, number]> = []
  for (const [start, end] of positions) {
    if (merged.length === 0 || merged[merged.length - 1][1] < start) {
      merged.push([start, end])
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end)
    }
  }

  // 构建高亮文本（在转义后的文本上操作）
  let offset = 0
  for (const [start, end] of merged) {
    // 转义后字符数可能变化，需要映射原始索引到转义后索引
    const beforeEscaped = escapeHtml(text.slice(0, start))
    const matchEscaped = escapeHtml(text.slice(start, end + 1))

    const beforeLength = beforeEscaped.length
    const matchLength = matchEscaped.length

    const before = result.slice(0, beforeLength + offset)
    const match = result.slice(beforeLength + offset, beforeLength + offset + matchLength)
    const after = result.slice(beforeLength + offset + matchLength)

    result = `${before}<span class="highlight-match">${match}</span>${after}`
    offset += '<span class="highlight-match">'.length + '</span>'.length
  }

  return result
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength) + '...'
}
