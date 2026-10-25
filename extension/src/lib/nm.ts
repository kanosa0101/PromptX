/**
 * Native Messaging 客户端：连接桌面端共享数据
 *
 * 桌面端注册（设置 → 浏览器扩展同步）后，Side Panel 经 connectNative
 * 与 promptx.exe --nm-host 建立 stdio 长连接。连接期间 spaces/prompts
 * 以桌面端为数据源（设置仍存本浏览器）；断开自动回退独立模式。
 */

const NM_HOST = 'com.promptx.nm'
const HANDSHAKE_TIMEOUT_MS = 4000
const REQUEST_TIMEOUT_MS = 8000

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

let port: chrome.runtime.Port | null = null
let connected = false
let requestId = 0
const pending = new Map<number, PendingRequest>()
const dataChangedListeners = new Set<() => void>()
const statusListeners = new Set<(connected: boolean) => void>()

function handleMessage(message: Record<string, unknown>): void {
  // 桌面端主动推送（另一端改了数据）
  if (message.type === 'dataChanged') {
    dataChangedListeners.forEach((cb) => cb())
    return
  }
  const id = Number(message.id)
  const entry = pending.get(id)
  if (!entry) return
  pending.delete(id)
  clearTimeout(entry.timer)
  if (message.ok) {
    entry.resolve(message)
  } else {
    entry.reject(new Error(String(message.error ?? 'NM 请求失败')))
  }
}

function handleDisconnect(): void {
  port = null
  if (connected) {
    connected = false
    statusListeners.forEach((cb) => cb(false))
  }
  for (const [, entry] of pending) {
    clearTimeout(entry.timer)
    entry.reject(new Error('NM 连接已断开'))
  }
  pending.clear()
}

/**
 * 建立连接：connectNative → ping 握手。
 * 桌面端未注册（或已退出）时 connectNative 立即断开，resolve(false)
 */
export function nmConnect(): Promise<boolean> {
  if (connected && port) return Promise.resolve(true)

  return new Promise((resolve) => {
    let candidate: chrome.runtime.Port
    try {
      candidate = chrome.runtime.connectNative(NM_HOST)
    } catch {
      resolve(false)
      return
    }

    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (ok) {
        port = candidate
        connected = true
        statusListeners.forEach((cb) => cb(true))
      } else {
        try {
          candidate.disconnect()
        } catch {
          // 已断开
        }
      }
      resolve(ok)
    }

    const timer = setTimeout(() => finish(false), HANDSHAKE_TIMEOUT_MS)

    candidate.onMessage.addListener((message) => {
      if (!settled) {
        if (message && (message as { pong?: boolean }).pong) {
          finish(true)
        }
        return
      }
      handleMessage(message as Record<string, unknown>)
    })
    candidate.onDisconnect.addListener(() => {
      if (!settled) {
        finish(false)
        return
      }
      handleDisconnect()
    })

    try {
      candidate.postMessage({ id: ++requestId, type: 'ping' })
    } catch {
      finish(false)
    }
  })
}

/** 主动断开 */
export function nmDisconnect(): void {
  try {
    port?.disconnect()
  } catch {
    // 忽略
  }
  handleDisconnect()
}

export function isNmConnected(): boolean {
  return connected
}

/** 发请求（连接期间使用；超时按错误处理） */
export function nmRequest<T = Record<string, unknown>>(
  type: string,
  payload: Record<string, unknown> = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  if (!connected || !port) {
    return Promise.reject(new Error('NM 未连接'))
  }
  return new Promise<T>((resolve, reject) => {
    const id = ++requestId
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('NM 请求超时'))
    }, timeoutMs)
    pending.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timer,
    })
    try {
      port!.postMessage({ id, type, ...payload })
    } catch (error) {
      clearTimeout(timer)
      pending.delete(id)
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

/** 桌面端数据变更（对方写入）通知 */
export function onNmDataChanged(callback: () => void): () => void {
  dataChangedListeners.add(callback)
  return () => dataChangedListeners.delete(callback)
}

/** 连接状态变化通知 */
export function onNmStatusChanged(callback: (connected: boolean) => void): () => void {
  statusListeners.add(callback)
  return () => statusListeners.delete(callback)
}
