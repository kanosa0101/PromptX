import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import {
  parseVariables as sharedParseVariables,
  replaceVariables as sharedReplaceVariables,
} from '@shared/variable'
import type { Prompt, Space, Variable, AppData, ImportResult, PromptInput } from '@/types'
import { useSearch } from '@/composables/useSearch'
import { t } from '@/i18n'
import { useSettingsStore } from './settingsStore'
import { useUiStore } from './uiStore'
import { isTauri } from '@/utils/isTauri'

const DEFAULT_WEB_SPACES: Space[] = [
  { id: 'space_default', name: '默认', icon: '📁', color: '#3B82F6', order: 0, createdAt: '2026-05-16T01:45:39.072Z', updatedAt: '2026-05-16T01:45:39.072Z' },
  { id: 'space_work', name: '工作', icon: '💼', color: '#10B981', order: 1, createdAt: '2026-05-16T01:45:39.072Z', updatedAt: '2026-05-16T01:45:39.072Z' },
  { id: 'space_personal', name: '个人', icon: '🏠', color: '#F59E0B', order: 2, createdAt: '2026-05-16T01:45:39.072Z', updatedAt: '2026-05-16T01:45:39.072Z' },
  { id: 'space_ai_history', name: 'AI 优化', icon: '✨', color: '#8B5CF6', order: 3, createdAt: '2026-09-19T09:03:42.585Z', updatedAt: '2026-09-19T09:03:42.585Z' },
]

