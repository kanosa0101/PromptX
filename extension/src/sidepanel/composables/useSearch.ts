/**
 * 搜索 Composable (带拼音匹配)
 */

import Fuse from 'fuse.js'
import { pinyin } from 'pinyin-pro'
import type { Prompt, SearchResult, MatchResult } from '@/types'

interface FuseMatch {
  key?: string
  indices: Array<[number, number]>
}

export function useSearch(
  prompts: Prompt[],
  query: string,
  spaceId?: string
): SearchResult[] {
  // 空间过滤
  let filtered = prompts
  if (spaceId && spaceId !== 'all') {
    filtered = prompts.filter(p => p.spaceId === spaceId)
  }

  // 无查询，返回全部
  if (!query.trim()) {
    return filtered.map(p => ({ ...p, matches: undefined }))
  }

  // Fuse.js 配置
  const fuseOptions = {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'content', weight: 0.3 },
      { name: 'tags', weight: 0.2 }
    ],
    threshold: 0.3,
    includeMatches: true
  }

  // 拼音匹配 (纯字母输入)
  if (/^[a-zA-Z]+$/.test(query)) {
    return pinyinSearch(filtered, query)
  }

  // Fuse.js 搜索
  const fuse = new Fuse(filtered, fuseOptions)
  const results = fuse.search(query)

  return results.map(r => ({
    ...r.item,
    matches: r.matches?.map((m: FuseMatch) => ({
      key: m.key || '',
      indices: m.indices
    }))
  }))
}

/**
 * 拼音搜索
 */
function pinyinSearch(prompts: Prompt[], query: string): SearchResult[] {
  const results: SearchResult[] = []
  const queryLower = query.toLowerCase()

  for (const prompt of prompts) {
    // 标题拼音匹配
    const titlePinyin = getPinyin(prompt.title)
    const titleInitials = getPinyinInitials(prompt.title)

    if (titlePinyin.includes(queryLower) || titleInitials.includes(queryLower)) {
      results.push({ ...prompt, matches: undefined })
      continue
    }

    // 标题英文部分匹配
    if (prompt.title.toLowerCase().includes(queryLower)) {
      results.push({ ...prompt, matches: undefined })
      continue
    }

    // 内容拼音匹配
    const contentPinyin = getPinyin(prompt.content)
    if (contentPinyin.includes(queryLower)) {
      results.push({ ...prompt, matches: undefined })
    }
  }

  return results
}

/**
 * 获取完整拼音
 */
function getPinyin(text: string): string {
  try {
    return pinyin(text, { pattern: 'pinyin', toneType: 'none' }).join('')
  } catch {
    return ''
  }
}

/**
 * 获取拼音首字母
 */
function getPinyinInitials(text: string): string {
  try {
    return pinyin(text, { pattern: 'first', toneType: 'none' }).join('')
  } catch {
    return ''
  }
}

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
export function highlightMatches(text: string, matches?: MatchResult[]): string {
  if (!matches || matches.length === 0) return escapeHtml(text)

  // 先转义原始文本
  const escaped = escapeHtml(text)

  // 收集所有匹配位置
  const positions: Array<[number, number]> = []
  for (const match of matches) {
    for (const [start, end] of match.indices) {
      positions.push([start, end])
    }
  }

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
  let result = escaped
  let offset = 0
  for (const [start, end] of merged) {
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
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}