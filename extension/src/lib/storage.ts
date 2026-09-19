/**
 * chrome.storage 封装
 */

import type { AppData } from '@/types'
import { DEFAULT_APP_DATA, DEFAULT_SETTINGS } from '@/types'

export const STORAGE_KEY = 'promptx_data'

/**
 * 加载应用数据
 */
export async function loadAppData(): Promise<AppData> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    if (result[STORAGE_KEY]) {
      const data = result[STORAGE_KEY] as AppData
      // 合并默认设置：兼容旧版本数据（补齐新增的 AI 设置字段）
      return { ...data, settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) } }
    }
    return DEFAULT_APP_DATA
  } catch {
    return DEFAULT_APP_DATA
  }
}

/**
 * 保存应用数据
 */
export async function saveAppData(data: AppData): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data })
}

/**
 * 导出数据为 JSON 字符串
 */
export async function exportData(): Promise<string> {
  const data = await loadAppData()
  return JSON.stringify(data, null, 2)
}

/**
 * 导入数据
 */
export async function importData(jsonStr: string, merge = false): Promise<{ imported: number; skipped: number }> {
  const imported = JSON.parse(jsonStr) as AppData

  if (merge) {
    const existing = await loadAppData()

    // 合并空间
    const newSpaces = imported.spaces.filter(s =>
      !existing.spaces.some(es => es.id === s.id)
    )
    existing.spaces.push(...newSpaces)

    // 合并提示词
    const newPrompts = imported.prompts.filter(p =>
      !existing.prompts.some(ep => ep.id === p.id)
    )
    existing.prompts.push(...newPrompts)

    await saveAppData(existing)
    return { imported: newPrompts.length + newSpaces.length, skipped: 0 }
  } else {
    await saveAppData(imported)
    return { imported: imported.prompts.length + imported.spaces.length, skipped: 0 }
  }
}

/**
 * 清空数据
 */
export async function clearData(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}