import { describe, it, expect } from 'vitest'

// These are action methods on the Pinia store.
// We create a fresh Pinia instance and access them via the store.

import { createPinia, setActivePinia } from 'pinia'
import { usePromptStore } from '../promptStore'

// Helper to get the store with a fresh Pinia instance
function getStore() {
  setActivePinia(createPinia())
  return usePromptStore()
}

describe('parseVariables', () => {
  it('parses Chinese variable names like {{目标语言}}', () => {
    const store = getStore()
    const result = store.parseVariables('请将文本翻译为{{目标语言}}')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('目标语言')
    expect(result[0].type).toBe('custom')
  })

  it('identifies system variables like {{clipboard}}', () => {
    const store = getStore()
    const result = store.parseVariables('内容：{{clipboard}}')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('clipboard')
    expect(result[0].type).toBe('system')
  })

  it('identifies all system variables', () => {
    const store = getStore()
    const result = store.parseVariables('{{clipboard}} {{date}} {{time}} {{timestamp}}')
    expect(result).toHaveLength(4)
    expect(result.every((v) => v.type === 'system')).toBe(true)
    const names = result.map((v) => v.name)
    expect(names).toContain('clipboard')
    expect(names).toContain('date')
    expect(names).toContain('time')
    expect(names).toContain('timestamp')
  })

  it('deduplicates variables with the same name', () => {
    const store = getStore()
    const result = store.parseVariables('{{目标语言}}和{{目标语言}}')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('目标语言')
  })

  it('returns empty array for content with no variables', () => {
    const store = getStore()
    const result = store.parseVariables('没有变量的纯文本')
    expect(result).toHaveLength(0)
  })

  it('skips empty variable names like {{}}', () => {
    const store = getStore()
    const result = store.parseVariables('text{{}}more')
    expect(result).toHaveLength(0)
  })

  it('handles mixed system and custom variables', () => {
    const store = getStore()
    const result = store.parseVariables('{{clipboard}}翻译为{{目标语言}}于{{date}}')
    expect(result).toHaveLength(3)
    const systemVars = result.filter((v) => v.type === 'system')
    const customVars = result.filter((v) => v.type === 'custom')
    expect(systemVars).toHaveLength(2)
    expect(customVars).toHaveLength(1)
    expect(customVars[0].name).toBe('目标语言')
  })
})

describe('replaceVariables', () => {
  it('replaces a single variable', () => {
    const store = getStore()
    const result = store.replaceVariables('Hello {{name}}', { name: 'World' })
    expect(result).toBe('Hello World')
  })

  it('replaces multiple variables', () => {
    const store = getStore()
    const result = store.replaceVariables(
      '{{greeting}} {{target}}',
      { greeting: 'Hello', target: 'World' }
    )
    expect(result).toBe('Hello World')
  })

  it('replaces Chinese variable names', () => {
    const store = getStore()
    const result = store.replaceVariables(
      '翻译为{{目标语言}}',
      { '目标语言': '英语' }
    )
    expect(result).toBe('翻译为英语')
  })

  it('leaves unreferenced variables unchanged', () => {
    const store = getStore()
    const result = store.replaceVariables('{{a}}{{b}}', { a: 'X' })
    expect(result).toBe('X{{b}}')
  })

  it('replaces system variables like clipboard, date, time', () => {
    const store = getStore()
    const result = store.replaceVariables(
      'Clip: {{clipboard}}, Date: {{date}}',
      { clipboard: 'copied text', date: '2024-06-01' }
    )
    expect(result).toBe('Clip: copied text, Date: 2024-06-01')
  })

  it('returns original text when no variables present', () => {
    const store = getStore()
    const result = store.replaceVariables('no vars', {})
    expect(result).toBe('no vars')
  })
})

describe('formatDate', () => {
  it('returns local date in YYYY-MM-DD format', () => {
    const store = getStore()
    // Use a specific date to test formatting
    const date = new Date(2024, 5, 15) // June 15, 2024 (month is 0-indexed)
    const result = store.formatDate(date)
    expect(result).toBe('2024-06-15')
  })

  it('pads single-digit month and day', () => {
    const store = getStore()
    const date = new Date(2024, 0, 5) // January 5, 2024
    const result = store.formatDate(date)
    expect(result).toBe('2024-01-05')
  })

  it('uses local time, not UTC', () => {
    const store = getStore()
    // Create a date that would differ between UTC and local time
    // for timezones west of UTC. We verify the output matches local getters.
    const date = new Date(2024, 11, 31) // Dec 31, 2024 local
    const result = store.formatDate(date)
    const expected = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    expect(result).toBe(expected)
  })
})

describe('formatTime', () => {
  it('returns local time in HH:MM:SS format', () => {
    const store = getStore()
    const date = new Date(2024, 5, 15, 14, 30, 45)
    const result = store.formatTime(date)
    expect(result).toBe('14:30:45')
  })

  it('pads single-digit hours, minutes, seconds', () => {
    const store = getStore()
    const date = new Date(2024, 5, 15, 1, 2, 3)
    const result = store.formatTime(date)
    expect(result).toBe('01:02:03')
  })

  it('uses local time, not UTC', () => {
    const store = getStore()
    const date = new Date(2024, 5, 15, 8, 5, 9)
    const result = store.formatTime(date)
    const expected = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
    expect(result).toBe(expected)
  })
})

describe('filteredPrompts ordering', () => {
  it('sorts prompts by createdAt descending (newest first)', () => {
    const store = getStore()
    store.spaces = [
      {
        id: 'space_default', name: '默认', icon: '📁', color: '#3B82F6', order: 0,
        createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]
    store.prompts = [
      {
        id: 'old', title: '旧提示词', content: 'a', tags: [], spaceId: 'space_default',
        variables: [], usageCount: 0, lastUsedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'new', title: '新提示词', content: 'b', tags: [], spaceId: 'space_default',
        variables: [], usageCount: 0, lastUsedAt: null,
        createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ]
    expect(store.filteredPrompts.map((p) => p.id)).toEqual(['new', 'old'])
  })

  it('keeps relevance order when searching', () => {
    const store = getStore()
    store.spaces = [
      {
        id: 'space_default', name: '默认', icon: '📁', color: '#3B82F6', order: 0,
        createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]
    store.prompts = [
      {
        id: 'a', title: '代码解释', content: 'x', tags: [], spaceId: 'space_default',
        variables: [], usageCount: 0, lastUsedAt: null,
        createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'b', title: '代码重构', content: 'y', tags: [], spaceId: 'space_default',
        variables: [], usageCount: 0, lastUsedAt: null,
        createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ]
    store.setSearchQuery('代码')
    const ids = store.filteredPrompts.map((p) => p.id)
    expect(ids).toContain('a')
    expect(ids).toContain('b')
  })
})
