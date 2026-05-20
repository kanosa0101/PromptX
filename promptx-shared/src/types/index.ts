/**
 * PromptX 共享类型定义
 */

// 提示词
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

// 命名空间
export interface Space {
  id: string
  name: string
  icon: string
  color: string
  order: number
  createdAt: string
  updatedAt: string
}

// 变量
export interface Variable {
  name: string
  type: 'system' | 'custom'
  defaultValue?: string
}

// 搜索结果
export interface SearchResult extends Prompt {
  matches?: MatchResult[]
}

// 匹配结果
export interface MatchResult {
  key: string
  indices: Array<[number, number]>
}

// 应用数据
export interface AppData {
  version: string
  settings: Settings
  spaces: Space[]
  prompts: Prompt[]
}

// 设置
export interface Settings {
  theme: 'light' | 'dark' | 'system'
  maxResults?: number
}

// 导出结果
export interface ExportResult {
  importedPrompts: number
  importedSpaces: number
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
    updatedAt: new Date().toISOString()
  },
  {
    id: 'space_work',
    name: '工作',
    icon: '💼',
    color: '#10B981',
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'space_personal',
    name: '个人',
    icon: '🏠',
    color: '#F59E0B',
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// 默认提示词
export const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: 'prompt_code_explain',
    title: '代码解释',
    content: '请解释以下代码的功能：\n\n{{clipboard}}',
    tags: ['开发', '代码'],
    spaceId: 'space_default',
    variables: [
      { name: 'clipboard', type: 'system' }
    ],
    usageCount: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prompt_translate',
    title: '翻译为英文',
    content: '请将以下内容翻译为英文：\n\n{{clipboard}}',
    tags: ['翻译'],
    spaceId: 'space_default',
    variables: [
      { name: 'clipboard', type: 'system' }
    ],
    usageCount: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prompt_custom_target',
    title: '翻译为指定语言',
    content: '请将以下内容翻译为{{目标语言}}：\n\n{{clipboard}}',
    tags: ['翻译', '自定义'],
    spaceId: 'space_default',
    variables: [
      { name: 'clipboard', type: 'system' },
      { name: '目标语言', type: 'custom' }
    ],
    usageCount: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// 默认数据
export const DEFAULT_APP_DATA: AppData = {
  version: '1.0.0',
  settings: {
    theme: 'system',
    maxResults: 20
  },
  spaces: DEFAULT_SPACES,
  prompts: DEFAULT_PROMPTS
}