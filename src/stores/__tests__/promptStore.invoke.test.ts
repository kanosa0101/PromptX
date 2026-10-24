/**
 * promptStore 的 Tauri invoke 路径测试（mock @tauri-apps/api/core）
 * 覆盖：加载/CRUD/输出/导入导出与后端命令的契约
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'
import { usePromptStore } from '../promptStore'
import { useUiStore } from '../uiStore'
import { DEFAULT_SPACES, DEFAULT_PROMPTS } from '@/types'
import type { AppData, ImportResult, Prompt, Space } from '@/types'

// vi.mocked 对泛型 invoke 的可选参数推断不完整，这里显式声明签名
type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
type InvokeMock = ReturnType<typeof vi.fn<InvokeFn>> & { mock: { calls: Array<[string, Record<string, unknown>?]> } }
const mockedInvoke = invoke as unknown as InvokeMock

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
  title: '解释代码',
  content: '请解释：{{clipboard}}',
  tags: [],
  spaceId: 'space_default',
  variables: [],
  usageCount: 0,
  lastUsedAt: null,
  createdAt: '2024-06-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
}

const APP_DATA: AppData = {
  version: '1.0.0',
  settings: {} as AppData['settings'],
  spaces: [SPACE],
  prompts: [PROMPT],
}

function getStore() {
  setActivePinia(createPinia())
  return { store: usePromptStore(), ui: useUiStore() }
}

beforeEach(() => {
  mockedInvoke.mockReset()
})

describe('loadPrompts', () => {
  it('成功时填充 spaces/prompts 并调用 get_app_data', async () => {
    const { store } = getStore()
    mockedInvoke.mockResolvedValue(APP_DATA)

    await store.loadPrompts()

    expect(mockedInvoke).toHaveBeenCalledWith('get_app_data')
    expect(store.spaces).toEqual([SPACE])
    expect(store.prompts).toEqual([PROMPT])
    expect(store.isLoading).toBe(false)
  })

  it('失败时回退到内置默认数据', async () => {
    const { store } = getStore()
    mockedInvoke.mockRejectedValue(new Error('disk error'))

    await store.loadPrompts()

    expect(store.spaces).toEqual(DEFAULT_SPACES)
    expect(store.prompts).toEqual(DEFAULT_PROMPTS)
    expect(store.isLoading).toBe(false)
  })
})

describe('createPrompt / updatePrompt / deletePrompt', () => {
  it('createPrompt 传 PromptInput 并把返回值放入列表', async () => {
    const { store } = getStore()
    const created = { ...PROMPT, id: 'p2', title: '新建' }
    mockedInvoke.mockResolvedValue(created)

    const result = await store.createPrompt({
      title: '新建',
      content: '内容',
      tags: ['a'],
      spaceId: 'space_default',
    })

    expect(mockedInvoke).toHaveBeenCalledWith('create_prompt', {
      prompt: { title: '新建', content: '内容', tags: ['a'], spaceId: 'space_default' },
    })
    expect(result).toEqual(created)
    expect(store.prompts).toContainEqual(created)
  })

  it('updatePrompt 用返回值替换本地条目', async () => {
    const { store } = getStore()
    store.prompts = [PROMPT]
    const updated = { ...PROMPT, title: '新标题' }
    mockedInvoke.mockResolvedValue(updated)

    await store.updatePrompt('p1', { title: '新标题' })

    expect(mockedInvoke).toHaveBeenCalledWith('update_prompt', {
      id: 'p1',
      updates: { title: '新标题' },
    })
    expect(store.prompts[0].title).toBe('新标题')
  })

  it('deletePrompt 调用后端并从列表移除', async () => {
    const { store } = getStore()
    store.prompts = [PROMPT, { ...PROMPT, id: 'p9' }]
    mockedInvoke.mockResolvedValue(undefined)

    await store.deletePrompt('p1')

    expect(mockedInvoke).toHaveBeenCalledWith('delete_prompt', { id: 'p1' })
    expect(store.prompts.map((p) => p.id)).toEqual(['p9'])
  })
})

describe('输出链路', () => {
  it('outputPrompt 用唤醒剪贴板替换变量后调用 paste_and_restore', async () => {
    const { store } = getStore()
    mockedInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_wakeup_clipboard') return '选中的代码'
      return undefined
    })

    await store.outputPrompt(PROMPT)

    expect(mockedInvoke).toHaveBeenCalledWith('paste_and_restore', {
      text: '请解释：选中的代码',
    })
    expect(mockedInvoke).toHaveBeenCalledWith('update_prompt_usage', { id: 'p1' })
  })

  it('get_wakeup_clipboard 失败时按空串处理仍继续输出', async () => {
    const { store } = getStore()
    mockedInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_wakeup_clipboard') throw new Error('boom')
      return undefined
    })

    await store.outputPrompt(PROMPT)

    expect(mockedInvoke).toHaveBeenCalledWith('paste_and_restore', {
      text: '请解释：',
    })
  })

  it('含自定义变量时 selectAndOutput 打开变量表单而不直接输出', async () => {
    const { store, ui } = getStore()
    const withCustom = { ...PROMPT, content: '翻译为{{目标语言}}：{{clipboard}}' }

    await store.selectAndOutput(withCustom)

    expect(ui.showVariableForm).toBe(true)
    expect(ui.currentPrompt?.id).toBe('p1')
    expect(
      mockedInvoke.mock.calls.filter(([cmd]) => cmd === 'paste_and_restore')
    ).toHaveLength(0)
  })

  it('outputWithVariables 合并自定义值并关闭表单', async () => {
    const { store, ui } = getStore()
    ui.openVariableForm({ ...PROMPT, content: '翻译为{{目标语言}}' })
    mockedInvoke.mockResolvedValue(undefined)

    await store.outputWithVariables({ 目标语言: '英语' })

    expect(mockedInvoke).toHaveBeenCalledWith('paste_and_restore', {
      text: '翻译为英语',
    })
    expect(ui.showVariableForm).toBe(false)
  })
})

describe('导入导出', () => {
  it('exportData 返回 get_app_data 结果', async () => {
    const { store } = getStore()
    mockedInvoke.mockResolvedValue(APP_DATA)

    const data = await store.exportData()

    expect(data).toEqual(APP_DATA)
  })

  it('importData 传导入数据与 merge 标志，完成后重载列表', async () => {
    const { store } = getStore()
    const result: ImportResult = {
      importedPrompts: 2,
      importedSpaces: 1,
      skipped: 0,
      conflicts: [],
    }
    const commands: string[] = []
    mockedInvoke.mockImplementation(async (cmd: string) => {
      commands.push(cmd)
      if (cmd === 'import_data') return result
      if (cmd === 'get_app_data') return APP_DATA
      return undefined
    })

    const imported = await store.importData(APP_DATA, true)

    expect(imported).toEqual(result)
    expect(mockedInvoke).toHaveBeenCalledWith('import_data', {
      importData: APP_DATA,
      merge: true,
    })
    expect(commands).toEqual(['import_data', 'get_app_data'])
    expect(store.prompts).toEqual([PROMPT])
  })
})
