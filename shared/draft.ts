/**
 * 提示词编辑器草稿（双端共用）
 *
 * 编辑过程中持续写入 localStorage，意外关闭（Esc/失焦/窗口销毁）后
 * 再次打开同一提示词（或新建）时恢复，保存成功或主动丢弃后清除。
 * 草稿按提示词 ID 隔离；新建提示词共用固定 ID 'new'。
 */

export interface EditorDraft {
  title: string
  content: string
  tags: string[]
  spaceId: string
  savedAt: number
}

const PREFIX = 'promptx-editor-draft:'

/** 读取草稿；无草稿或数据损坏时返回 null（草稿是增强功能，损坏时静默放弃） */
export function loadDraft(id: string): EditorDraft | null {
  try {
    const raw = localStorage.getItem(PREFIX + id)
    if (!raw) return null
    const draft = JSON.parse(raw) as Partial<EditorDraft>
    return {
      title: typeof draft.title === 'string' ? draft.title : '',
      content: typeof draft.content === 'string' ? draft.content : '',
      tags: Array.isArray(draft.tags) ? draft.tags : [],
      spaceId: typeof draft.spaceId === 'string' ? draft.spaceId : '',
      savedAt: typeof draft.savedAt === 'number' ? draft.savedAt : 0,
    }
  } catch {
    return null
  }
}

/** 保存草稿（尽力而为：localStorage 不可用时静默降级） */
export function saveDraft(id: string, draft: Omit<EditorDraft, 'savedAt'>): void {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    // 隐私模式等场景 localStorage 可能不可用，草稿功能静默降级
  }
}

/** 清除草稿（保存成功或主动丢弃时调用） */
export function clearDraft(id: string): void {
  try {
    localStorage.removeItem(PREFIX + id)
  } catch {
    // 同上：不可用时无需处理
  }
}
