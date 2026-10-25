import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SETTINGS,
  type ImportResult,
  type Settings,
} from '../index'

describe('DEFAULT_SETTINGS', () => {
  it('has all expected keys', () => {
    const keys = Object.keys(DEFAULT_SETTINGS)
    expect(keys).toContain('globalHotkey')
    expect(keys).toContain('theme')
    expect(keys).toContain('language')
    expect(keys).toContain('windowOpacity')
    expect(keys).toContain('windowPosition')
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
