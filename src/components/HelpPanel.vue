<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settingsStore'

const { t } = useI18n()

// 字面量变量示例（不能写进 mustache 表达式内：模板扫描 }} 时不识别字符串字面量）
const targetLanguageVar = '{{目标语言}}'

const emit = defineEmits<{
  close: []
}>()

// 快捷键可自定义，帮助文案从设置读取（与状态栏一致）
const settingsStore = useSettingsStore()

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div class="help-panel p-4 bg-white dark:bg-background-dark overflow-y-auto max-h-[400px] text-foreground dark:text-foreground-dark">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium">
        {{ t('help.title') }}
      </h3>
      <button
        class="icon-btn p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        @click="handleClose"
      >
        ✕
      </button>
    </div>

    <!-- 快捷键 -->
    <div class="mb-4">
      <h4 class="text-sm font-medium mb-2 text-primary">
        {{ t('help.shortcuts') }}
      </h4>
      <div class="space-y-1 text-sm">
        <div class="flex justify-between">
          <span class="text-muted">{{ t('help.togglePanel') }}</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">{{ settingsStore.globalHotkey }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('help.newPrompt') }}</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">Ctrl + N</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('help.openSettings') }}</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">Ctrl + ,</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('help.switchSpace') }}</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">Tab</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('help.navigate') }}</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">↑ / ↓</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('help.output') }}</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">Enter</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('help.closePanel') }}</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">Esc</span>
        </div>
      </div>
    </div>

    <!-- 变量语法 -->
    <div class="mb-4">
      <h4 class="text-sm font-medium mb-2 text-primary">
        {{ t('help.variableSyntax') }}
      </h4>
      <p class="text-xs text-muted mb-2">
        <i18n-t
          keypath="help.variableSyntaxHint"
          tag="span"
        >
          <template #syntax>
            <code
              v-pre
              class="bg-surface dark:bg-surface-dark px-1 rounded"
            >{{变量名}}</code>
          </template>
        </i18n-t>
      </p>
      <div class="space-y-1 text-sm">
        <div class="flex justify-between items-center">
          <span class="text-muted">{{ t('help.clipboardVar') }}</span>
          <code
            v-pre
            class="bg-surface dark:bg-surface-dark px-2 py-0.5 rounded text-xs"
          >{{clipboard}}</code>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-muted">{{ t('help.dateVar') }}</span>
          <code
            v-pre
            class="bg-surface dark:bg-surface-dark px-2 py-0.5 rounded text-xs"
          >{{date}}</code>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-muted">{{ t('help.timeVar') }}</span>
          <code
            v-pre
            class="bg-surface dark:bg-surface-dark px-2 py-0.5 rounded text-xs"
          >{{time}}</code>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-muted">{{ t('help.timestampVar') }}</span>
          <code
            v-pre
            class="bg-surface dark:bg-surface-dark px-2 py-0.5 rounded text-xs"
          >{{timestamp}}</code>
        </div>
      </div>
      <p class="text-xs text-muted mt-2">
        <i18n-t
          keypath="help.customVarHint"
          tag="span"
        >
          <template #example>
            <code
              v-pre
              class="bg-surface dark:bg-surface-dark px-1 rounded"
            >{{项目名}}</code>
          </template>
        </i18n-t>
      </p>
    </div>

    <!-- 使用流程 -->
    <div class="mb-4">
      <h4 class="text-sm font-medium mb-2 text-primary">
        {{ t('help.basicFlow') }}
      </h4>
      <div class="space-y-2 text-sm">
        <div class="flex gap-2 items-start">
          <span class="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">1</span>
          <span class="text-muted">
            <i18n-t
              keypath="help.flowOpen"
              tag="span"
            >
              <template #hotkey>
                <code class="bg-surface dark:bg-surface-dark px-1 rounded">{{ settingsStore.globalHotkey }}</code>
              </template>
            </i18n-t>
          </span>
        </div>
        <div class="flex gap-2 items-start">
          <span class="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">2</span>
          <span class="text-muted">{{ t('help.flowSearch') }}</span>
        </div>
        <div class="flex gap-2 items-start">
          <span class="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">3</span>
          <span class="text-muted">
            <i18n-t
              keypath="help.flowSelect"
              tag="span"
            >
              <template #key>
                <code class="bg-surface dark:bg-surface-dark px-1 rounded">Enter</code>
              </template>
            </i18n-t>
          </span>
        </div>
        <div class="flex gap-2 items-start">
          <span class="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">4</span>
          <span class="text-muted">{{ t('help.flowPaste') }}</span>
        </div>
      </div>
    </div>

    <!-- 示例 -->
    <div class="mb-4">
      <h4 class="text-sm font-medium mb-2 text-primary">
        {{ t('help.examples') }}
      </h4>
      <div class="bg-surface-soft-light dark:bg-surface-dark rounded p-3 text-sm">
        <p class="font-medium mb-1">
          {{ t('help.exampleCodeTitle') }}
        </p>
        <p class="text-muted text-xs leading-relaxed">
          {{ t('help.exampleCodeContent') }}<br>
          <code
            v-pre
            class="bg-surface dark:bg-surface-hover-dark px-1 rounded mt-1 inline-block"
          >{{clipboard}}</code>
        </p>
      </div>
      <div class="bg-surface-soft-light dark:bg-surface-dark rounded p-3 text-sm mt-2">
        <p class="font-medium mb-1">
          {{ t('help.exampleTranslateTitle') }}
        </p>
        <p class="text-muted text-xs leading-relaxed">
          {{ t('help.exampleTranslateContent', { language: targetLanguageVar }) }}<br>
          <code
            v-pre
            class="bg-surface dark:bg-surface-hover-dark px-1 rounded mt-1 inline-block"
          >{{clipboard}}</code>
        </p>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="text-xs text-muted text-center pt-2 border-t border-surface dark:border-surface-dark">
      {{ t('help.footerHint') }}
    </div>
  </div>
</template>