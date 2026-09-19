import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import type { Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    theme: 'system' as 'light' | 'dark' | 'system',
    globalHotkey: 'Alt+Space',
    language: 'zh-CN',
    windowOpacity: 0.95,
    windowPosition: null as { x: number; y: number } | null,
    windowSize: { width: 600, height: 400 },
    autoHide: true,
    searchDebounce: 300,
    maxResults: 6,
    launchAtLogin: false,
    aiBaseUrl: 'https://api.deepseek.com',
    aiApiKey: '',
    aiModel: 'deepseek-chat',
    optimizeTemplate: DEFAULT_SETTINGS.optimizeTemplate,
    optimizeHotkey: 'Ctrl+Alt+O',
  }),

  actions: {
    async loadSettings() {
      try {
        const settings = await invoke<Settings>('get_settings')
        this.$patch(settings)
        this.applyTheme()
      } catch (error) {
        console.error('Failed to load settings:', error)
        this.$patch(DEFAULT_SETTINGS)
        this.applyTheme()
      }
    },

    async updateSettings(updates: Partial<Settings>) {
      try {
        // 后端 update_settings 要求完整 Settings 对象（整体替换），必须先合并出全量
        const full: Settings = { ...this.$state, ...updates }
        await invoke('update_settings', { settings: full })
        this.$patch(updates)

        if (updates.theme) {
          this.applyTheme()
        }
      } catch (error) {
        console.error('Failed to update settings:', error)
        throw error
      }
    },

    async changeHotkey(newHotkey: string) {
      try {
        await this.updateSettings({ globalHotkey: newHotkey })
      } catch (error) {
        console.error('Failed to change hotkey:', error)
        throw error
      }
    },

    applyTheme() {
      const isDark =
        this.theme === 'dark' ||
        (this.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

      document.documentElement.classList.toggle('dark', isDark)
    },

    setTheme(theme: 'light' | 'dark' | 'system') {
      this.updateSettings({ theme })
    },

    setWindowOpacity(opacity: number) {
      this.updateSettings({ windowOpacity: opacity })
    },

    setAutoHide(enabled: boolean) {
      this.updateSettings({ autoHide: enabled })
    },

    setLaunchAtLogin(enabled: boolean) {
      this.updateSettings({ launchAtLogin: enabled })
    },
  },
})
