/**
 * chrome.storage 封装
 */

import type { ExtensionAppData } from '@/types'
import { DEFAULT_APP_DATA, DEFAULT_SETTINGS } from '@/types'

export const STORAGE_KEY = 'promptx_data'

/**
 * 加载应用数据
 */
export async function loadAppData(): Promise<ExtensionAppData> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    if (result[STORAGE_KEY]) {
      const data = result[STORAGE_KEY] as ExtensionAppData
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
/** 写队列：串行化本上下文内的读改写，避免并发互相覆盖 */
let writeChain: Promise<unknown> = Promise.resolve()

export function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task)
  writeChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function saveAppData(data: ExtensionAppData): Promise<void> {
  await enqueueWrite(() => chrome.storage.local.set({ [STORAGE_KEY]: data }))
}

/**
 * 跨上下文互斥（Web Locks API）：background 与 sidepanel 是两个独立 JS 上下文，
 * 各自的写队列感知不到对方。用同名锁把「读取-修改-写入」整体串行，
 * 避免 sidepanel 保存提示词时覆盖掉 background 刚写入的 AI 历史（或反之）
 */
async function withStorageLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('promptx-storage', { mode: 'exclusive' }, () => task())
  }
  return task()
}

/**
 * 原子化「读取-修改-写入」：锁内读取最新数据，交给 mutate 修改后整体写回。
 * 所有跨字段写入（AI 历史、提示词编辑、设置保存）都应经由这里，
 * 且只修改自己负责的字段——其余字段保留锁内最新快照，不会被过期状态覆盖
 */
export function mutateAppData<T>(mutate: (data: ExtensionAppData) => T | Promise<T>): Promise<T> {
  return enqueueWrite(() =>
    withStorageLock(async () => {
      const data = await loadAppData()
      const result = await mutate(data)
      await chrome.storage.local.set({ [STORAGE_KEY]: data })
      return result
    }),
  )
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
  const imported = JSON.parse(jsonStr) as ExtensionAppData

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