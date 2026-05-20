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
    showHelp: false
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
    }
  }
})