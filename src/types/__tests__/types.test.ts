import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SETTINGS,
  DEFAULT_SPACES,
  DEFAULT_PROMPTS,
  type ImportResult,
  type Settings,
  type Space,
  type Prompt,
} from '../index'

describe('DEFAULT_SETTINGS', () => {
  it('has all expected keys', () => {
    const keys = Object.keys(DEFAULT_SETTINGS)
    expect(keys).toContain('globalHotkey')
    expect(keys).toContain('theme')
    expect(keys).toContain('language')
    expect(keys).toContain('windowOpacity')
    expect(keys).toContain('windowPosition')
    expect(keys).toContain('windowSize')
    expect(keys).toContain('autoHide')
    expect(keys).toContain('searchDebounce')
    expect(keys).toContain('maxResults')
    expect(keys).toContain('launchAtLogin')
  })

  it('has expected default values', () => {
    expect(DEFAULT_SETTINGS.globalHotkey).toBe('Alt+Space')
    expect(DEFAULT_SETTINGS.theme).toBe('system')
    expect(DEFAULT_SETTINGS.language).toBe('zh-CN')
    expect(DEFAULT_SETTINGS.windowOpacity).toBe(0.95)
    expect(DEFAULT_SETTINGS.windowPosition).toBeNull()
    expect(DEFAULT_SETTINGS.windowSize).toEqual({ width: 600, height: 400 })
    expect(DEFAULT_SETTINGS.autoHide).toBe(true)
    expect(DEFAULT_SETTINGS.searchDebounce).toBe(300)
    expect(DEFAULT_SETTINGS.maxResults).toBe(6)
    expect(DEFAULT_SETTINGS.launchAtLogin).toBe(false)
  })

  it('conforms to the Settings interface', () => {
    const settings: Settings = DEFAULT_SETTINGS
    expect(settings).toBeDefined()
  })
})

describe('DEFAULT_SPACES', () => {
  it('has correct structure with 3 spaces', () => {
    expect(DEFAULT_SPACES).toHaveLength(3)
  })

  it('each space has required fields', () => {
    DEFAULT_SPACES.forEach((space: Space) => {
      expect(space).toHaveProperty('id')
      expect(space).toHaveProperty('name')
      expect(space).toHaveProperty('icon')
      expect(space).toHaveProperty('color')
      expect(space).toHaveProperty('order')
      expect(space).toHaveProperty('createdAt')
      expect(space).toHaveProperty('updatedAt')
    })
  })

  it('has expected space IDs', () => {
    const ids = DEFAULT_SPACES.map((s) => s.id)
    expect(ids).toContain('space_default')
    expect(ids).toContain('space_work')
    expect(ids).toContain('space_personal')
  })

  it('spaces are ordered 0, 1, 2', () => {
    const orders = DEFAULT_SPACES.map((s) => s.order)
    expect(orders).toEqual([0, 1, 2])
  })
})

describe('DEFAULT_PROMPTS', () => {
  it('has correct structure with sample prompts', () => {
    expect(DEFAULT_PROMPTS.length).toBeGreaterThanOrEqual(2)
  })

  it('each prompt has required fields', () => {
    DEFAULT_PROMPTS.forEach((prompt: Prompt) => {
      expect(prompt).toHaveProperty('id')
      expect(prompt).toHaveProperty('title')
      expect(prompt).toHaveProperty('content')
      expect(prompt).toHaveProperty('tags')
      expect(prompt).toHaveProperty('spaceId')
      expect(prompt).toHaveProperty('variables')
      expect(prompt).toHaveProperty('usageCount')
      expect(prompt).toHaveProperty('lastUsedAt')
      expect(prompt).toHaveProperty('createdAt')
      expect(prompt).toHaveProperty('updatedAt')
    })
  })

  it('has expected prompt IDs', () => {
    const ids = DEFAULT_PROMPTS.map((p) => p.id)
    expect(ids).toContain('prompt_001')
    expect(ids).toContain('prompt_002')
  })

  it('prompts reference valid space IDs', () => {
    const spaceIds = DEFAULT_SPACES.map((s) => s.id)
    DEFAULT_PROMPTS.forEach((prompt: Prompt) => {
      expect(spaceIds).toContain(prompt.spaceId)
    })
  })
})

describe('ImportResult interface', () => {
  it('can create a valid ImportResult object', () => {
    const result: ImportResult = {
      importedPrompts: 5,
      importedSpaces: 2,
      skipped: 1,
      conflicts: ['prompt_001'],
    }
    expect(result.importedPrompts).toBe(5)
    expect(result.importedSpaces).toBe(2)
    expect(result.skipped).toBe(1)
    expect(result.conflicts).toEqual(['prompt_001'])
  })

  it('ImportResult can have empty conflicts array', () => {
    const result: ImportResult = {
      importedPrompts: 3,
      importedSpaces: 1,
      skipped: 0,
      conflicts: [],
    }
    expect(result.conflicts).toEqual([])
  })
})
