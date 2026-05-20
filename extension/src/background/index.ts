/**
 * Background Service Worker
 * 处理快捷键 + 打开 Side Panel + 消息转发
 */

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
  }
})

// 监听来自 sidepanel 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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