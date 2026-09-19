<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { usePromptStore } from '@/stores/promptStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { useAiOptimizer } from '@/composables/useAiOptimizer'
import type { Prompt } from '@/types'
import SearchBar from '@/components/SearchBar.vue'
import SpaceTabs from '@/components/SpaceTabs.vue'
import ResultList from '@/components/ResultList.vue'
import StatusBar from '@/components/StatusBar.vue'
import VariableForm from '@/components/VariableForm.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import PromptEditor from '@/components/PromptEditor.vue'
import HelpPanel from '@/components/HelpPanel.vue'
import SpaceEditor from '@/components/SpaceEditor.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const promptStore = usePromptStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()

// AI 快捷优化事件编排（全局快捷键截取选中文本后由 Rust 通过事件推送到前端）
const aiOptimizer = useAiOptimizer()

// 保存提示词并关闭编辑器
const handleSavePrompt = async (prompt: Prompt) => {
  try {
    await promptStore.savePrompt(prompt)
    // 重新加载数据确保同步
    await promptStore.loadPrompts()
    uiStore.closePromptEditor()
  } catch (error) {
    console.error('Failed to save prompt:', error)
  }
}

// 处理键盘事件
const handleKeyDown = async (e: KeyboardEvent) => {
  // 如果在弹窗状态，不处理导航键
  if (uiStore.showSettings || uiStore.showPromptEditor || uiStore.showVariableForm || uiStore.showHelp || uiStore.showSpaceEditor || uiStore.showConfirmDialog) {
    return
  }

  // 上下键导航
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    promptStore.moveSelection(1)
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    promptStore.moveSelection(-1)
    return
  }

  // Enter 选择并输出
  if (e.key === 'Enter') {
    e.preventDefault()
    const selected = promptStore.selectedPrompt
    if (selected) {
      promptStore.selectAndOutput(selected)
    }
    return
  }

  // Tab 切换空间
  if (e.key === 'Tab') {
    e.preventDefault()
    if (e.shiftKey) {
      promptStore.prevSpace()
    } else {
      promptStore.nextSpace()
    }
    return
  }

  // Escape 隐藏窗口
  if (e.key === 'Escape') {
    e.preventDefault()
    await invoke('hide_window')
    return
  }

  // Ctrl/Cmd + N: 新建提示词
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault()
    uiStore.openPromptEditor()
    return
  }
  // Ctrl/Cmd + E: 编辑选中项
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault()
    const selected = promptStore.selectedPrompt
    if (selected) {
      uiStore.openPromptEditor(selected)
    }
    return
  }
  // Ctrl/Cmd + D: 删除选中项
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault()
    const selected = promptStore.selectedPrompt
    if (selected) {
      uiStore.openConfirmDialog(
        '确定删除此提示词吗？',
        () => {
          promptStore.deletePrompt(selected.id)
        },
        '删除提示词'
      )
    }
    return
  }
  // Ctrl/Cmd + ,: 打开设置
  if ((e.ctrlKey || e.metaKey) && e.key === ',') {
    e.preventDefault()
    uiStore.toggleSettings()
    return
  }
}

// 系统主题变化监听
const handleSystemThemeChange = () => {
  if (settingsStore.theme === 'system') {
    settingsStore.applyTheme()
  }
}

// 初始化应用并注册键盘监听
onMounted(async () => {
  await promptStore.loadPrompts()
  await settingsStore.loadSettings()
  await aiOptimizer.start()
  window.addEventListener('keydown', handleKeyDown)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleSystemThemeChange)
})

onUnmounted(() => {
  aiOptimizer.stop()
  window.removeEventListener('keydown', handleKeyDown)
  window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handleSystemThemeChange)
})
</script>

<template>
  <!-- 拖拽区域（不可见） -->
  <div
    data-tauri-drag-region
    class="fixed top-0 left-0 right-0 h-8 z-50"
  ></div>

  <div
    class="app-container min-h-screen bg-white dark:bg-[#1A1A2E] text-[#1A1A2E] dark:text-[#E4E4E7]"
  >
    <!-- AI 优化错误横幅 -->
    <div
      v-if="uiStore.aiError"
      class="animate-fade-in fixed top-8 left-2 right-2 z-50 flex items-start justify-between gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs shadow-lg"
    >
      <span class="leading-snug">{{ uiStore.aiError }}</span>
      <button class="shrink-0 opacity-70 hover:opacity-100" @click="uiStore.clearAiError">✕</button>
    </div>

    <!-- 主界面 -->
    <div v-if="!uiStore.showSettings && !uiStore.showPromptEditor && !uiStore.showVariableForm && !uiStore.showHelp && !uiStore.showSpaceEditor">
      <SearchBar />
      <SpaceTabs />
      <ResultList />
      <StatusBar />
    </div>

    <!-- 空间编辑器 -->
    <SpaceEditor v-if="uiStore.showSpaceEditor" :space="uiStore.editingSpace" @close="uiStore.closeSpaceEditor" />

    <!-- 帮助面板 -->
    <HelpPanel v-if="uiStore.showHelp" @close="uiStore.closeHelp" />

    <!-- 变量表单 -->
    <VariableForm
      v-if="uiStore.showVariableForm"
      :prompt="uiStore.currentPrompt"
      @confirm="promptStore.outputWithVariables"
      @cancel="uiStore.closeVariableForm"
    />

    <!-- 设置面板 -->
    <SettingsPanel v-if="uiStore.showSettings" @close="uiStore.hideSettings" />

    <!-- 提示词编辑器 -->
    <PromptEditor
      v-if="uiStore.showPromptEditor"
      :prompt="uiStore.editingPrompt"
      @save="handleSavePrompt"
      @close="uiStore.closePromptEditor"
    />

    <!-- 确认对话框 -->
    <ConfirmDialog
      v-if="uiStore.showConfirmDialog"
      :title="uiStore.confirmDialogTitle"
      :message="uiStore.confirmDialogMessage"
      @confirm="uiStore.confirmAction"
      @cancel="uiStore.closeConfirmDialog"
    />
  </div>
</template>

<style scoped>
.app-container {
  user-select: none;
}
</style>