import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import type { Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    theme: 'system' as 'light' | 'dark' | 'system',
    globalHotkey: 'Alt+Space',
    windowOpacity: 0.95,
    autoHide: true,
    showInDock: false,
    launchAtLogin: false,
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
        await invoke('update_settings', { settings: updates })
        this.$patch(updates)

        if (updates.theme) {
          this.applyTheme()
        }

        if (updates.globalHotkey) {
          await this.changeHotkey(updates.globalHotkey)
        }
      } catch (error) {
        console.error('Failed to update settings:', error)
        throw error
      }
    },

    async changeHotkey(newHotkey: string) {
      // 当前版本仅保存设置，修改需重启应用生效
      this.globalHotkey = newHotkey
      await this.updateSettings({ globalHotkey: newHotkey })
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

    setShowInDock(enabled: boolean) {
      this.updateSettings({ showInDock: enabled })
    },

    setLaunchAtLogin(enabled: boolean) {
      this.updateSettings({ launchAtLogin: enabled })
    },
  },
})