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

// AI 优化历史空间的固定 ID（两端共用约定）
export const AI_HISTORY_SPACE_ID = 'space_ai_history'

// 默认优化指令模板
export const DEFAULT_OPTIMIZE_TEMPLATE =
  '你是提示词优化专家。将用户发来的内容改写为一条结构清晰、表达准确、上下文完整的提示词，保留原意，不新增无关要求。只输出优化后的提示词本身，不要任何解释、前言或 Markdown 代码块包裹。'

// 设置模型
export interface Settings {
  globalHotkey: string
  theme: 'light' | 'dark' | 'system'
  language: string
  windowOpacity: number
  windowPosition: Position | null
  windowSize: Size
  autoHide: boolean
  searchDebounce: number
  maxResults: number
  launchAtLogin: boolean
  // AI 优化（OpenAI 兼容 Chat Completions）
  aiBaseUrl: string
  aiApiKey: string
  aiModel: string
  optimizeTemplate: string
  // AI 优化全局快捷键（仅桌面端）
  optimizeHotkey: string
  // 推理模式（深度思考，更慢），默认关闭
  optimizeThinking: boolean
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
  searchDebounce: 300,
  maxResults: 6,
  launchAtLogin: false,
  aiBaseUrl: 'https://api.deepseek.com',
  aiApiKey: '',
  aiModel: 'deepseek-flash',
  optimizeTemplate: DEFAULT_OPTIMIZE_TEMPLATE,
  optimizeHotkey: 'Ctrl+Alt+O',
  optimizeThinking: false,
}

// 默认空间
export const DEFAULT_SPACES: Space[] = [
  {
    id: 'space_default',
    name: '默认',
    icon: '📁',
    color: '#3B82F6',
    order: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'space_work',
    name: '工作',
    icon: '💼',
    color: '#10B981',
    order: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'space_personal',
    name: '个人',
    icon: '🏠',
    color: '#F59E0B',
    order: 2,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
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
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
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
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
]