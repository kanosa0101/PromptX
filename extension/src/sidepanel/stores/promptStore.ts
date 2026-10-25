/**
 * Prompt Store - 核心状态管理
 */

import { defineStore } from 'pinia'
import { loadAppData, mutateAppData } from '@/lib/storage'
import { getSelectionFromActiveTab, insertTextToActiveTab } from '@/lib/messaging'
import { parseVariables, replaceVariables, getCustomVariables, getSystemVariableValue } from '@/utils/variable'
import { useSearch } from '@/sidepanel/composables/useSearch'
import { DEFAULT_SETTINGS } from '@/types'
import { useUiStore } from './uiStore'
import type { Prompt, Space, SearchResult } from '@/types'

export const usePromptStore = defineStore('prompt', {
  state: () => ({
    spaces: [] as Space[],
    prompts: [] as Prompt[],
    currentSpaceId: 'space_default',
    searchQuery: '',
    selectedIndex: 0,
    isLoading: true,
    pageSelection: '',
    maxResults: DEFAULT_SETTINGS.maxResults,
    lastOutputMethod: null as 'success' | 'clipboard' | null
  }),

  getters: {
    currentSpace: (state) => state.spaces.find(s => s.id === state.currentSpaceId),

    // 创建时间倒序：最新在前。独立 getter 让排序结果被 computed 缓存，
    // 引用稳定直到 prompts 变化——搜索层据此复用 Fuse/拼音索引
    sortedByCreated(): Prompt[] {
      return [...this.prompts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    // 使用 useSearch composable 进行搜索（支持拼音匹配；搜索时按相关度排序）
    // 与桌面端一致：结果始终按设置里的 maxResults 截断；收藏项置顶（组内保持原有顺序）
    filteredPrompts(): SearchResult[] {
      const results = useSearch(this.sortedByCreated, this.searchQuery, this.currentSpaceId)
      const favorites = results.filter((p) => p.favorite)
      const others = results.filter((p) => !p.favorite)
      return [...favorites, ...others].slice(0, this.maxResults)
    },

    selectedPrompt(): SearchResult | null {
      return this.filteredPrompts[this.selectedIndex] || null
    }
  },

  actions: {
    /**
     * 加载数据
     */
    async loadData() {
      this.isLoading = true
      try {
        const data = await loadAppData()
        // 空间按 order 字段排序（与拖拽排序持久化的顺序一致）
        this.spaces = [...data.spaces].sort((a, b) => a.order - b.order)
        this.prompts = data.prompts
        this.maxResults = data.settings?.maxResults ?? DEFAULT_SETTINGS.maxResults
        this.pageSelection = await getSelectionFromActiveTab()
      } catch {
        // 使用默认数据
      }
      this.isLoading = false
    },

    /**
     * 从存储刷新数据（其他上下文写入后由 onChanged 触发，保持两端视图一致）。
     * onChanged 对本上下文自己的写入同样触发：内容无变化时跳过替换，
     * 避免数组引用变化导致 Fuse/拼音索引缓存全部失效重建
     */
    /** 桌面端数据变更推送（NM dataChanged）→ 静默刷新 */
    async refreshFromNmChange() {
      await this.refreshFromStorage()
    },

    async refreshFromStorage() {
      const data = await loadAppData()
      this.maxResults = data.settings?.maxResults ?? DEFAULT_SETTINGS.maxResults
      // 与 store 内已排序的 spaces 对齐后再比较，避免存储数组顺序不同导致每次都替换
      const sortedSpaces = [...data.spaces].sort((a, b) => a.order - b.order)
      if (
        JSON.stringify(data.prompts) === JSON.stringify(this.prompts) &&
        JSON.stringify(sortedSpaces) === JSON.stringify(this.spaces)
      ) {
        return
      }
      this.spaces = sortedSpaces
      this.prompts = data.prompts
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

      // 更新使用计数：filteredPrompts 给出的是拷贝，须回写 store 内的原始对象
      const target = this.prompts.find((p) => p.id === prompt.id)
      if (target) {
        target.usageCount++
        target.lastUsedAt = new Date().toISOString()
      }
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
    async updatePrompt(id: string, data: Partial<{ title: string; content: string; tags: string[]; spaceId: string; favorite: boolean }>) {
      const index = this.prompts.findIndex((p) => p.id === id)
      if (index !== -1) {
        const updated: Prompt = {
          ...this.prompts[index],
          ...data,
          updatedAt: new Date().toISOString()
        }
        if (data.content) {
          updated.variables = parseVariables(data.content)
        }
        // 替换对象引用，使搜索索引（Fuse/拼音缓存）随之失效
        this.prompts[index] = updated
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
     * 空间拖拽排序：按给定 ID 顺序重排并重写 order 字段后持久化
     */
    async reorderSpaces(orderedIds: string[]) {
      const byId = new Map(this.spaces.map((s) => [s.id, s]))
      const next = orderedIds.map((id) => byId.get(id)).filter((s): s is Space => !!s)
      if (next.length !== this.spaces.length) return
      const now = new Date().toISOString()
      next.forEach((s, i) => {
        s.order = i
        s.updatedAt = now
      })
      this.spaces = next
      await this.saveData()
    },

    /**
     * 保存数据（原子化读改写：只更新本 store 管辖的空间/提示词，
     * settings 等字段保留锁内最新快照，避免覆盖其他上下文的并发修改）
     */
    async saveData() {
      await mutateAppData((data) => {
        data.spaces = this.spaces
        data.prompts = this.prompts
      })
    }
  }
})