/**
 * PromptX 桌面端类型定义（共享类型见 shared/types.ts）
 */
import type { AiSettings, Prompt, Space, Variable } from '@shared/types'
import { DEFAULT_AI_SETTINGS } from '@shared/types'

// 共享类型：Variable / Prompt / Space / MatchResult / SearchResult /
// SystemVariableName / AppData / AI 常量 / AiSettings
export * from '@shared/types'

// 窗口位置
export interface Position {
  x: number
  y: number
}

// 窗口尺寸
// 设置模型（桌面端：窗口行为 + AI 公共子集）
export interface Settings extends AiSettings {
  globalHotkey: string
  theme: 'light' | 'dark' | 'system'
  language: string
  windowOpacity: number
  windowPosition: Position | null
  autoHide: boolean
  searchDebounce: number
  maxResults: number
  launchAtLogin: boolean
  // AI 优化全局快捷键（松开触发）
  optimizeHotkey: string
  // 优化结果预览确认：开启后优化完成先展示结果，确认后再替换
  optimizePreview: boolean
  // 剪贴板优化快捷键（优化剪贴板内容并写回）
  clipboardOptimizeHotkey: string
}

// 应用数据结构
export type AppData = import('@shared/types').AppData<Settings>

// 快捷键注册状态
export interface HotkeyStatus {
  name: string
  hotkey: string
  ok: boolean
}

// 导入结果（单源在 shared/types.ts）
export type { ImportResult } from '@shared/types'

// 创建提示词输入（单源在 shared/types.ts）
export type { PromptInput } from '@shared/types'

// 默认设置
export const DEFAULT_SETTINGS: Settings = {
  globalHotkey: 'Alt+Space',
  theme: 'system',
  language: 'zh-CN',
  windowOpacity: 0.95,
  windowPosition: null,
  autoHide: true,
  searchDebounce: 300,
  maxResults: 6,
  launchAtLogin: false,
  ...DEFAULT_AI_SETTINGS,
  optimizeHotkey: 'Ctrl+Alt+O',
  clipboardOptimizeHotkey: 'Ctrl+Shift+B',
  optimizePreview: false,
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
    variables: [{ name: 'clipboard', type: 'system' }] as Variable[],
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
    variables: [{ name: 'clipboard', type: 'system' }] as Variable[],
    usageCount: 0,
    lastUsedAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
]
