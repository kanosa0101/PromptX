/**
 * 变量解析与替换工具
 */

import type { Variable } from '../types'

// 系统变量列表
const SYSTEM_VARIABLES = ['clipboard', 'date', 'time', 'timestamp']

/**
 * 解析提示词中的变量
 */
export function parseVariables(content: string): Variable[] {
  const regex = /\{\{(\w+)\}\}/g
  const matches = content.matchAll(regex)
  const variables: Variable[] = []

  for (const match of matches) {
    const name = match[1]
    if (!variables.find(v => v.name === name)) {
      variables.push({
        name,
        type: SYSTEM_VARIABLES.includes(name) ? 'system' : 'custom'
      })
    }
  }

  return variables
}

/**
 * 替换变量
 */
export function replaceVariables(content: string, values: Record<string, string>): string {
  let result = content
  for (const [name, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), value)
  }
  return result
}

/**
 * 获取自定义变量
 */
export function getCustomVariables(variables: Variable[]): Variable[] {
  return variables.filter(v => v.type === 'custom')
}

/**
 * 获取系统变量值
 */
export function getSystemVariableValue(name: string): string {
  const now = new Date()
  switch (name) {
    case 'date':
      return formatDate(now)
    case 'time':
      return formatTime(now)
    case 'timestamp':
      return String(Date.now())
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