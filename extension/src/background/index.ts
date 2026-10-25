/**
 * Background Service Worker
 * 处理快捷键 + 打开 Side Panel + 消息转发 + AI 快捷优化编排
 */

import { optimizeText } from '@/lib/ai'
import { loadAppData, mutateAppData, STORAGE_KEY } from '@/lib/storage'
import { buildHistoryTitle, MAX_AI_HISTORY } from '@shared/aiHistory'
import { flatTranslate, resolveLocale } from '@shared/locales'
import { AI_HISTORY_SPACE_ID, DEFAULT_SETTINGS } from '@/types'
import type { AiSettings } from '@/types'

// 监听快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  if (command === '_execute_action' || command === 'open-sidepanel') {
    // 获取当前窗口
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.windowId) {
      chrome.sidePanel.open({ windowId: tab.windowId })
    }
    return
  }

  if (command === 'optimize-selection') {
    await runOptimizeFlow()
  }
})

// Side Panel 连接状态（长连接端口，页面关闭即断开）
// 优化结果「预览确认」仅在 Side Panel 打开时可用（MV3 无法凭代码打开面板）
let sidepanelConnected = false

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'promptx-sidepanel') {
    sidepanelConnected = true
    port.onDisconnect.addListener(() => {
      sidepanelConnected = false
      // 面板关闭时未确认的预览视为取消
      if (pendingPreview) {
        pendingPreview = null
        chrome.action.setBadgeText({ text: '' }).catch(() => {})
      }
    })
  }
})

/** 向 Side Panel 推送消息（未连接时静默） */
function notifySidepanel(message: Record<string, unknown>): void {
  if (!sidepanelConnected) return
  chrome.runtime.sendMessage(message).catch(() => {})
}

// 预览待应用状态（Side Panel 用户确认后应用）
let pendingPreview: {
  tabId: number
  hasEditableTarget: boolean
  text: string
  original: string
} | null = null

// 监听来自 sidepanel 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 仅接受来自本扩展的消息
  if (sender.id !== chrome.runtime.id) {
    return false
  }

  switch (request.action) {
    case 'getActiveTabSelection':
      // 获取当前标签页的选中文本
      getActiveTabSelection().then(sendResponse)
      return true

    case 'insertToActiveTab':
      // 向当前标签页插入文本
      insertToActiveTab(request.text).then(sendResponse)
      return true

    case 'px-optimize-preview-apply':
      // 预览确认：替换原位 / 写回剪贴板 + 存历史
      applyPendingPreview().then(() => sendResponse({ ok: true }))
      return true

    case 'px-optimize-preview-cancel':
      pendingPreview = null
      chrome.action.setBadgeText({ text: '' }).catch(() => {})
      sendResponse({ ok: true })
      return false

    default:
      return false
  }
})

/**
 * 设置扩展图标徽标
 */
async function setBadge(text: string, color = '#3B82F6'): Promise<void> {
  await chrome.action.setBadgeText({ text })
  await chrome.action.setBadgeBackgroundColor({ color })
}

/** 清除徽标 */
function clearBadgeLater(delayMs = 2000): void {
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' }).catch(() => {})
  }, delayMs)
}

/** 当前语言设置（系统通知用；SW 无 Vue，经 flatTranslate 翻译） */
async function currentLocale() {
  try {
    const data = await loadAppData()
    return resolveLocale(data.settings?.language || 'system')
  } catch {
    return resolveLocale('system')
  }
}

/** 失败时弹系统通知（红叹号徽标不足以传达失败原因，如「未配置 API Key」） */
async function notifyFailure(message: string): Promise<void> {
  try {
    const locale = await currentLocale()
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: flatTranslate(locale, 'background.optimizeFailedTitle'),
      message: message.slice(0, 180),
    })
  } catch {
    // 通知不可用时静默（保留徽标与控制台日志）
  }
}

