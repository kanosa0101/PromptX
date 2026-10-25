/**
 * chrome.storage 封装
 *
 * 存储后端：NM（Native Messaging）未连接时完全本地；连接期间 spaces/prompts
 * 以桌面端为数据源（读经 NM、写经 replaceAll 回桌面），本地存储持续保存
 * 一份镜像作为离线回退；settings 两种模式都只存本浏览器。
 */

import type { ExtensionAppData } from '@/types'
import { DEFAULT_APP_DATA, DEFAULT_SETTINGS } from '@/types'
import type { Prompt, Space } from '@shared/types'
import { isNmConnected, nmRequest } from './nm'

export const STORAGE_KEY = 'promptx_data'

/**
 * 加载本地存储数据（设置 + 离线镜像）
 */
export async function loadLocalAppData(): Promise<ExtensionAppData> {
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
 * 加载应用数据：NM 连接期间 spaces/prompts 取桌面端（失败回退本地镜像），
 * settings 恒为本地
 */
export async function loadAppData(): Promise<ExtensionAppData> {
  const local = await loadLocalAppData()
  if (!isNmConnected()) return local
  try {
    const response = await nmRequest<{ data: { spaces?: Space[]; prompts?: Prompt[] } }>('getAppData')
    return {
      ...local,
      spaces: response.data.spaces || [],
      prompts: response.data.prompts || [],
    }
  } catch {
    return local
  }
}

/** NM 写路径：整组回写桌面端，并把合并结果镜像到本地（离线回退用） */
async function replaceAllViaNm(spaces: Space[], prompts: Prompt[]): Promise<void> {
  await nmRequest('replaceAll', { spaces, prompts })
}

/**
 * 连接建立后的一次性合并：本地镜像中桌面端没有的提示词补录到桌面端
 * （按内容新开条目；空间缺失时归入默认空间）
 */
export async function mergeLocalOnlyIntoDesktop(): Promise<void> {
  if (!isNmConnected()) return
  try {
    const [local, remote] = await Promise.all([
      loadLocalAppData(),
      nmRequest<{ data: { spaces?: Space[]; prompts?: Prompt[] } }>('getAppData'),
    ])
    const remoteSpaceIds = new Set((remote.data.spaces || []).map((s) => s.id))
    const remotePromptIds = new Set((remote.data.prompts || []).map((p) => p.id))
    for (const prompt of local.prompts) {
      if (remotePromptIds.has(prompt.id)) continue
      await nmRequest('createPrompt', {
        prompt: {
          title: prompt.title,
          content: prompt.content,
          tags: prompt.tags,
          spaceId: remoteSpaceIds.has(prompt.spaceId) ? prompt.spaceId : 'space_default',
        },
      })
    }
  } catch {
    // 合并失败不阻断连接使用
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
  await enqueueWrite(async () => {
    // NM 连接期间导入等整体写入同样同步桌面端（失败不影响本地）
    if (isNmConnected()) {
      try {
        await replaceAllViaNm(data.spaces || [], data.prompts || [])
      } catch {
        // 本地仍写入，桌面端下次连接时经一次性合并补齐
      }
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: data })
  })
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
      const local = await loadLocalAppData()
      let data = local
      let viaNm = false
      if (isNmConnected()) {
        try {
          const remote = await nmRequest<{ data: { spaces?: Space[]; prompts?: Prompt[] } }>('getAppData')
          data = {
            ...local,
            spaces: remote.data.spaces || [],
            prompts: remote.data.prompts || [],
          }
          viaNm = true
        } catch {
          // NM 瞬时故障：退回本地读改写
        }
      }
      const result = await mutate(data)
      if (viaNm) {
        try {
          await replaceAllViaNm(data.spaces || [], data.prompts || [])
        } catch {
          // 桌面端写失败：本地镜像仍更新，断线期间继续可用
        }
      }
      // 本地始终保存合并结果（离线回退 + 下次连接的一次性合并基准）
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