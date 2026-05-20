<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'

const settingsStore = useSettingsStore()

const hotkey = computed(() => settingsStore.globalHotkey || 'Alt+Space')
</script>

<template>
  <div class="status-bar flex items-center justify-center gap-3 px-4 py-2 text-xs text-[#71717A] border-t border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#1A1A2E]">
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