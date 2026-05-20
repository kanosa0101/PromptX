import { defineStore } from 'pinia'
import type { Prompt } from '@/types'

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
    windowVisible: true,
  }),

  actions: {
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

    openSpaceEditor() {
      this.showSpaceEditor = true
    },

    closeSpaceEditor() {
      this.showSpaceEditor = false
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

    showWindow() {
      this.windowVisible = true
    },

    hideWindow() {
      this.windowVisible = false
      // 重置所有面板
      this.showSettings = false
      this.showPromptEditor = false
      this.showVariableForm = false
      this.showHelp = false
      this.showSpaceEditor = false
      this.showConfirmDialog = false
      this.editingPrompt = null
      this.currentPrompt = null
    },

    toggleWindow() {
      if (this.windowVisible) {
        this.hideWindow()
      } else {
        this.showWindow()
      }
    },
  },
})