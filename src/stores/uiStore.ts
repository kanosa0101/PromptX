import { defineStore } from 'pinia'
import type { Prompt, Space } from '@/types'

export const useUiStore = defineStore('ui', {
  state: () => ({
    showSettings: false,
    showPromptEditor: false,
    showVariableForm: false,
    showHelp: false,
    showSpaceEditor: false,
    showConfirmDialog: false,
    confirmDialogMessage: '',
    confirmDialogTitle: '',
    confirmDialogCallback: null as (() => void) | null,
    currentPrompt: null as Prompt | null,
    editingPrompt: null as Prompt | null,
    editingSpace: null as Space | null,
    aiError: '',
    systemNotice: '',
    // AI 优化进行中（用户中途唤起窗口时展示进度条 + 取消按钮）
    aiOptimizing: false,
    // AI 优化成功的短暂提示
    aiNotice: '',
    // AI 优化流式增量（进行中横幅展示尾部片段）
    aiStreamText: '',
    // 优化结果预览（optimizePreview 开启时：先展示，用户确认后再替换）
    optimizePreviewData: null as null | { mode: 'selection' | 'clipboard'; text: string; streaming: boolean },
  }),

  actions: {
    showSystemNotice(message: string) {
      this.systemNotice = message
    },

    clearSystemNotice() {
      this.systemNotice = ''
    },

    showAiError(message: string) {
      this.aiError = message
    },

    clearAiError() {
      this.aiError = ''
    },

    startAiOptimizing() {
      this.aiOptimizing = true
      this.aiStreamText = ''
    },

    stopAiOptimizing() {
      this.aiOptimizing = false
      this.aiStreamText = ''
    },

    openOptimizePreview(mode: 'selection' | 'clipboard') {
      this.optimizePreviewData = { mode, text: '', streaming: true }
    },

    updateOptimizePreview(text: string) {
      if (this.optimizePreviewData) {
        this.optimizePreviewData.text = text
      }
    },

    finishOptimizePreview() {
      if (this.optimizePreviewData) {
        this.optimizePreviewData.streaming = false
      }
    },

    closeOptimizePreview() {
      this.optimizePreviewData = null
    },

    showAiNotice(message: string) {
      this.aiNotice = message
    },

    clearAiNotice() {
      this.aiNotice = ''
    },

    showSettingsPanel() {
      this.showSettings = true
    },

    hideSettings() {
      this.showSettings = false
    },

    toggleSettings() {
      this.showSettings = !this.showSettings
    },

    openPromptEditor(prompt?: Prompt) {
      this.editingPrompt = prompt || null
      this.showPromptEditor = true
    },

    closePromptEditor() {
      this.showPromptEditor = false
      this.editingPrompt = null
    },

    openVariableForm(prompt: Prompt) {
      this.currentPrompt = prompt
      this.showVariableForm = true
    },

    closeVariableForm() {
      this.showVariableForm = false
      this.currentPrompt = null
    },

    openHelp() {
      this.showHelp = true
    },

    closeHelp() {
      this.showHelp = false
    },

    toggleHelp() {
      this.showHelp = !this.showHelp
    },

    openSpaceEditor(space?: Space) {
      this.editingSpace = space || null
      this.showSpaceEditor = true
    },

    closeSpaceEditor() {
      this.showSpaceEditor = false
      this.editingSpace = null
    },

    // 确认对话框
    openConfirmDialog(message: string, callback: () => void, title?: string) {
      this.confirmDialogMessage = message
      this.confirmDialogTitle = title || ''
      this.confirmDialogCallback = callback
      this.showConfirmDialog = true
    },

    closeConfirmDialog() {
      this.showConfirmDialog = false
      this.confirmDialogMessage = ''
      this.confirmDialogTitle = ''
      this.confirmDialogCallback = null
    },

    confirmAction() {
      if (this.confirmDialogCallback) {
        this.confirmDialogCallback()
      }
      this.closeConfirmDialog()
    },
  },
})