/**
 * AI 快捷优化全流程：
 * 截取选中文本 → 调 AI 优化 → 原位替换 → 存入「AI 优化」历史空间
 * 全程不打开 Side Panel；进度与结果通过图标徽标反馈
 */
// 优化流程互斥标记：AI 请求通常 10~60 秒，进行中时忽略再次触发，
// 避免并发请求与历史双写（SW 存活期内有效；SW 重启后标记自然复位）
let optimizeRunning = false

async function runOptimizeFlow(): Promise<void> {
  if (optimizeRunning) {
    console.warn('[PromptX] AI 优化进行中，忽略本次触发')
    return
  }
  optimizeRunning = true
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url?.startsWith('http')) {
      await setBadge('!', '#DC2626')
      clearBadgeLater()
      return
    }

    // 1. 捕获选中文本与可编辑上下文（content script 内缓存上下文）
    let capture: { text?: string; hasEditableTarget?: boolean } | null = null
    try {
      capture = await chrome.tabs.sendMessage(tab.id, { action: 'captureSelection' })
    } catch {
      // content script 不存在（chrome:// 页面或未加载完成）
      await setBadge('!', '#DC2626')
      clearBadgeLater()
      return
    }

    const text = capture?.text || ''
    if (!text.trim()) {
      await setBadge('!', '#DC2626')
      clearBadgeLater()
      return
    }

    // 2. 调 AI 优化（background 发起请求，绕开页面 CSP/CORS；流式增量转发给 Side Panel）
    await setBadge('…')
    const settings = await loadAiSettings()
    notifySidepanel({ action: 'px-optimize-start' })
    const optimized = await optimizeText(settings, text, undefined, (_delta, full) => {
      notifySidepanel({ action: 'px-optimize-stream', text: full })
    })

    // 3. 应用结果（预览确认模式下先发给 Side Panel，用户确认后再应用）
    const hasEditableTarget = capture?.hasEditableTarget ?? false
    if (settings.optimizePreview && sidepanelConnected) {
      pendingPreview = { tabId: tab.id, hasEditableTarget, text: optimized, original: text }
      notifySidepanel({
        action: 'px-optimize-preview',
        text: optimized,
        mode: hasEditableTarget ? 'selection' : 'clipboard',
      })
      return
    }

    await applyOptimizedResult(tab.id, hasEditableTarget, optimized)
    notifySidepanel({ action: 'px-optimize-done' })

    // 4. 存入「AI 优化」历史空间（失败不影响主流程；预览模式在确认时存）
    await saveOptimizeHistory(text, optimized)
  } catch (error) {
    console.error('[PromptX] AI optimize failed:', error)
    await setBadge('!', '#DC2626')
    clearBadgeLater(3000)
    // 系统通知展示失败原因（Key 未配置 / 接口报错 / 网络故障等）
    await notifyFailure(error instanceof Error ? error.message : String(error))
  } finally {
    optimizeRunning = false
  }
}

/** 应用优化结果：可编辑区原位替换，失败回退复制到剪贴板 */
async function applyOptimizedResult(
  tabId: number,
  hasEditableTarget: boolean,
  optimized: string,
): Promise<void> {
  let applied = false
  if (hasEditableTarget) {
    try {
      const result = await chrome.tabs.sendMessage(tabId, { action: 'replaceSelection', text: optimized })
      applied = result?.success || false
    } catch {
      applied = false
    }
  }

  if (applied) {
    await setBadge('✓', '#16A34A')
    clearBadgeLater()
  } else {
    // 非可编辑区或等待期间文本已变化：回退为复制优化结果到剪贴板
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'copyToClipboard', text: optimized })
      await setBadge('C', '#F59E0B')
    } catch {
      await setBadge('!', '#DC2626')
    }
    clearBadgeLater(3000)
  }
}

/** 预览确认后的应用（Side Panel 用户点击「替换原位」） */
async function applyPendingPreview(): Promise<void> {
  const pending = pendingPreview
  pendingPreview = null
  if (!pending) return
  try {
    await applyOptimizedResult(pending.tabId, pending.hasEditableTarget, pending.text)
    await saveOptimizeHistory(pending.original, pending.text)
  } catch (error) {
    console.error('[PromptX] Apply preview failed:', error)
    await notifyFailure(error instanceof Error ? error.message : String(error))
  }
}

