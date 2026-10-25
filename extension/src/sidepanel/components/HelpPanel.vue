<template>
  <div class="help-panel p-4 bg-white dark:bg-background-dark">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium text-foreground dark:text-foreground-dark">
        {{ t('help.title') }}
      </h3>
      <button
        class="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark text-foreground dark:text-foreground-dark"
        :aria-label="t('help.closeHelp')"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>

    <!-- 快捷键 -->
    <section class="mb-4">
      <h4 class="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
        {{ t('help.shortcuts') }}
      </h4>
      <div class="space-y-1.5">
        <div
          v-for="item in shortcuts"
          :key="item.keys"
          class="flex items-start justify-between gap-3 text-sm"
        >
          <span class="text-gray-500 dark:text-gray-400">{{ item.desc }}</span>
          <kbd
            class="shrink-0 px-1.5 py-0.5 rounded border border-surface dark:border-surface-dark bg-gray-50 dark:bg-surface-dark text-xs text-foreground dark:text-foreground-dark"
          >{{ item.keys }}</kbd>
        </div>
      </div>
      <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">
        {{ t('help.hotkeyChangeHint') }}
      </p>
    </section>

    <!-- 输出方式 -->
    <section class="mb-4 border-t border-surface dark:border-surface-dark pt-3">
      <h4 class="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
        {{ t('help.outputMethods') }}
      </h4>
      <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
        {{ t('help.outputMethodInsert') }}
      </p>
    </section>

    <!-- AI 优化 -->
    <section class="mb-4 border-t border-surface dark:border-surface-dark pt-3">
      <h4 class="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
        {{ t('help.aiOptimizeSection') }}
      </h4>
      <i18n-t
        keypath="help.outputMethodOptimize"
        tag="p"
        class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed"
      >
        <template #hotkey>
          <kbd class="px-1 rounded border border-surface dark:border-surface-dark text-xs">Alt+Shift+O</kbd>
        </template>
      </i18n-t>
    </section>

    <!-- 数据说明 -->
    <section class="border-t border-surface dark:border-surface-dark pt-3">
      <h4 class="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
        {{ t('help.dataTitle') }}
      </h4>
      <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
        {{ t('help.dataHint') }}
      </p>
    </section>

    <footer class="mt-4 pt-3 border-t border-surface dark:border-surface-dark text-xs text-gray-400 dark:text-gray-500">
      {{ t('help.extVersion', { version: appVersion }) }}
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineEmits<{ close: [] }>()

const appVersion = chrome.runtime.getManifest().version

const shortcuts = [
  { keys: 'Alt+Space', desc: t('help.extOpenPanel') },
  { keys: 'Ctrl+Shift+P', desc: t('help.extOpenPanelAlt') },
  { keys: '↑ / ↓', desc: t('help.extNavigate') },
  { keys: 'Enter', desc: t('help.extOutput') },
  { keys: 'Tab / Shift+Tab', desc: t('help.switchSpace') },
  { keys: 'Ctrl+N', desc: t('help.newPrompt') },
  { keys: 'Esc', desc: t('help.extClearSearch') },
]
</script>

<style scoped>
.help-panel {
  min-height: 100%;
}
</style>
