/**
 * 变量解析与替换
 */

import type { Variable } from '@/types'

const SYSTEM_VARIABLES = ['clipboard', 'date', 'time', 'timestamp']

/**
 * 解析提示词内容中的变量（支持中文等 Unicode 变量名）
 */
export function parseVariables(content: string): Variable[] {
  const regex = /\{\{([^{}]+)\}\}/g
  const variables: Variable[] = []
  const seen = new Set<string>()

  let match
  while ((match = regex.exec(content)) !== null) {
    const name = match[1].trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    variables.push({
      name,
      type: SYSTEM_VARIABLES.includes(name) ? 'system' : 'custom',
      defaultValue: undefined
    })
  }

  return variables
}

/**
 * 替换变量为实际值（使用字符串替换避免正则注入）
 */
export function replaceVariables(content: string, values: Record<string, string>): string {
  let result = content
  for (const [name, value] of Object.entries(values)) {
    const pattern = '{{' + name + '}}'
    result = result.split(pattern).join(value)
  }
  return result
}

/**
 * 获取系统变量的值
 */
export function getSystemVariableValue(name: string, clipboardText?: string): string {
  const now = new Date()
  switch (name) {
    case 'clipboard':
      return clipboardText || ''
    case 'date':
      return formatDate(now)
    case 'time':
      return formatTime(now)
    case 'timestamp':
      return String(Math.floor(now.getTime() / 1000))
    default:
      return ''
  }
}

/**
 * 格式化日期（本地时间）
 */
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 格式化时间（本地时间）
 */
function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/**
 * 判断是否有自定义变量
 */
export function hasCustomVariables(variables: Variable[]): boolean {
  return variables.some(v => v.type === 'custom')
}

/**
 * 获取自定义变量列表
 */
export function getCustomVariables(variables: Variable[]): Variable[] {
  return variables.filter(v => v.type === 'custom')
}
