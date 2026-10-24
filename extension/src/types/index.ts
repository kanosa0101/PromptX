/**
 * PromptX 浏览器扩展端类型定义（共享类型见 shared/types.ts）
 */
import type { AiSettings, AppData as SharedAppData, Prompt, Space } from '@shared/types'
import { DEFAULT_AI_SETTINGS } from '@shared/types'

// 共享类型：Variable / Prompt / Space / MatchResult / SearchResult /
// SystemVariableName / AppData / AI 常量 / AiSettings
export * from '@shared/types'

// 设置模型（扩展端：主题与结果数 + AI 公共子集）
export interface Settings extends AiSettings {
  theme: 'light' | 'dark' | 'system'
  maxResults: number
}

// 应用数据结构（settings 为扩展端 Settings）
export type ExtensionAppData = SharedAppData<Settings>

// 默认设置
export const DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_AI_SETTINGS,
  theme: 'system',
  maxResults: 20
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
    updatedAt: new Date().toISOString()
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
    updatedAt: new Date().toISOString()
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
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prompt_004',
    title: '代码重构',
    content: '请重构以下代码，提高可读性和性能：\n\n{{clipboard}}',
    tags: ['开发', '重构'],
    spaceId: 'space_work',
    variables: [{ name: 'clipboard', type: 'system' }],
    usageCount: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prompt_005',
    title: '总结要点',
    content: '请总结以下内容的要点：\n\n{{clipboard}}',
    tags: ['总结', '分析'],
    spaceId: 'space_default',
    variables: [{ name: 'clipboard', type: 'system' }],
    usageCount: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// 默认应用数据
export const DEFAULT_APP_DATA: ExtensionAppData = {
  version: '1.0.0',
  settings: DEFAULT_SETTINGS,
  spaces: DEFAULT_SPACES,
  prompts: DEFAULT_PROMPTS
}