const DEFAULT_WEB_PROMPTS: Prompt[] = [
  {
    id: 'prompt_001',
    title: '代码解释',
    content: '请解释以下代码的功能：\n\n{{clipboard}}',
    tags: ['开发', '代码'],
    spaceId: 'space_work',
    variables: [{ name: 'clipboard', type: 'system', defaultValue: undefined }],
    usageCount: 1,
    lastUsedAt: null,
    createdAt: '2026-05-16T01:45:39.072Z',
    updatedAt: '2026-05-16T01:45:39.072Z',
    favorite: false,
  },
  {
    id: 'prompt_002',
    title: '文档润色',
    content: '请润色以下文档：\n\n{{clipboard}}',
    tags: ['写作'],
    spaceId: 'space_work',
    variables: [{ name: 'clipboard', type: 'system', defaultValue: undefined }],
    usageCount: 1,
    lastUsedAt: null,
    createdAt: '2026-05-16T01:45:39.072Z',
    updatedAt: '2026-05-16T01:45:39.072Z',
    favorite: false,
  },
]

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
    sortedByCreated(): Prompt[] {
      // 创建时间倒序：最新在前。独立 getter 让排序结果被 computed 缓存，
      // 引用稳定直到 prompts 变化——搜索层据此复用 Fuse/拼音索引
      return [...this.prompts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    filteredPrompts(): Prompt[] {
      const settingsStore = useSettingsStore()
      const maxResults = settingsStore.maxResults || 6
      const results = useSearch(this.sortedByCreated, this.searchQuery, this.currentSpaceId)
      // 收藏置顶：收藏项排在结果前部（组内保持原有顺序——相关度/创建时间）
      const favorites = results.filter((p) => p.favorite)
      const others = results.filter((p) => !p.favorite)
      return [...favorites, ...others].slice(0, maxResults)
    },
    selectedPrompt(): Prompt | undefined {
      return this.filteredPrompts[this.selectedIndex]
    },
    promptsBySpace: (state) => (spaceId: string) =>
      state.prompts.filter((p) => p.spaceId === spaceId),
  },

  actions: {
    saveWebData() {
      if (!isTauri()) {
        try {
          localStorage.setItem(
            'promptx_web_data',
            JSON.stringify({
              spaces: this.spaces,
              prompts: this.prompts,
            })
          )
        } catch {
          // ignore localStorage error
        }
      }
    },

    async loadPrompts() {
      this.isLoading = true
      try {
        if (isTauri()) {
          const data = await invoke('get_app_data') as AppData
          // 空间按 order 字段排序（与拖拽排序持久化的顺序一致）
          this.spaces = [...(data.spaces || [])].sort((a, b) => a.order - b.order)
          this.prompts = data.prompts || []
        } else {
          const cached = localStorage.getItem('promptx_web_data')
          if (cached) {
            try {
              const data = JSON.parse(cached)
              this.spaces = (data.spaces || []).sort((a: Space, b: Space) => a.order - b.order)
              this.prompts = data.prompts || []
            } catch {
              this.spaces = DEFAULT_WEB_SPACES
              this.prompts = DEFAULT_WEB_PROMPTS
            }
          } else {
            this.spaces = DEFAULT_WEB_SPACES
            this.prompts = DEFAULT_WEB_PROMPTS
            this.saveWebData()
          }
        }
      } catch (error) {
        console.error('Failed to load prompts:', error)
        // 加载失败保持空列表并提示用户；绝不注入演示数据冒充用户数据
        // （首次运行的默认数据由后端 data.json 初始化提供，不走这个分支）
        this.spaces = []
        this.prompts = []
        const uiStore = useUiStore()
        uiStore.showSystemNotice(
          t('settings.loadFailed', { error: error instanceof Error ? error.message : String(error) })
        )
      } finally {
        this.isLoading = false
      }
    },

    async createPrompt(prompt: PromptInput) {
      try {
        if (isTauri()) {
          const newPrompt = await invoke('create_prompt', { prompt }) as Prompt
          this.prompts.push(newPrompt)
          return newPrompt
        } else {
          const newPrompt: Prompt = {
            id: `p_${Date.now()}`,
            title: prompt.title,
            content: prompt.content,
            tags: prompt.tags || [],
            spaceId: prompt.spaceId || this.currentSpaceId,
            variables: this.parseVariables(prompt.content),
            usageCount: 0,
            lastUsedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            favorite: false,
          }
          this.prompts.push(newPrompt)
          this.saveWebData()
          return newPrompt
        }
      } catch (error) {
        console.error('Failed to create prompt:', error)
        throw error
      }
    },

    async updatePrompt(id: string, updates: Partial<Prompt>) {
      try {
        if (isTauri()) {
          const updatedPrompt = await invoke<Prompt>('update_prompt', { id, updates })
          const index = this.prompts.findIndex((p) => p.id === id)
          if (index !== -1) {
            this.prompts[index] = updatedPrompt
          }
          return updatedPrompt
        } else {
          const index = this.prompts.findIndex((p) => p.id === id)
          if (index !== -1) {
            const updated = {
              ...this.prompts[index],
              ...updates,
              updatedAt: new Date().toISOString(),
            }
            if (updates.content) {
              updated.variables = this.parseVariables(updates.content)
            }
            this.prompts[index] = updated
            this.saveWebData()
            return updated
          }
          throw new Error('Prompt not found')
        }
      } catch (error) {
        console.error('Failed to update prompt:', error)
        throw error
      }
    },

    async deletePrompt(id: string) {
      try {
        if (isTauri()) {
          await invoke('delete_prompt', { id })
        }
        this.prompts = this.prompts.filter((p) => p.id !== id)
        this.saveWebData()
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
        if (isTauri()) {
          try {
            clipboardText = await invoke<string>('get_wakeup_clipboard')
          } catch {
            clipboardText = ''
          }
        } else {
          try {
            clipboardText = (await navigator.clipboard.readText()) || ''
          } catch {
            clipboardText = ''
          }
        }

        // 准备变量值
        const values: Record<string, string> = {
          ...customValues,
          clipboard: clipboardText,
          date: this.formatDate(new Date()),
          time: this.formatTime(new Date()),
          timestamp: String(Math.floor(Date.now() / 1000)),
        }

        // 替换变量
        const outputText = this.replaceVariables(prompt.content, values)

        if (isTauri()) {
          // 输出到剪贴板并模拟粘贴，自动恢复原剪贴板
          await invoke('paste_and_restore', { text: outputText })
          // 更新使用计数
          await invoke('update_prompt_usage', { id: prompt.id })
        } else {
          await navigator.clipboard.writeText(outputText)
          const p = this.prompts.find((item) => item.id === prompt.id)
          if (p) {
            p.usageCount = (p.usageCount || 0) + 1
            p.lastUsedAt = new Date().toISOString()
            this.saveWebData()
          }
          const uiStore = useUiStore()
          uiStore.showAiNotice(t('optimizer.doneClipboard'))
          window.setTimeout(() => uiStore.clearAiNotice(), 2500)
        }
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

    // 变量解析/替换委托共享实现（shared/variable.ts）
    parseVariables(content: string): Variable[] {
      return sharedParseVariables(content)
    },

    replaceVariables(content: string, values: Record<string, string>): string {
      return sharedReplaceVariables(content, values)
    },

    formatDate(date: Date): string {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    formatTime(date: Date): string {
      const h = String(date.getHours()).padStart(2, '0')
      const m = String(date.getMinutes()).padStart(2, '0')
      const s = String(date.getSeconds()).padStart(2, '0')
      return `${h}:${m}:${s}`
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
      if (this.spaces.length === 0) return
      const currentIndex = this.spaces.findIndex((s) => s.id === this.currentSpaceId)
      const nextIndex = (currentIndex + 1) % this.spaces.length
      this.setCurrentSpace(this.spaces[nextIndex].id)
    },

    prevSpace() {
      if (this.spaces.length === 0) return
      const currentIndex = this.spaces.findIndex((s) => s.id === this.currentSpaceId)
      const prevIndex = (currentIndex - 1 + this.spaces.length) % this.spaces.length
      this.setCurrentSpace(this.spaces[prevIndex].id)
    },

    async createSpace(name: string, icon: string, color: string) {
      try {
        if (isTauri()) {
          const newSpace = await invoke<Space>('create_space', { name, icon, color })
          this.spaces.push(newSpace)
          return newSpace
        } else {
          const newSpace: Space = {
            id: `space_${Date.now()}`,
            name,
            icon,
            color,
            order: this.spaces.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          this.spaces.push(newSpace)
          this.saveWebData()
          return newSpace
        }
      } catch (error) {
        console.error('Failed to create space:', error)
        throw error
      }
    },

    async updateSpace(id: string, updates: { name?: string; icon?: string; color?: string }) {
      try {
        if (isTauri()) {
          const updatedSpace = await invoke<Space>('update_space', { id, ...updates })
          const index = this.spaces.findIndex((s) => s.id === id)
          if (index !== -1) {
            this.spaces[index] = updatedSpace
          }
          return updatedSpace
        } else {
          const index = this.spaces.findIndex((s) => s.id === id)
          if (index !== -1) {
            const updated = { ...this.spaces[index], ...updates, updatedAt: new Date().toISOString() }
            this.spaces[index] = updated
            this.saveWebData()
            return updated
          }
          throw new Error('Space not found')
        }
      } catch (error) {
        console.error('Failed to update space:', error)
        throw error
      }
    },

    async deleteSpace(id: string) {
      try {
        if (isTauri()) {
          await invoke('delete_space', { id })
        }
        this.spaces = this.spaces.filter((s) => s.id !== id)
        // 将该空间下的提示词移至默认空间（与后端行为一致）
        this.prompts.forEach((p) => {
          if (p.spaceId === id) {
            p.spaceId = 'space_default'
          }
        })
        // 如果删除的是当前空间，切换到默认空间
        if (this.currentSpaceId === id) {
          this.setCurrentSpace('space_default')
        }
        this.saveWebData()
      } catch (error) {
        console.error('Failed to delete space:', error)
        throw error
      }
    },

    // 空间拖拽排序：传入完整 ID 顺序，后端校验并持久化
    async reorderSpaces(orderedIds: string[]) {
      try {
        if (isTauri()) {
          const spaces = await invoke<Space[]>('reorder_spaces', { spaceIds: orderedIds })
          this.spaces = spaces
        } else {
          const spaceMap = new Map(this.spaces.map((s) => [s.id, s]))
          const reordered: Space[] = []
          orderedIds.forEach((id, index) => {
            const s = spaceMap.get(id)
            if (s) {
              reordered.push({ ...s, order: index })
            }
          })
          this.spaces = reordered
          this.saveWebData()
        }
      } catch (error) {
        console.error('Failed to reorder spaces:', error)
        throw error
      }
    },

    async exportData() {
      try {
        if (isTauri()) {
          const data = await invoke<AppData>('get_app_data')
          return data
        } else {
          const settingsStore = useSettingsStore()
          return {
            version: '2.0.0',
            settings: settingsStore.$state,
            spaces: this.spaces,
            prompts: this.prompts,
          } as unknown as AppData
        }
      } catch (error) {
        console.error('Failed to export data:', error)
        throw error
      }
    },

    async importData(data: AppData, merge: boolean = true) {
      try {
        if (isTauri()) {
          const result = await invoke<ImportResult>('import_data', { importData: data, merge })
          // 重新加载数据
          await this.loadPrompts()
          return result
        } else {
          if (merge) {
            const existingIds = new Set(this.prompts.map((p) => p.id))
            data.prompts.forEach((p) => {
              if (existingIds.has(p.id)) {
                const idx = this.prompts.findIndex((item) => item.id === p.id)
                this.prompts[idx] = p
              } else {
                this.prompts.push(p)
              }
            })
          } else {
            this.spaces = data.spaces || this.spaces
            this.prompts = data.prompts || []
          }
          this.saveWebData()
          return { importedPrompts: data.prompts?.length || 0, importedSpaces: data.spaces?.length || 0, skipped: 0, conflicts: [] }
        }
      } catch (error) {
        console.error('Failed to import data:', error)
        throw error
      }
    },
  },
})
