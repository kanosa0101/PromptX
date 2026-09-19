/**
 * Prompt Store - 核心状态管理
 */

import { defineStore } from 'pinia'
import { loadAppData, saveAppData } from '@/lib/storage'
import { getSelectionFromActiveTab, insertTextToActiveTab } from '@/lib/messaging'
import { parseVariables, replaceVariables, getCustomVariables, getSystemVariableValue } from '@/utils/variable'
import { useSearch } from '@/sidepanel/composables/useSearch'
import { useUiStore } from './uiStore'
import type { Prompt, Space, Variable, SearchResult } from '@/types'

export const usePromptStore = defineStore('prompt', {
  state: () => ({
    spaces: [] as Space[],
    prompts: [] as Prompt[],
    currentSpaceId: 'space_default',
    searchQuery: '',
    selectedIndex: 0,
    isLoading: true,
    pageSelection: '',
    lastOutputMethod: null as 'success' | 'clipboard' | null
  }),

  getters: {
    currentSpace: (state) => state.spaces.find(s => s.id === state.currentSpaceId),

    // 使用 useSearch composable 进行搜索（支持拼音匹配）
    filteredPrompts(): SearchResult[] {
      // 按创建时间倒序展示：最新的提示词排在最前（搜索时仍按相关度排序）
      const sorted = [...this.prompts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return useSearch(sorted, this.searchQuery, this.currentSpaceId)
    },

    selectedPrompt: (state) => state.filteredPrompts[state.selectedIndex] || null
  },

  actions: {
    /**
     * 加载数据
     */
    async loadData() {
      this.isLoading = true
      try {
        const data = await loadAppData()
        this.spaces = data.spaces
        this.prompts = data.prompts
        this.pageSelection = await getSelectionFromActiveTab()
      } catch {
        // 使用默认数据
      }
      this.isLoading = false
    },

    /**
     * 刷新选区
     */
    async refreshSelection() {
      this.pageSelection = await getSelectionFromActiveTab()
    },

    /**
     * 设置搜索查询
     */
    setSearchQuery(query: string) {
      this.searchQuery = query
      this.selectedIndex = 0 // 重置选中索引
    },

    /**
     * 设置当前空间
     */
    setCurrentSpace(spaceId: string) {
      this.currentSpaceId = spaceId
      this.selectedIndex = 0
    },

    /**
     * 设置选中索引
     */
    setSelectedIndex(index: number) {
      this.selectedIndex = Math.max(0, Math.min(index, this.filteredPrompts.length - 1))
    },

    /**
     * 切换到下一个空间
     */
    nextSpace() {
      const currentIndex = this.spaces.findIndex(s => s.id === this.currentSpaceId)
      const nextIndex = (currentIndex + 1) % this.spaces.length
      this.setCurrentSpace(this.spaces[nextIndex].id)
    },

    /**
     * 切换到上一个空间
     */
    prevSpace() {
      const currentIndex = this.spaces.findIndex(s => s.id === this.currentSpaceId)
      const prevIndex = (currentIndex - 1 + this.spaces.length) % this.spaces.length
      this.setCurrentSpace(this.spaces[prevIndex].id)
    },

    /**
     * 选择提示词并输出
     */
    async selectAndOutput(prompt: Prompt) {
      const variables = parseVariables(prompt.content)
      const customVars = getCustomVariables(variables)

      if (customVars.length > 0) {
        // 有自定义变量，显示表单
        const uiStore = useUiStore()
        uiStore.openVariableForm(prompt, customVars)
      } else {
        // 直接输出
        await this.outputPrompt(prompt)
      }
    },

    /**
     * 输出提示词
     */
    async outputPrompt(prompt: Prompt, customValues: Record<string, string> = {}) {
      // 系统变量值
      const systemValues: Record<string, string> = {
        clipboard: this.pageSelection,
        date: getSystemVariableValue('date'),
        time: getSystemVariableValue('time'),
        timestamp: getSystemVariableValue('timestamp')
      }

      // 合并变量值
      const values = { ...systemValues, ...customValues }
      const outputText = replaceVariables(prompt.content, values)

      // 尝试直接插入到页面（不经过剪贴板）
      const inserted = await insertTextToActiveTab(outputText)

      if (inserted) {
        this.lastOutputMethod = 'success'
      } else {
        // 插入失败，写入剪贴板供用户手动粘贴（保留在剪贴板，不做恢复）
        await navigator.clipboard.writeText(outputText)
        this.lastOutputMethod = 'clipboard'
      }

      // 更新使用计数
      prompt.usageCount++
      prompt.lastUsedAt = new Date().toISOString()
      await this.saveData()

      // 刷新选区
      await this.refreshSelection()
    },

    /**
     * 创建提示词
     */
    async createPrompt(data: { title: string; content: string; tags: string[]; spaceId: string }) {
      const now = new Date().toISOString()
      const newPrompt: Prompt = {
        id: crypto.randomUUID(),
        title: data.title,
        content: data.content,
        tags: data.tags,
        spaceId: data.spaceId,
        variables: parseVariables(data.content),
        usageCount: 0,
        lastUsedAt: null,
        createdAt: now,
        updatedAt: now
      }
      this.prompts.push(newPrompt)
      await this.saveData()
      return newPrompt
    },

    /**
     * 更新提示词
     */
    async updatePrompt(id: string, data: Partial<{ title: string; content: string; tags: string[]; spaceId: string }>) {
      const prompt = this.prompts.find(p => p.id === id)
      if (prompt) {
        Object.assign(prompt, data, {
          updatedAt: new Date().toISOString()
        })
        if (data.content) {
          prompt.variables = parseVariables(data.content)
        }
        await this.saveData()
      }
    },

    /**
     * 删除提示词
     */
    async deletePrompt(id: string) {
      const index = this.prompts.findIndex(p => p.id === id)
      if (index !== -1) {
        this.prompts.splice(index, 1)
        await this.saveData()
      }
    },

    /**
     * 创建空间
     */
    async createSpace(data: { name: string; icon: string; color: string }) {
      const now = new Date().toISOString()
      const newSpace: Space = {
        id: `space_${crypto.randomUUID().slice(0, 8)}`,
        name: data.name,
        icon: data.icon,
        color: data.color,
        order: this.spaces.length,
        createdAt: now,
        updatedAt: now
      }
      this.spaces.push(newSpace)
      await this.saveData()
      return newSpace
    },

    /**
     * 更新空间
     */
    async updateSpace(id: string, data: { name?: string; icon?: string; color?: string }) {
      const space = this.spaces.find(s => s.id === id)
      if (space) {
        if (data.name !== undefined) space.name = data.name
        if (data.icon !== undefined) space.icon = data.icon
        if (data.color !== undefined) space.color = data.color
        space.updatedAt = new Date().toISOString()
        await this.saveData()
      }
    },

    /**
     * 删除空间
     */
    async deleteSpace(id: string) {
      if (id === 'space_default') return
      // 将该空间下的提示词移到默认空间
      this.prompts.forEach(p => {
        if (p.spaceId === id) p.spaceId = 'space_default'
      })
      this.spaces = this.spaces.filter(s => s.id !== id)
      if (this.currentSpaceId === id) this.currentSpaceId = 'space_default'
      await this.saveData()
    },

    /**
     * 保存数据
     */
    async saveData() {
      const data = await loadAppData()
      await saveAppData({
        version: data.version || '1.0.0',
        settings: data.settings || { theme: 'system', maxResults: 20 },
        spaces: this.spaces,
        prompts: this.prompts
      })
    }
  }
})