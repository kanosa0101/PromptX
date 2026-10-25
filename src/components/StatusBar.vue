<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settingsStore'

const { t } = useI18n()
const settingsStore = useSettingsStore()

const hotkey = computed(() => settingsStore.globalHotkey || 'Alt+Space')
</script>

<template>
  <div
    class="status-bar flex items-center justify-center gap-3 px-4 py-2 text-xs text-muted border-t border-surface dark:border-surface-dark bg-white dark:bg-background-dark"
    role="status"
  >
    <span>{{ t('statusBar.wake', { hotkey }) }}</span>
    <span>|</span>
    <span>{{ t('statusBar.new') }}</span>
    <span>|</span>
    <span>{{ t('statusBar.edit') }}</span>
    <span>|</span>
    <span>{{ t('statusBar.delete') }}</span>
    <span>|</span>
    <span>{{ t('statusBar.switch') }}</span>
    <span>|</span>
    <span>{{ t('statusBar.output') }}</span>
  </div>
</template>