/**
 * 读取 AI 设置（合并默认值，兼容旧数据）
 */
async function loadAiSettings(): Promise<AiSettings & { optimizePreview: boolean }> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const data = result[STORAGE_KEY]
    return {
      aiBaseUrl: data?.settings?.aiBaseUrl || DEFAULT_SETTINGS.aiBaseUrl,
      aiApiKey: data?.settings?.aiApiKey || '',
      aiModel: data?.settings?.aiModel || DEFAULT_SETTINGS.aiModel,
      optimizeTemplate: data?.settings?.optimizeTemplate || DEFAULT_SETTINGS.optimizeTemplate,
      optimizeThinking: data?.settings?.optimizeThinking ?? false,
      optimizePreview: data?.settings?.optimizePreview ?? false,
    }
  } catch {
    return {
      aiBaseUrl: DEFAULT_SETTINGS.aiBaseUrl,
      aiApiKey: '',
      aiModel: DEFAULT_SETTINGS.aiModel,
      optimizeTemplate: DEFAULT_SETTINGS.optimizeTemplate,
      optimizeThinking: false,
      optimizePreview: false,
    }
  }
}

/**
 * 把优化结果存入「AI 优化」历史空间（空间不存在则自动创建）
 * 整个读改写在跨上下文锁内进行，与 sidepanel 的并发写入互斥
 */
async function saveOptimizeHistory(original: string, optimized: string): Promise<void> {
  try {
    await mutateAppData((data) => {
      data.spaces = data.spaces || []
      data.prompts = data.prompts || []
      const now = new Date().toISOString()

      // 确保「AI 优化」空间存在
      if (!data.spaces.some((s) => s.id === AI_HISTORY_SPACE_ID)) {
        const maxOrder = data.spaces.reduce((max, s) => Math.max(max, s.order || 0), 0)
        data.spaces.push({
          id: AI_HISTORY_SPACE_ID,
          name: 'AI 优化',
          icon: '✨',
          color: '#8B5CF6',
          order: maxOrder + 1,
          createdAt: now,
          updatedAt: now,
        })
      }

      // 标题：原文压缩空白后截取（shared/aiHistory.ts，与桌面端行为一致）
      const title = buildHistoryTitle(original)

      data.prompts.push({
        id: crypto.randomUUID(),
        title,
        content: optimized,
        tags: ['AI优化'],
        spaceId: AI_HISTORY_SPACE_ID,
        variables: [],
        usageCount: 0,
        lastUsedAt: null,
        createdAt: now,
        updatedAt: now,
      })

      // 「AI 优化」空间条数上限：保留最新 MAX_AI_HISTORY 条，防止数据膨胀
      const hist = data.prompts.filter((p) => p.spaceId === AI_HISTORY_SPACE_ID)
      if (hist.length > MAX_AI_HISTORY) {
        const sorted = [...hist].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
        const removeIds = new Set(
          sorted.slice(0, sorted.length - MAX_AI_HISTORY).map((p) => p.id)
        )
        data.prompts = data.prompts.filter((p) => !removeIds.has(p.id))
      }
    })
  } catch (error) {
    console.error('[PromptX] Failed to save optimize history:', error)
  }
}

/**
 * 获取当前活动标签页的选中文本
 */
async function getActiveTabSelection(): Promise<{ text: string }> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelection' })
      return response || { text: '' }
    }
    return { text: '' }
  } catch {
    return { text: '' }
  }
}

/**
 * 向当前活动标签页插入文本
 */
async function insertToActiveTab(text: string): Promise<{ success: boolean }> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'insertText', text })
      return response || { success: false }
    }
    return { success: false }
  } catch {
    return { success: false }
  }
}

// Side Panel 行为配置
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
