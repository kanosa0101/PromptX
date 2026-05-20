/**
 * 消息通信封装
 */

/**
 * 获取当前标签页的选中文本
 */
export async function getSelectionFromActiveTab(): Promise<string> {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getActiveTabSelection' })
    return response?.text || ''
  } catch {
    return ''
  }
}

/**
 * 向当前标签页插入文本
 */
export async function insertTextToActiveTab(text: string): Promise<boolean> {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'insertToActiveTab', text })
    return response?.success || false
  } catch {
    return false
  }
}

/**
 * 向指定标签页发送消息
 */
export async function sendMessageToTab(tabId: number, message: any): Promise<any> {
  return chrome.tabs.sendMessage(tabId, message)
}

/**
 * 获取当前活动标签页
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab || null
}