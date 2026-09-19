/**
 * 键盘导航 Composable（与 promptStore 状态同步）
 */

import { onMounted, onUnmounted } from 'vue'
import { usePromptStore } from '../stores/promptStore'
import { useUiStore } from '../stores/uiStore'

export function useKeyboardNavigation() {
  const promptStore = usePromptStore()
  const uiStore = useUiStore()

  const handleKeyDown = (e: KeyboardEvent) => {
    // 如果在弹窗状态，不处理导航键
    if (uiStore.showEditor || uiStore.showVariableForm || uiStore.showSpaceEditor || uiStore.showSettings) {
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        promptStore.setSelectedIndex(promptStore.selectedIndex + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        promptStore.setSelectedIndex(promptStore.selectedIndex - 1)
        break
      case 'Enter':
        e.preventDefault()
        const selected = promptStore.selectedPrompt
        if (selected) {
          promptStore.selectAndOutput(selected)
        }
        break
      case 'Tab':
        e.preventDefault()
        if (e.shiftKey) {
          promptStore.prevSpace()
        } else {
          promptStore.nextSpace()
        }
        break
      case 'Escape':
        e.preventDefault()
        // Side Panel 不能关闭，重置搜索
        promptStore.setSearchQuery('')
        break
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    handleKeyDown
  }
}
