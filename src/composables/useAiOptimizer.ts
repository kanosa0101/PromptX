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
import { t } from '@/i18n'

/** 错误横幅自动消失时长 */
const ERROR_DISMISS_MS = 8000

/** 成功提示自动消失时长 */
const NOTICE_DISMISS_MS = 3000

export function useAiOptimizer() {
  const settingsStore = useSettingsStore()
  const uiStore = useUiStore()

  let errorTimer: ReturnType<typeof setTimeout> | undefined
  let noticeTimer: ReturnType<typeof setTimeout> | undefined
  let unlistenFns: UnlistenFn[] = []
  // 并发防护：AI 请求最长约 2 分钟（60s 超时 × 2 次尝试），
  // 期间重复触发快捷键会启动第二条流水线，交错贴回会互相践踏剪贴板
  let optimizeRunning = false
  let clipboardOptimizeRunning = false
  // 每次运行的取消控制器（用户在主窗口点击「取消」时中止请求）
  let optimizeController: AbortController | null = null
  let clipboardOptimizeController: AbortController | null = null

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

  const showNotice = (message: string) => {
    uiStore.showAiNotice(message)
    if (noticeTimer) clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => uiStore.clearAiNotice(), NOTICE_DISMISS_MS)
  }

  /** AI 优化并回调 Rust 贴回原位置 */
  const aiSettings = () => ({
    aiBaseUrl: settingsStore.aiBaseUrl,
    aiApiKey: settingsStore.aiApiKey,
    aiModel: settingsStore.aiModel,
    optimizeTemplate: settingsStore.optimizeTemplate,
    optimizeThinking: settingsStore.optimizeThinking,
  })

  const runOptimize = async (text: string) => {
    if (optimizeRunning) {
      log('优化进行中，忽略本次触发')
      return
    }
    optimizeRunning = true
    optimizeController = new AbortController()
    const previewMode = settingsStore.optimizePreview
    uiStore.startAiOptimizing()
    if (previewMode) {
      // 预览模式：唤起主窗口流式展示结果，用户确认后再贴回
      invoke('show_window').catch(() => {})
      uiStore.openOptimizePreview('selection')
    }
    try {
      log(`收到优化事件(${text.length} 字符)，开始调用 AI`)
      const optimized = await optimizeText(aiSettings(), text, optimizeController.signal, (_delta, full) => {
        uiStore.aiStreamText = full
        if (previewMode) {
          uiStore.updateOptimizePreview(full)
        }
      })
      if (previewMode) {
        // 应用动作由 App.vue 预览面板的确认回调触发
        uiStore.finishOptimizePreview()
        return
      }
      log(`AI 返回 ${optimized.length} 字符，回调 Rust 贴回`)
      await invoke('optimize_apply_result', { text: optimized })
      showNotice(t('optimizer.donePasted'))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log(`AI 流程失败: ${message}`)
      // 结束会话并恢复剪贴板
      invoke('optimize_cancel').catch(() => {})
      if (message === '已取消') {
        // 用户主动取消：不弹错误、不动窗口
        showNotice(t('optimizer.canceled'))
        return
      }
      // 唤起主窗口展示错误
      invoke('show_window').catch(() => {})
      showError(message)
    } finally {
      optimizeRunning = false
      optimizeController = null
      uiStore.stopAiOptimizing()
    }
  }

  /** 剪贴板模式：优化剪贴板内容并写回（不模拟按键，用户自行粘贴） */
  const runClipboardOptimize = async (text: string) => {
    if (clipboardOptimizeRunning) {
      log('剪贴板优化进行中，忽略本次触发')
      return
    }
    clipboardOptimizeRunning = true
    clipboardOptimizeController = new AbortController()
    const previewMode = settingsStore.optimizePreview
    uiStore.startAiOptimizing()
    if (previewMode) {
      invoke('show_window').catch(() => {})
      uiStore.openOptimizePreview('clipboard')
    }
    try {
      log(`收到剪贴板优化事件(${text.length} 字符)，开始调用 AI`)
      const optimized = await optimizeText(aiSettings(), text, clipboardOptimizeController.signal, (_delta, full) => {
        uiStore.aiStreamText = full
        if (previewMode) {
          uiStore.updateOptimizePreview(full)
        }
      })
      if (previewMode) {
        uiStore.finishOptimizePreview()
        return
      }
      log(`AI 返回 ${optimized.length} 字符，写回剪贴板`)
      await invoke('clipboard_optimize_apply_result', { text: optimized })
      showNotice(t('optimizer.doneClipboard'))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log(`剪贴板优化失败: ${message}`)
      // 结束会话（原剪贴板未被修改，无需恢复）
      invoke('clipboard_optimize_cancel').catch(() => {})
      if (message === '已取消') {
        showNotice(t('optimizer.canceled'))
        return
      }
      // 唤起主窗口展示错误
      invoke('show_window').catch(() => {})
      showError(message)
    } finally {
      clipboardOptimizeRunning = false
      clipboardOptimizeController = null
      uiStore.stopAiOptimizing()
    }
  }

  /** 用户在主窗口点击「取消」：中止进行中的 AI 请求（后续清理走各自的取消路径） */
  const cancelOptimize = () => {
    optimizeController?.abort()
    clipboardOptimizeController?.abort()
  }

  /** 注册事件监听（在 App 挂载时调用一次） */
  const start = async () => {
    try {
      unlistenFns = await Promise.all([
        listen<{ text: string }>('promptx-ai-captured', (event) => {
          runOptimize(event.payload.text)
        }),
        listen<{ text: string }>('promptx-ai-clipboard', (event) => {
          runClipboardOptimize(event.payload.text)
        }),
        listen<{ message: string }>('promptx-ai-error', (event) => {
          log('收到错误事件: ' + event.payload.message)
          // Rust 截取失败时主窗口仍隐藏，唤起窗口展示错误
          // （show 而非 toggle：用户中途唤起的窗口不应被藏掉）
          invoke('show_window').catch(() => {})
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
    if (noticeTimer) clearTimeout(noticeTimer)
  }

  return { start, stop, cancelOptimize }
}
