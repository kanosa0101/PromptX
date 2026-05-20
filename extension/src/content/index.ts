/**
 * Content Script
 * 获取页面选中文本 + 向页面插入文本
 */

// 监听来自 background/sidepanel 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getSelection':
      // 获取当前页面选中的文本
      const selection = window.getSelection()?.toString() || ''
      sendResponse({ text: selection.trim() })
      return true

    case 'insertText':
      // 在当前焦点元素插入文本
      const success = insertTextToActiveElement(request.text)
      sendResponse({ success })
      return true

    case 'copyToClipboard':
      // 写入剪贴板
      navigator.clipboard.writeText(request.text)
        .then(() => sendResponse({ success: true }))
        .catch(() => sendResponse({ success: false }))
      return true

    default:
      sendResponse({ error: 'Unknown action' })
      return false
  }
})

/**
 * 向当前焦点元素插入文本
 */
function insertTextToActiveElement(text: string): boolean {
  const activeElement = document.activeElement

  // 处理普通输入框
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    const start = activeElement.selectionStart || 0
    const end = activeElement.selectionEnd || 0
    const value = activeElement.value

    activeElement.value = value.slice(0, start) + text + value.slice(end)
    activeElement.selectionStart = activeElement.selectionEnd = start + text.length

    // 触发 change 事件
    activeElement.dispatchEvent(new Event('input', { bubbles: true }))
    activeElement.dispatchEvent(new Event('change', { bubbles: true }))

    return true
  }

  // 处理富文本编辑器 (contenteditable)
  if (activeElement?.getAttribute('contenteditable') === 'true') {
    // 使用 execCommand 插入文本
    document.execCommand('insertText', false, text)
    return true
  }

  // 处理 iframe 内的编辑器 (如 ChatGPT)
  try {
    const iframes = document.querySelectorAll('iframe')
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (iframeDoc?.activeElement) {
          const iframeActive = iframeDoc.activeElement
          if (iframeActive instanceof HTMLInputElement ||
              iframeActive instanceof HTMLTextAreaElement ||
              iframeActive.getAttribute('contenteditable') === 'true') {
            iframeDoc.execCommand('insertText', false, text)
            return true
          }
        }
      } catch {
        // 跨域 iframe 无法访问
      }
    }
  } catch {
    // 忽略错误
  }

  // 无法插入，返回 false
  return false
}

// 初始化完成日志 (调试用)
console.log('[PromptX] Content script loaded')