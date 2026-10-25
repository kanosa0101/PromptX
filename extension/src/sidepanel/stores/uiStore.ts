/**
 * UI Store - UI 状态管理
 */

import { defineStore } from 'pinia'
import type { Prompt, Variable } from '@/types'

export const useUiStore = defineStore('ui', {
  state: () => ({
    showVariableForm: false,
    currentPrompt: null as Prompt | null,
    currentVariables: [] as Variable[],
    showEditor: false,
    editingPrompt: null as Prompt | null,
    showSettings: false,
    showHelp: false,
    showTemplateMarket: false,
    showSpaceEditor: false,
    showConfirmDialog: false,
    confirmDialogTitle: '' as string,
    confirmDialogMessage: '' as string,
    confirmDialogCallback: null as (() => void) | null,
    // AI 优化进行中（background 经消息推送，Side Panel 打开时展示进度）
    aiOptimizing: false,
    aiStreamText: '',
    // AI 优化结果预览（optimizePreview 开启且 Side Panel 打开时）
    optimizePreviewData: null as null | { mode: 'selection' | 'clipboard'; text: string; streaming: boolean }
  }),

  actions: {
    /**
     * 打开变量表单
     */
    openVariableForm(prompt: Prompt, variables: Variable[]) {
      this.showVariableForm = true
      this.currentPrompt = prompt
      this.currentVariables = variables
    },

    /**
     * 关闭变量表单
     */
    closeVariableForm() {
      this.showVariableForm = false
      this.currentPrompt = null
      this.currentVariables = []
    },

    /**
     * 打开编辑器
     */
    openEditor(prompt?: Prompt) {
      this.showEditor = true
      this.editingPrompt = prompt || null
    },

    /**
     * 关闭编辑器
     */
    closeEditor() {
      this.showEditor = false
      this.editingPrompt = null
    },

    /**
     * 打开设置
     */
    openSettings() {
      this.showSettings = true
    },

    /**
     * 关闭设置
     */
    closeSettings() {
      this.showSettings = false
    },

    /**
     * 打开帮助
     */
    openHelp() {
      this.showHelp = true
    },

    /**
     * 关闭帮助
     */
    closeHelp() {
      this.showHelp = false
    },

    /**
     * 打开模板库
     */
    openTemplateMarket() {
      this.showTemplateMarket = true
    },

    /**
     * 关闭模板库
     */
    closeTemplateMarket() {
      this.showTemplateMarket = false
    },

    /**
     * 打开空间编辑器
     */
    openSpaceEditor() {
      this.showSpaceEditor = true
    },

    /**
     * 关闭空间编辑器
     */
    closeSpaceEditor() {
      this.showSpaceEditor = false
    },

    /**
     * 打开确认对话框
     */
    openConfirmDialog(message: string, callback: () => void, title?: string) {
      this.showConfirmDialog = true
      this.confirmDialogTitle = title || ''
      this.confirmDialogMessage = message
      this.confirmDialogCallback = callback
    },

    /**
     * 关闭确认对话框
     */
    closeConfirmDialog() {
      this.showConfirmDialog = false
      this.confirmDialogTitle = ''
      this.confirmDialogMessage = ''
      this.confirmDialogCallback = null
    },

    /**
     * 执行确认操作
     */
    confirmAction() {
      if (this.confirmDialogCallback) {
        this.confirmDialogCallback()
      }
      this.closeConfirmDialog()
    },

    // ===== AI 优化进度 / 预览（background 消息驱动） =====
    startAiOptimizing() {
      this.aiOptimizing = true
      this.aiStreamText = ''
    },

    stopAiOptimizing() {
      this.aiOptimizing = false
      this.aiStreamText = ''
    },

    updateAiStream(text: string) {
      this.aiStreamText = text
    },

    openOptimizePreview(mode: 'selection' | 'clipboard', text: string) {
      this.optimizePreviewData = { mode, text, streaming: false }
    },

    closeOptimizePreview() {
      this.optimizePreviewData = null
    }
  }
})