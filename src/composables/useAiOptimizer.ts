/**
 * AI 快捷优化：桌面端事件编排
 *
 * Rust 全局快捷键截取选中文本后通过事件推送到这里，
 * 前端调用 OpenAI 兼容接口完成优化，再回调 Rust 贴回原位置。
 */
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { optimizeText } from '@/services/ai'

/** 错误横幅自动消失时长 */
const ERROR_DISMISS_MS = 8000

export function useAiOptimizer() {
  const settingsStore = useSettingsStore()
  const uiStore = useUiStore()

  let errorTimer: ReturnType<typeof setTimeout> | undefined
  let unlistenFns: UnlistenFn[] = []

  /** 前端诊断日志：与 Rust 侧写同一文件，便于对齐时间线 */
  const log = (message: string) => {
    invoke('ai_debug_log', { message }).catch(() => {})
  }

  log('useAiOptimizer 初始化')

  const showError = (message: string) => {
    uiStore.showAiError(message)
    if (errorTimer) clearTimeout(errorTimer)
    errorTimer = setTimeout(() => uiStore.clearAiError(), ERROR_DISMISS_MS)
  }

  /** AI 优化并回调 Rust 贴回原位置 */
  const runOptimize = async (text: string) => {
    try {
      log(`收到优化事件(${text.length} 字符)，开始调用 AI`)
      const optimized = await optimizeText(
        {
          aiBaseUrl: settingsStore.aiBaseUrl,
          aiApiKey: settingsStore.aiApiKey,
          aiModel: settingsStore.aiModel,
          optimizeTemplate: settingsStore.optimizeTemplate,
        },
        text
      )
      log(`AI 返回 ${optimized.length} 字符，回调 Rust 贴回`)
      await invoke('optimize_apply_result', { text: optimized })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log(`AI 流程失败: ${message}`)
      // 结束会话并恢复剪贴板，唤起主窗口展示错误
      invoke('optimize_cancel').catch(() => {})
      invoke('toggle_window').catch(() => {})
      showError(message)
    }
  }

  /** 注册事件监听（在 App 挂载时调用一次） */
  const start = async () => {
    try {
      unlistenFns = await Promise.all([
        listen<{ text: string }>('promptx-ai-captured', (event) => {
          runOptimize(event.payload.text)
        }),
        listen<{ message: string }>('promptx-ai-error', (event) => {
          log('收到错误事件: ' + event.payload.message)
          // Rust 截取失败时主窗口仍隐藏，唤起窗口展示错误
          invoke('toggle_window').catch(() => {})
          showError(event.payload.message)
        }),
      ])
      log('AI 优化事件监听已注册')
    } catch (error) {
      log('事件监听注册失败: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const stop = () => {
    unlistenFns.forEach((fn) => fn())
    unlistenFns = []
    if (errorTimer) clearTimeout(errorTimer)
  }

  return { start, stop }
}
