import { describe, it, expect, beforeEach } from 'vitest'
import { loadDraft, saveDraft, clearDraft } from '../draft'

describe('编辑器草稿', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('保存后可读取，savedAt 为保存时间', () => {
    const before = Date.now()
    saveDraft('p1', { title: '标题', content: '内容', tags: ['a', 'b'], spaceId: 'space_work' })
    const draft = loadDraft('p1')
    expect(draft).not.toBeNull()
    expect(draft!.title).toBe('标题')
    expect(draft!.content).toBe('内容')
    expect(draft!.tags).toEqual(['a', 'b'])
    expect(draft!.spaceId).toBe('space_work')
    expect(draft!.savedAt).toBeGreaterThanOrEqual(before)
  })

  it('无草稿时返回 null', () => {
    expect(loadDraft('none')).toBeNull()
  })

  it('清除后返回 null', () => {
    saveDraft('p1', { title: 't', content: 'c', tags: [], spaceId: 's' })
    clearDraft('p1')
    expect(loadDraft('p1')).toBeNull()
  })

  it('不同 ID 的草稿互不干扰', () => {
    saveDraft('p1', { title: '一', content: 'c', tags: [], spaceId: 's' })
    saveDraft('p2', { title: '二', content: 'c', tags: [], spaceId: 's' })
    clearDraft('p1')
    expect(loadDraft('p1')).toBeNull()
    expect(loadDraft('p2')!.title).toBe('二')
  })

  it('损坏的 JSON 返回 null 而非抛错', () => {
    localStorage.setItem('promptx-editor-draft:bad', '{not valid json')
    expect(loadDraft('bad')).toBeNull()
  })

  it('字段缺失或类型异常时回退安全默认值', () => {
    localStorage.setItem('promptx-editor-draft:x', JSON.stringify({ title: 't' }))
    const draft = loadDraft('x')!
    expect(draft.title).toBe('t')
    expect(draft.content).toBe('')
    expect(draft.tags).toEqual([])
    expect(draft.spaceId).toBe('')
    expect(draft.savedAt).toBe(0)
  })
})
