/**
 * PromptX 桌面端类型定义（共享类型见 shared/types.ts）
 */
import type { AiSettings } from '@shared/types'
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
// （桌面端默认空间/提示词由 Rust 侧 AppData::default() 生成，前端不再维护种子数据）
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
