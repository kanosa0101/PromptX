<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'

const settingsStore = useSettingsStore()

const hotkey = computed(() => settingsStore.globalHotkey || 'Alt+Space')
</script>

<template>
  <div
    class="status-bar flex items-center justify-center gap-3 px-4 py-2 text-xs text-muted border-t border-surface dark:border-surface-dark bg-white dark:bg-background-dark"
    role="status"
  >
    <span>{{ hotkey }} 唤醒</span>
    <span>|</span>
    <span>Ctrl+N 新建</span>
    <span>|</span>
    <span>Ctrl+E 编辑</span>
    <span>|</span>
    <span>Ctrl+D 删除</span>
    <span>|</span>
    <span>Tab 切换</span>
    <span>|</span>
    <span>Enter 输出</span>
  </div>
</template>