/**
 * Background Service Worker
 * 处理快捷键 + 打开 Side Panel + 消息转发 + AI 快捷优化编排
 */

import { optimizePrompt } from '@/lib/ai'
import { STORAGE_KEY } from '@/lib/storage'
import { AI_HISTORY_SPACE_ID, DEFAULT_SETTINGS } from '@/types'

// 点击扩展图标时打开 Side Panel
chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId })
  }
})

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

/**
 * AI 快捷优化全流程：
 * 截取选中文本 → 调 AI 优化 → 原位替换 → 存入「AI 优化」历史空间
 * 全程不打开 Side Panel；进度与结果通过图标徽标反馈
 */
async function runOptimizeFlow(): Promise<void> {
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

    // 2. 调 AI 优化（background 发起请求，绕开页面 CSP/CORS）
    await setBadge('…')
    const settings = await loadAiSettings()
    const optimized = await optimizePrompt(settings, text)

    // 3. 应用结果
    let applied = false
    if (capture?.hasEditableTarget) {
      try {
        const result = await chrome.tabs.sendMessage(tab.id, { action: 'replaceSelection', text: optimized })
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
        await chrome.tabs.sendMessage(tab.id, { action: 'copyToClipboard', text: optimized })
        await setBadge('C', '#F59E0B')
      } catch {
        await setBadge('!', '#DC2626')
      }
      clearBadgeLater(3000)
    }

    // 4. 存入「AI 优化」历史空间（失败不影响主流程）
    await saveOptimizeHistory(text, optimized)
  } catch (error) {
    console.error('[PromptX] AI optimize failed:', error)
    await setBadge('!', '#DC2626')
    clearBadgeLater(3000)
  }
}

/**
 * 读取 AI 设置（合并默认值，兼容旧数据）
 */
async function loadAiSettings(): Promise<{
  aiBaseUrl: string
  aiApiKey: string
  aiModel: string
  optimizeTemplate: string
}> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const data = result[STORAGE_KEY]
    return {
      aiBaseUrl: data?.settings?.aiBaseUrl || DEFAULT_SETTINGS.aiBaseUrl,
      aiApiKey: data?.settings?.aiApiKey || '',
      aiModel: data?.settings?.aiModel || DEFAULT_SETTINGS.aiModel,
      optimizeTemplate: data?.settings?.optimizeTemplate || DEFAULT_SETTINGS.optimizeTemplate,
      optimizeThinking: data?.settings?.optimizeThinking ?? false,
    }
  } catch {
    return {
      aiBaseUrl: DEFAULT_SETTINGS.aiBaseUrl,
      aiApiKey: '',
      aiModel: DEFAULT_SETTINGS.aiModel,
      optimizeTemplate: DEFAULT_SETTINGS.optimizeTemplate,
      optimizeThinking: false,
    }
  }
}

/**
 * 把优化结果存入「AI 优化」历史空间（空间不存在则自动创建）
 */
async function saveOptimizeHistory(original: string, optimized: string): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const data = result[STORAGE_KEY]
    if (!data) return

    const now = new Date().toISOString()

    // 确保「AI 优化」空间存在
    if (!data.spaces?.some((s: { id: string }) => s.id === AI_HISTORY_SPACE_ID)) {
      const maxOrder = (data.spaces || []).reduce(
        (max: number, s: { order: number }) => Math.max(max, s.order || 0),
        0
      )
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

    // 标题：原文压缩空白后取前 30 字符（按 Unicode 字符截取）
    const flattened = original.split(/\s+/).filter(Boolean).join(' ')
    const chars = Array.from(flattened)
    let title = chars.slice(0, 30).join('')
    if (chars.length > 30) title += '…'
    if (!title) title = '未命名优化'

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

    await chrome.storage.local.set({ [STORAGE_KEY]: data })
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

// 初始化完成日志 (调试用)
console.log('[PromptX] Background service worker started')
