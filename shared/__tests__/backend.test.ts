/**
 * Backend adapter 契约测试（design.md Step 3）
 * 两端实现必须满足同一接口语义；用内存 fake 验证 desktop 工厂的映射
 */
import { describe, it, expect, vi } from 'vitest'
import { createDesktopBackend, type PromptBackend } from '../backend'
import type { AppData, Prompt, Space } from '../types'

function makeInvokeMock() {
  const responses = new Map<string, unknown>()
  const invoke = vi.fn(async (cmd: string, _args?: Record<string, unknown>) => {
    if (!responses.has(cmd)) throw new Error(`no response for ${cmd}`)
    return responses.get(cmd)
  })
  return { invoke, responses }
}

const SPACE: Space = {
  id: 'space_default',
  name: '默认',
  icon: '📁',
  color: '#3B82F6',
  order: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

const PROMPT: Prompt = {
  id: 'p1',
  title: '标题',
  content: '内容',
  tags: [],
  spaceId: 'space_default',
  variables: [],
  usageCount: 0,
  lastUsedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

const APP_DATA: AppData = {
  version: '1.0.0',
  settings: {},
  spaces: [SPACE],
  prompts: [PROMPT],
}

describe('createDesktopBackend', () => {
  it('loadAppData → get_app_data', async () => {
    const { invoke, responses } = makeInvokeMock()
    responses.set('get_app_data', APP_DATA)
    const backend = createDesktopBackend(invoke)
    expect(await backend.loadAppData()).toEqual(APP_DATA)
  })

  it('CRUD 命令名与参数契约', async () => {
    const { invoke, responses } = makeInvokeMock()
    responses.set('create_prompt', PROMPT)
    responses.set('update_prompt', PROMPT)
    responses.set('reorder_spaces', [SPACE])
    responses.set('import_data', { importedPrompts: 1, importedSpaces: 0, skipped: 0, conflicts: [] })
    const backend: PromptBackend = createDesktopBackend(invoke)

    await backend.createPrompt({ title: 't', content: 'c', tags: [], spaceId: 's' })
    expect(invoke).toHaveBeenCalledWith('create_prompt', {
      prompt: { title: 't', content: 'c', tags: [], spaceId: 's' },
    })

    await backend.updatePrompt('p1', { favorite: true })
    expect(invoke).toHaveBeenCalledWith('update_prompt', { id: 'p1', updates: { favorite: true } })

    await backend.reorderSpaces(['b', 'a'])
    expect(invoke).toHaveBeenCalledWith('reorder_spaces', { spaceIds: ['b', 'a'] })

    await backend.importData(APP_DATA, true)
    expect(invoke).toHaveBeenCalledWith('import_data', { importData: APP_DATA, merge: true })
  })

  it('outputText → paste_and_restore 并返回 inserted', async () => {
    const { invoke, responses } = makeInvokeMock()
    responses.set('paste_and_restore', null)
    const backend = createDesktopBackend(invoke)
    const result = await backend.outputText('文本')
    expect(result).toBe('inserted')
    expect(invoke).toHaveBeenCalledWith('paste_and_restore', { text: '文本' })
  })

  it('getPageSelection 失败时返回空串（不抛错）', async () => {
    const { invoke } = makeInvokeMock()
    const backend = createDesktopBackend(invoke)
    expect(await backend.getPageSelection()).toBe('')
  })
})
