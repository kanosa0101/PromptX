<!--
  AI 优化结果预览面板（桌面端 + 扩展端共用）
  optimizePreview 设置开启时，优化结果先在此流式展示，用户确认后再应用：
  选区模式 → 替换原位；剪贴板模式 → 写回剪贴板
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  text: string
  streaming: boolean
  mode: 'selection' | 'clipboard'
}>()

const emit = defineEmits<{
  apply: []
  cancel: []
}>()
</script>

<template>
  <div class="p-4 bg-white dark:bg-background-dark text-foreground dark:text-foreground-dark">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-base font-medium">
        {{ t('optimizePreview.title') }}
      </h3>
      <span
        v-if="streaming"
        class="text-xs text-muted animate-pulse"
      >{{ t('optimizePreview.streaming') }}</span>
    </div>

    <div class="text-sm whitespace-pre-wrap break-words max-h-64 overflow-y-auto rounded p-3 bg-surface-soft-light dark:bg-surface-dark">
      {{ text }}<span
        v-if="streaming"
        class="animate-pulse"
      >▍</span>
    </div>

    <div class="flex justify-end gap-2 mt-3">
      <button
        class="btn btn-secondary"
        @click="emit('cancel')"
      >
        {{ t('optimizePreview.cancel') }}
      </button>
      <button
        class="btn btn-primary"
        :disabled="streaming || !text"
        @click="emit('apply')"
      >
        {{ mode === 'clipboard' ? t('optimizePreview.applyClipboard') : t('optimizePreview.apply') }}
      </button>
    </div>
  </div>
</template>
