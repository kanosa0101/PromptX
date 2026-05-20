import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import type { Prompt, Space, Variable, AppData, ImportResult, PromptInput } from '@/types'
import { DEFAULT_SPACES, DEFAULT_PROMPTS } from '@/types'
import { useSearch } from '@/composables/useSearch'
import { useUiStore } from './uiStore'

export const usePromptStore = defineStore('prompt', {
  state: () => ({
    spaces: [] as Space[],
    prompts: [] as Prompt[],
    currentSpaceId: 'space_default',
    searchQuery: '',
    selectedIndex: 0,
    isLoading: false,
  }),

  getters: {
    currentSpace: (state) => state.spaces.find((s) => s.id === state.currentSpaceId),
    filteredPrompts(): Prompt[] {
      return useSearch(this.prompts, this.searchQuery, this.currentSpaceId)
    },
    selectedPrompt(): Prompt | undefined {
      return this.filteredPrompts[this.selectedIndex]
    },
    promptsBySpace: (state) => (spaceId: string) =>
      state.prompts.filter((p) => p.spaceId === spaceId),
  },

  actions: {
    async loadPrompts() {
      this.isLoading = true
      try {
        const data = await invoke('get_app_data') as AppData
        this.spaces = data.spaces || []
        this.prompts = data.prompts || []
      } catch (error) {
        console.error('Failed to load prompts:', error)
        // 使用默认数据
        this.spaces = DEFAULT_SPACES
        this.prompts = DEFAULT_PROMPTS
      } finally {
        this.isLoading = false
      }
    },

    async createPrompt(prompt: PromptInput) {
      try {
        const newPrompt = await invoke('create_prompt', { prompt }) as Prompt
        this.prompts.push(newPrompt)
        return newPrompt
      } catch (error) {
        console.error('Failed to create prompt:', error)
        throw error
      }
    },

    async updatePrompt(id: string, updates: Partial<Prompt>) {
      try {
        const updatedPrompt = await invoke<Prompt>('update_prompt', { id, updates })
        const index = this.prompts.findIndex((p) => p.id === id)
        if (index !== -1) {
          this.prompts[index] = updatedPrompt
        }
        return updatedPrompt
      } catch (error) {
        console.error('Failed to update prompt:', error)
        throw error
      }
    },

    async deletePrompt(id: string) {
      try {
        await invoke('delete_prompt', { id })
        this.prompts = this.prompts.filter((p) => p.id !== id)
      } catch (error) {
        console.error('Failed to delete prompt:', error)
        throw error
      }
    },

    async selectAndOutput(prompt: Prompt) {
      const uiStore = useUiStore()
      const variables = this.parseVariables(prompt.content)

      // 检查是否有自定义变量
      const customVariables = variables.filter((v) => v.type === 'custom')
      if (customVariables.length > 0) {
        uiStore.openVariableForm(prompt)
      } else {
        await this.outputPrompt(prompt)
      }
    },

    async outputPrompt(prompt: Prompt, customValues: Record<string, string> = {}) {
      try {
        // 获取唤醒时保存的剪贴板内容（而非当前剪贴板）
        // 这是在窗口显示前执行 Ctrl+C 时捕获的内容
        let clipboardText = ''
        try {
          clipboardText = await invoke<string>('get_wakeup_clipboard')
        } catch {
          clipboardText = ''
        }

        // 准备变量值
        const values: Record<string, string> = {
          ...customValues,
          clipboard: clipboardText,
          date: this.formatDate(new Date()),
          time: this.formatTime(new Date()),
          timestamp: String(Date.now()),
        }

        // 替换变量
        const outputText = this.replaceVariables(prompt.content, values)

        // 输出到剪贴板并模拟粘贴，自动恢复原剪贴板
        await invoke('paste_and_restore', { text: outputText })

        // 更新使用计数
        await invoke('update_prompt_usage', { id: prompt.id })
      } catch (error) {
        console.error('Failed to output prompt:', error)
        throw error
      }
    },

    async outputWithVariables(values: Record<string, string>) {
      const uiStore = useUiStore()
      if (uiStore.currentPrompt) {
        await this.outputPrompt(uiStore.currentPrompt, values)
        uiStore.closeVariableForm()
      }
    },

    async savePrompt(prompt: Prompt) {
      if (prompt.id && prompt.id.trim()) {
        return await this.updatePrompt(prompt.id, prompt)
      } else {
        // 创建新提示词时只传递需要的字段
        const input: PromptInput = {
          title: prompt.title,
          content: prompt.content,
          tags: prompt.tags,
          spaceId: prompt.spaceId,
        }
        const newPrompt = await this.createPrompt(input)
        return newPrompt
      }
    },

    parseVariables(content: string): Variable[] {
      const regex = /\{\{(\w+)\}\}/g
      const variables: Variable[] = []
      const systemVariables = ['clipboard', 'date', 'time', 'timestamp']

      let match
      while ((match = regex.exec(content)) !== null) {
        const name = match[1]
        if (!variables.find((v) => v.name === name)) {
          variables.push({
            name,
            type: systemVariables.includes(name) ? 'system' : 'custom',
          })
        }
      }

      return variables
    },

    replaceVariables(content: string, values: Record<string, string>): string {
      let result = content
      for (const [name, value] of Object.entries(values)) {
        result = result.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), value)
      }
      return result
    },

    formatDate(date: Date): string {
      return date.toISOString().split('T')[0]
    },

    formatTime(date: Date): string {
      return date.toTimeString().split(' ')[0]
    },

    setSearchQuery(query: string) {
      this.searchQuery = query
      this.selectedIndex = 0
    },

    setCurrentSpace(spaceId: string) {
      this.currentSpaceId = spaceId
      this.selectedIndex = 0
    },

    moveSelection(delta: number) {
      const newIndex = this.selectedIndex + delta
      if (newIndex >= 0 && newIndex < this.filteredPrompts.length) {
        this.selectedIndex = newIndex
      }
    },

    nextSpace() {
      const currentIndex = this.spaces.findIndex((s) => s.id === this.currentSpaceId)
      const nextIndex = (currentIndex + 1) % this.spaces.length
      this.setCurrentSpace(this.spaces[nextIndex].id)
    },

    prevSpace() {
      const currentIndex = this.spaces.findIndex((s) => s.id === this.currentSpaceId)
      const prevIndex = (currentIndex - 1 + this.spaces.length) % this.spaces.length
      this.setCurrentSpace(this.spaces[prevIndex].id)
    },

    async createSpace(name: string, icon: string, color: string) {
      try {
        const newSpace = await invoke<Space>('create_space', { name, icon, color })
        this.spaces.push(newSpace)
        return newSpace
      } catch (error) {
        console.error('Failed to create space:', error)
        throw error
      }
    },

    async updateSpace(id: string, updates: { name?: string; icon?: string; color?: string }) {
      try {
        const updatedSpace = await invoke<Space>('update_space', { id, ...updates })
        const index = this.spaces.findIndex((s) => s.id === id)
        if (index !== -1) {
          this.spaces[index] = updatedSpace
        }
        return updatedSpace
      } catch (error) {
        console.error('Failed to update space:', error)
        throw error
      }
    },

    async deleteSpace(id: string) {
      try {
        await invoke('delete_space', { id })
        this.spaces = this.spaces.filter((s) => s.id !== id)
        this.prompts = this.prompts.filter((p) => p.spaceId !== id)
        // 如果删除的是当前空间，切换到默认空间
        if (this.currentSpaceId === id) {
          this.setCurrentSpace('space_default')
        }
      } catch (error) {
        console.error('Failed to delete space:', error)
        throw error
      }
    },

    async exportData() {
      try {
        const data = await invoke<AppData>('export_data')
        return data
      } catch (error) {
        console.error('Failed to export data:', error)
        throw error
      }
    },

    async importData(data: AppData, merge: boolean = true) {
      try {
        const result = await invoke<ImportResult>('import_data', { importData: data, merge })
        // 重新加载数据
        await this.loadPrompts()
        return result
      } catch (error) {
        console.error('Failed to import data:', error)
        throw error
      }
    },
  },
})