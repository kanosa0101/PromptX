/**
 * PromptX 核心类型定义
 */

// 提示词变量类型
export interface Variable {
  name: string
  type: 'system' | 'custom'
  defaultValue?: string
}

// 提示词模型
export interface Prompt {
  id: string
  title: string
  content: string
  tags: string[]
  spaceId: string
  variables: Variable[]
  usageCount: number
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}

// 命名空间模型
export interface Space {
  id: string
  name: string
  icon: string
  color: string
  order: number
  createdAt: string
  updatedAt: string
}

// 窗口位置
export interface Position {
  x: number
  y: number
}

// 窗口尺寸
export interface Size {
  width: number
  height: number
}

// 设置模型
export interface Settings {
  globalHotkey: string
  theme: 'light' | 'dark' | 'system'
  language: string
  windowOpacity: number
  windowPosition: Position | null
  windowSize: Size
  autoHide: boolean
  showInDock: boolean
  launchAtLogin: boolean
}

// 应用数据结构
export interface AppData {
  version: string
  settings: Settings
  spaces: Space[]
  prompts: Prompt[]
}

// 搜索匹配结果
export interface MatchResult {
  key: string
  indices: Array<[number, number]>
}

// 搜索结果提示词 (带匹配信息)
export interface SearchResult extends Prompt {
  matches?: MatchResult[]
}

// 导入结果
export interface ImportResult {
  importedPrompts: number
  importedSpaces: number
  skipped: number
  conflicts: string[]
}

// 创建提示词输入
export interface PromptInput {
  title: string
  content: string
  tags: string[]
  spaceId: string
}

// 默认设置
export const DEFAULT_SETTINGS: Settings = {
  globalHotkey: 'Alt+Space',
  theme: 'system',
  language: 'zh-CN',
  windowOpacity: 0.95,
  windowPosition: null,
  windowSize: { width: 600, height: 400 },
  autoHide: true,
  showInDock: false,
  launchAtLogin: false,
}

// 默认空间
export const DEFAULT_SPACES: Space[] = [
  {
    id: 'space_default',
    name: '默认',
    icon: '📁',
    color: '#3B82F6',
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'space_work',
    name: '工作',
    icon: '💼',
    color: '#10B981',
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'space_personal',
    name: '个人',
    icon: '🏠',
    color: '#F59E0B',
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// 默认提示词示例
export const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: 'prompt_001',
    title: '代码解释',
    content: '请解释以下代码的功能：\n\n{{clipboard}}',
    tags: ['开发', '代码'],
    spaceId: 'space_work',
    variables: [{ name: 'clipboard', type: 'system' }],
    usageCount: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prompt_002',
    title: '文档润色',
    content: '请润色以下文档，使其更加专业和清晰：\n\n{{clipboard}}',
    tags: ['写作', '文档'],
    spaceId: 'space_work',
    variables: [{ name: 'clipboard', type: 'system' }],
    usageCount: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prompt_003',
    title: '翻译为英文',
    content: '请将以下内容翻译为英文：\n\n{{clipboard}}',
    tags: ['翻译'],
    spaceId: 'space_default',
    variables: [{ name: 'clipboard', type: 'system' }],
    usageCount: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]