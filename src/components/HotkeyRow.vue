<script setup lang="ts">
import { useI18n } from 'vue-i18n'
/**
 * 快捷键设置行：展示当前快捷键，点击进入捕获态（由父组件处理按键监听）
 */
const { t } = useI18n()

defineProps<{
  label: string
  hotkey: string
  capturing: boolean
  hint?: string
}>()

const emit = defineEmits<{ start: []; cancel: [] }>()
</script>

<template>
  <div
    class="setting-item flex items-center justify-between py-1.5"
    :title="hint"
  >
    <span class="setting-label text-sm text-foreground dark:text-foreground-dark">{{ label }}</span>
    <button
      v-if="!capturing"
      class="px-3 py-1.5 rounded border border-surface dark:border-surface-dark text-sm bg-transparent hover:bg-surface dark:hover:bg-surface-dark text-foreground dark:text-foreground-dark w-24"
      @click="emit('start')"
    >
      {{ hotkey }}
    </button>
    <button
      v-else
      class="px-3 py-1.5 rounded border border-primary text-sm bg-primary/10 text-primary w-24 animate-pulse"
      @click="emit('cancel')"
    >
      {{ t('common.cancel') }}
    </button>
  </div>
</template>
