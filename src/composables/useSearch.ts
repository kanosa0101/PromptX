import Fuse from 'fuse.js'
import { pinyin } from 'pinyin-pro'
import type { Prompt, SearchResult } from '@/types'

/**
 * 获取字符串的拼音首字母
 */
function getPinyinInitials(text: string): string {
  // 转换为拼音首字母数组，过滤非中文字符
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

export function useSearch(prompts: Prompt[], query: string, spaceId?: string): SearchResult[] {
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

        return (
          titleInitials.includes(queryLower) ||
          titleFull.includes(queryLower) ||
          contentInitials.includes(queryLower) ||
          // 也支持中文标题的英文部分匹配
          p.title.toLowerCase().includes(queryLower) ||
          p.content.toLowerCase().includes(queryLower)
        )
      })
      .map((p) => ({ ...p }))
  }

  // Fuse.js 配置（用于普通搜索）
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

  const fuse = new Fuse(filtered, fuseOptions)
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
 * 高亮匹配文本
 */
export function highlightMatches(text: string, matches?: { indices: Array<[number, number]> }[]): string {
  if (!matches || matches.length === 0) {
    return text
  }

  let result = text
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

  // 构建高亮文本
  let offset = 0
  for (const [start, end] of merged) {
    const before = result.slice(0, start + offset)
    const match = result.slice(start + offset, end + offset + 1)
    const after = result.slice(end + offset + 1)

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