/**
 * 变量解析与替换
 */

import type { Variable } from '@/types'

const SYSTEM_VARIABLES = ['clipboard', 'date', 'time', 'timestamp']

/**
 * 解析提示词内容中的变量
 */
export function parseVariables(content: string): Variable[] {
  const regex = /\{\{(\w+)\}\}/g
  const matches = content.matchAll(regex)
  const variables: Variable[] = []
  const seen = new Set<string>()

  for (const match of matches) {
    const name = match[1]
    if (!seen.has(name)) {
      seen.add(name)
      variables.push({
        name,
        type: SYSTEM_VARIABLES.includes(name) ? 'system' : 'custom',
        defaultValue: undefined
      })
    }
  }

  return variables
}

/**
 * 替换变量为实际值
 */
export function replaceVariables(content: string, values: Record<string, string>): string {
  let result = content
  for (const [name, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), value)
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
 * 格式化日期
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * 格式化时间
 */
function formatTime(date: Date): string {
  return date.toTimeString().split(' ')[0]
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