/**
 * 平台后端适配层（design.md UI 合并 Step 3）
 *
 * 把「数据存取 + 输出」的平台差异收敛到一个显式接口后面：
 * 桌面端实现走 Tauri invoke，扩展端实现走 chrome.storage / Native Messaging / DOM 注入。
 * 共享层（stores / 未来 shared/ui 组件）只依赖本接口，不再 if/else 平台分支。
 *
 * 迁移策略：现有两端的 promptStore 保持不动（它们已是各自的装配代码），
 * 本接口供后续 shared/ui 组件与新增功能使用；逐步把组件从直接调 store
 * 改为经此接口，最终两端 store 退化为「状态 + adapter 装配」。
 */
import type { AppData, ImportResult, Prompt, PromptInput, Space } from './types'

/** 输出结果：inserted = 已写入目标位置；copied = 已复制到剪贴板（用户需手动粘贴） */
export type OutputResult = 'inserted' | 'copied'

export interface PromptBackend {
  /** 全量读取（设置 + 空间 + 提示词） */
  loadAppData(): Promise<AppData>

  /** 提示词 CRUD；更新为部分字段，返回更新后的完整条目 */
  createPrompt(input: PromptInput): Promise<Prompt>
  updatePrompt(id: string, updates: Partial<Prompt>): Promise<Prompt>
  deletePrompt(id: string): Promise<void>
  /** 使用计数 +1 并记录时间（输出后调用） */
  recordPromptUsage(id: string): Promise<void>

  /** 空间 CRUD 与排序 */
  createSpace(name: string, icon: string, color: string): Promise<Space>
  updateSpace(id: string, updates: Partial<Pick<Space, 'name' | 'icon' | 'color'>>): Promise<Space>
  deleteSpace(id: string): Promise<void>
  /** 按给定 ID 顺序持久化空间排序 */
  reorderSpaces(orderedIds: string[]): Promise<Space[]>

  /** 导入（merge=true 覆盖冲突 / false 跳过） */
  importData(data: AppData, merge: boolean): Promise<ImportResult>

  /** 输出提示词文本到当前焦点位置 */
  outputText(text: string): Promise<OutputResult>

  /** 当前选中文本（{{clipboard}} 变量来源） */
  getPageSelection(): Promise<string>
}

/** 桌面端（Tauri invoke）实现 */
export function createDesktopBackend(invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>): PromptBackend {
  return {
    async loadAppData() {
      return invoke('get_app_data') as Promise<AppData>
    },
    createPrompt(input) {
      return invoke('create_prompt', { prompt: input }) as Promise<Prompt>
    },
    updatePrompt(id, updates) {
      return invoke('update_prompt', { id, updates }) as Promise<Prompt>
    },
    async deletePrompt(id) {
      await invoke('delete_prompt', { id })
    },
    async recordPromptUsage(id) {
      await invoke('update_prompt_usage', { id })
    },
    async createSpace(name, icon, color) {
      return invoke('create_space', { name, icon, color }) as Promise<Space>
    },
    async updateSpace(id, updates) {
      return invoke('update_space', { id, ...updates }) as Promise<Space>
    },
    async deleteSpace(id) {
      await invoke('delete_space', { id })
    },
    async reorderSpaces(orderedIds) {
      return invoke('reorder_spaces', { spaceIds: orderedIds }) as Promise<Space[]>
    },
    async importData(data, merge) {
      return invoke('import_data', { importData: data, merge }) as Promise<ImportResult>
    },
    async outputText(text) {
      await invoke('paste_and_restore', { text })
      return 'inserted'
    },
    async getPageSelection() {
      try {
        return ((await invoke('get_wakeup_clipboard')) as string) ?? ''
      } catch {
        return ''
      }
    },
  }
}

/**
 * 扩展端（chrome.storage + DOM 注入）实现的输入依赖：
 * 输出与选区依赖页面注入与变量填充，由调用方注入实现，避免本模块依赖运行环境
 */
export interface ExtensionBackendDeps {
  insertTextToActiveTab(text: string): Promise<boolean>
  getSelectionFromActiveTab(): Promise<string>
  writeClipboard(text: string): Promise<void>
}

/** 扩展端（chrome.storage / NM）实现（loadAppData 等由调用方传入 storage 层函数） */
export function createExtensionBackend(
  storage: {
    loadAppData(): Promise<AppData>
    createPrompt(input: PromptInput): Promise<Prompt>
    updatePrompt(id: string, updates: Partial<Prompt>): Promise<Prompt>
    deletePrompt(id: string): Promise<void>
    createSpace(name: string, icon: string, color: string): Promise<Space>
    updateSpace(id: string, updates: Partial<Pick<Space, 'name' | 'icon' | 'color'>>): Promise<Space>
    deleteSpace(id: string): Promise<void>
    reorderSpaces(orderedIds: string[]): Promise<Space[]>
    importData(data: AppData, merge: boolean): Promise<ImportResult>
  },
  deps: ExtensionBackendDeps,
): PromptBackend {
  return {
    loadAppData: () => storage.loadAppData(),
    createPrompt: (input) => storage.createPrompt(input),
    updatePrompt: (id, updates) => storage.updatePrompt(id, updates),
    deletePrompt: (id) => storage.deletePrompt(id),
    async recordPromptUsage(id) {
      // 扩展端使用计数随 saveData 一并持久化（store 内直接改对象后写回）
      await Promise.resolve()
      void id
    },
    createSpace: (name, icon, color) => storage.createSpace(name, icon, color),
    updateSpace: (id, updates) => storage.updateSpace(id, updates),
    deleteSpace: (id) => storage.deleteSpace(id),
    reorderSpaces: (orderedIds) => storage.reorderSpaces(orderedIds),
    importData: (data, merge) => storage.importData(data, merge),
    async outputText(text) {
      const inserted = await deps.insertTextToActiveTab(text)
      if (inserted) return 'inserted'
      await deps.writeClipboard(text)
      return 'copied'
    },
    getPageSelection: () => deps.getSelectionFromActiveTab(),
  }
}
