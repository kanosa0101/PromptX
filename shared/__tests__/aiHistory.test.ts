/**
 * shared/aiHistory.ts 单元测试：历史标题生成与条数上限常量
 */
import { describe, it, expect } from 'vitest'
import { buildHistoryTitle, MAX_AI_HISTORY, AI_HISTORY_SPACE_ID } from '../aiHistory'

describe('buildHistoryTitle', () => {
  it('压缩空白（换行/多空格合并为单个空格）', () => {
    expect(buildHistoryTitle('hello   world\n\nfoo')).toBe('hello world foo')
  })

  it('30 字符以内原样保留', () => {
    expect(buildHistoryTitle('短文本')).toBe('短文本')
  })

  it('超过 30 字符截断并追加省略号', () => {
    const title = buildHistoryTitle('a'.repeat(40))
    expect(title.length).toBe(31)
    expect(title.endsWith('…')).toBe(true)
  })

  it('纯空白输入回退为「未命名优化」', () => {
    expect(buildHistoryTitle('   \n\t ')).toBe('未命名优化')
  })
})

describe('常量', () => {
  it('历史上限为 200（与 Rust 侧 MAX_AI_HISTORY 保持一致）', () => {
    expect(MAX_AI_HISTORY).toBe(200)
  })

  it('导出历史空间 ID', () => {
    expect(typeof AI_HISTORY_SPACE_ID).toBe('string')
    expect(AI_HISTORY_SPACE_ID.length).toBeGreaterThan(0)
  })
})
