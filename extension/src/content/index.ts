/**
 * Content Script
 * 获取页面选中文本 + 向页面插入文本 + AI 优化的选区捕获/替换
 */

/** 捕获上下文：跨 AI 请求等待窗口期（数秒）后仍能原位替换选中文本 */
interface CapturedSelection {
  text: string
  kind: 'input' | 'textarea' | 'contenteditable' | 'none'
  element?: HTMLInputElement | HTMLTextAreaElement
  start?: number
  end?: number
  range?: Range
}

/** 最近一次捕获的选区上下文 */
let capturedSelection: CapturedSelection | null = null

// 监听来自 background/sidepanel 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 仅接受来自本扩展的消息
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ error: 'Unauthorized' })
    return false
  }

  switch (request.action) {
    case 'getSelection': {
      // 获取当前页面选中的文本
      const selection = window.getSelection()?.toString() || ''
      sendResponse({ text: selection.trim() })
      return true
    }

    case 'captureSelection': {
      // 捕获选中文本及可编辑上下文，供后续 replaceSelection 原位替换
      sendResponse(captureSelectionContext())
      return true
    }

    case 'replaceSelection': {
      // 用优化结果替换先前捕获的选中文本
      replaceCapturedSelection(request.text)
        .then((result) => sendResponse(result))
        .catch(() => sendResponse({ success: false }))
      return true
    }

    case 'insertText': {
      // 在当前焦点元素插入文本
      const success = insertTextToActiveElement(request.text)
      sendResponse({ success })
      return true
    }

    case 'copyToClipboard': {
      // 写入剪贴板
      navigator.clipboard.writeText(request.text)
        .then(() => sendResponse({ success: true }))
        .catch(() => sendResponse({ success: false }))
      return true
    }

    default:
      sendResponse({ error: 'Unknown action' })
      return false
  }
})

/**
 * 捕获选中文本与可编辑上下文
 */
function captureSelectionContext(): { text: string; hasEditableTarget: boolean } {
  const selection = window.getSelection()
  const text = selection?.toString().trim() || ''

  if (!text) {
    capturedSelection = null
    return { text: '', hasEditableTarget: false }
  }

  const activeElement = document.activeElement

  // 焦点在输入框：记录元素与选区边界
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    const start = activeElement.selectionStart ?? 0
    const end = activeElement.selectionEnd ?? 0
    if (activeElement.value.slice(start, end) === text) {
      capturedSelection = { text, kind: activeElement instanceof HTMLTextAreaElement ? 'textarea' : 'input', element: activeElement, start, end }
      return { text, hasEditableTarget: true }
    }
  }

  // 选区落在富文本编辑器（contenteditable）内：记录 Range
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    const editable = findEditableAncestor(range.startContainer)
    if (editable) {
      capturedSelection = { text, kind: 'contenteditable', range: range.cloneRange() }
      return { text, hasEditableTarget: true }
    }
  }

  // 非可编辑区（普通网页文本）：v1 不支持原位替换，由 background 回退到复制到剪贴板
  capturedSelection = null
  return { text, hasEditableTarget: false }
}

/**
 * 用优化结果替换先前捕获的选中文本
 */
async function replaceCapturedSelection(text: string): Promise<{ success: boolean; reason?: string }> {
  const captured = capturedSelection
  capturedSelection = null
  if (!captured) {
    return { success: false, reason: 'no-capture' }
  }

  if (captured.kind === 'input' || captured.kind === 'textarea') {
    const element = captured.element
    const start = captured.start ?? 0
    const end = captured.end ?? 0

    // 元素仍存在，且等待期间选中文本未被用户改动
    if (element && element.isConnected && element.value.slice(start, end) === captured.text) {
      setInputValue(element, element.value.slice(0, start) + text + element.value.slice(end), start + text.length, start + text.length)
      return { success: true }
    }
    return { success: false, reason: 'changed' }
  }

  if (captured.kind === 'contenteditable' && captured.range) {
    // DOM 可能已变化，Range 失效时不再替换
    try {
      if (!captured.range.startContainer.isConnected) {
        return { success: false, reason: 'changed' }
      }
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(captured.range)
      const ok = document.execCommand('insertText', false, text)
      return ok ? { success: true } : { success: false, reason: 'exec-failed' }
    } catch {
      return { success: false, reason: 'exec-failed' }
    }
  }

  return { success: false, reason: 'no-capture' }
}

/**
 * 从节点向上查找最近的 contenteditable 祖先
 */
function findEditableAncestor(node: Node | null): HTMLElement | null {
  let current: Node | null = node
  while (current) {
    if (current instanceof HTMLElement && current.isContentEditable) {
      return current
    }
    current = current.parentNode
  }
  return null
}

/**
 * 设置输入框值（兼容 React 受控组件）
 *
 * 使用原生 value setter 绕过 React 对 value 属性的拦截，
 * 再派发 input/change 事件触发框架状态同步
 */
function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string, selectionStart: number, selectionEnd: number): void {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
  if (descriptor?.set) {
    descriptor.set.call(element, value)
  } else {
    element.value = value
  }
  element.selectionStart = selectionStart
  element.selectionEnd = selectionEnd

  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * 向当前焦点元素插入文本
 *
 * 注意：contenteditable 路径使用 document.execCommand('insertText')，
 * 该 API 已被 W3C 标记为弃用 (deprecated)，但目前所有主流浏览器仍支持。
 * 如果未来浏览器移除该 API，备选方案包括：
 * 1. 构造 InputEvent (inputType: 'insertText') + dispatchEvent
 * 2. 使用 ClipboardEvent 模拟粘贴
 * 3. 通过 navigator.clipboard.writeText + 模拟 Ctrl+V（需要扩展有 clipboardWrite 权限）
 */
function insertTextToActiveElement(text: string): boolean {
  const activeElement = document.activeElement

  // 处理普通输入框
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    const start = activeElement.selectionStart || 0
    const end = activeElement.selectionEnd || 0
    const value = activeElement.value
    const nextValue = value.slice(0, start) + text + value.slice(end)

    setInputValue(activeElement, nextValue, start + text.length, start + text.length)
    return true
  }

  // 处理富文本编辑器 (contenteditable，含 contenteditable="")
  if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
    // 使用 execCommand 插入文本（见上方弃用说明）
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
              (iframeActive instanceof HTMLElement && iframeActive.isContentEditable)) {
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
