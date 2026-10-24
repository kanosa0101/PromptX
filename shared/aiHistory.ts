/**
 * AI 优化历史（桌面端 + 浏览器扩展端共用约定）
 *
 * 注意：桌面端 Rust（src-tauri/src/commands/ai.rs）有一份行为等价的实现，
 * 跨语言无法直接共享，修改此处时需同步更新 Rust 版本。
 */
import { AI_HISTORY_SPACE_ID } from './types'

export { AI_HISTORY_SPACE_ID }

/** 「AI 优化」历史空间条数上限（防止数据无限膨胀） */
export const MAX_AI_HISTORY = 200

/** 历史标题长度上限（按 Unicode 字符计） */
const TITLE_MAX_CHARS = 30

/**
 * 由原文生成历史条目标题：压缩空白后取前 30 字符，超长追加省略号，
 * 空文本回退为「未命名优化」（与 Rust 侧行为保持一致）
 */
export function buildHistoryTitle(original: string): string {
  const flattened = original.split(/\s+/).filter(Boolean).join(' ')
  const chars = Array.from(flattened)
  let title = chars.slice(0, TITLE_MAX_CHARS).join('')
  if (chars.length > TITLE_MAX_CHARS) title += '…'
  return title || '未命名优化'
}
