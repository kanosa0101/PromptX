<template>
  <div class="settings-panel p-4 bg-white dark:bg-background-dark">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium text-foreground dark:text-foreground-dark">
        {{ t('common.settings') }}
      </h3>
      <button
        class="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark text-foreground dark:text-foreground-dark"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>

    <!-- 主题设置 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-foreground dark:text-foreground-dark">{{ t('theme.label') }}</span>
      <select
        v-model="theme"
        class="px-3 py-1.5 rounded border border-surface dark:border-surface-dark text-sm bg-transparent text-foreground dark:text-foreground-dark"
        @change="saveTheme"
      >
        <option value="light">
          {{ t('theme.light') }}
        </option>
        <option value="dark">
          {{ t('theme.dark') }}
        </option>
        <option value="system">
          {{ t('theme.system') }}
        </option>
      </select>
    </div>

    <!-- 语言 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-foreground dark:text-foreground-dark">{{ t('common.language') }}</span>
      <select
        v-model="language"
        class="px-3 py-1.5 rounded border border-surface dark:border-surface-dark text-sm bg-transparent text-foreground dark:text-foreground-dark"
        @change="saveLanguage"
      >
        <option value="system">
          {{ t('language.system') }}
        </option>
        <option value="zh-CN">
          中文
        </option>
        <option value="en">
          English
        </option>
      </select>
    </div>

    <!-- 最大结果数 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-foreground dark:text-foreground-dark">{{ t('settings.maxResults') }}</span>
      <input
        v-model.number="maxResults"
        type="number"
        min="5"
        max="50"
        class="px-3 py-1.5 rounded border border-surface dark:border-surface-dark text-sm bg-transparent w-16 text-foreground dark:text-foreground-dark"
        @change="saveSettings"
      >
    </div>

    <!-- AI 优化设置 -->
    <div class="border-t border-surface dark:border-surface-dark pt-4 mt-4">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-medium text-foreground dark:text-foreground-dark">
          {{ t('aiSettings.sectionTitle') }}
        </h4>
        <button
          class="px-3 py-1 rounded text-xs border border-surface dark:border-surface-dark hover:bg-surface dark:hover:bg-surface-dark text-foreground dark:text-foreground-dark disabled:opacity-50"
          :disabled="isTestingAi"
          @click="handleTestAi"
        >
          {{ isTestingAi ? t('aiSettings.testing') : t('aiSettings.testConnection') }}
        </button>
      </div>

      <div class="setting-item flex items-center justify-between py-1.5">
        <span class="setting-label text-sm text-foreground dark:text-foreground-dark">{{ t('aiSettings.apiKey') }}</span>
        <input
          v-model="aiApiKey"
          type="password"
          placeholder="sk-..."
          class="w-40 px-2 py-1 rounded border border-surface dark:border-surface-dark text-sm bg-transparent text-foreground dark:text-foreground-dark"
          @blur="saveSettings"
        >
      </div>

      <div class="setting-item flex items-center justify-between py-1.5">
        <span class="setting-label text-sm text-foreground dark:text-foreground-dark">{{ t('aiSettings.baseUrl') }}</span>
        <input
          v-model="aiBaseUrl"
          type="text"
          placeholder="https://api.deepseek.com"
          class="w-40 px-2 py-1 rounded border border-surface dark:border-surface-dark text-sm bg-transparent text-foreground dark:text-foreground-dark"
          @blur="saveSettings"
        >
      </div>

      <div class="setting-item flex items-center justify-between py-1.5">
        <span class="setting-label text-sm text-foreground dark:text-foreground-dark">{{ t('aiSettings.model') }}</span>
        <input
          v-model="aiModel"
          type="text"
          placeholder="deepseek-flash"
          class="w-40 px-2 py-1 rounded border border-surface dark:border-surface-dark text-sm bg-transparent text-foreground dark:text-foreground-dark"
          @blur="saveSettings"
        >
      </div>

      <div class="setting-item flex items-center justify-between py-1.5">
        <span class="setting-label text-sm text-foreground dark:text-foreground-dark">{{ t('aiSettings.thinkingMode') }}</span>
        <label class="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
          <input
            v-model="optimizeThinking"
            type="checkbox"
            class="w-4 h-4"
            @change="saveSettings"
          >
          {{ t('aiSettings.thinkingLabel') }}
        </label>
      </div>

      <div class="py-1.5">
        <div class="flex items-center justify-between">
          <span class="setting-label text-xs text-muted">{{ t('aiSettings.templateLabel') }}</span>
          <div class="flex gap-3">
            <button
              class="text-xs text-primary hover:underline"
              @click="fillDefaultTemplate"
            >
              {{ t('aiSettings.fillDefault') }}
            </button>
            <button
              class="text-xs text-primary hover:underline"
              @click="resetTemplate"
            >
              {{ t('aiSettings.resetDefault') }}
            </button>
          </div>
        </div>
        <textarea
          v-model="optimizeTemplate"
          rows="3"
          :placeholder="t('aiSettings.templatePlaceholder')"
          class="w-full mt-1 px-2 py-1 rounded border border-surface dark:border-surface-dark text-xs bg-transparent text-foreground dark:text-foreground-dark resize-none"
          @blur="saveSettings"
        />
      </div>

      <p class="text-xs text-muted leading-relaxed">
        {{ t('aiSettings.extHint') }}
      </p>
    </div>

    <!-- 使用统计 -->
    <div class="border-t border-surface dark:border-surface-dark pt-4 mt-4">
      <h4 class="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
        {{ t('settings.stats.title') }}
      </h4>
      <div class="grid grid-cols-4 gap-2 text-center">
        <div>
          <div class="text-base font-medium text-foreground dark:text-foreground-dark">
            {{ stats.count }}
          </div>
          <div class="text-xs text-muted">
            {{ t('settings.stats.prompts') }}
          </div>
        </div>
        <div>
          <div class="text-base font-medium text-foreground dark:text-foreground-dark">
            {{ stats.spaces }}
          </div>
          <div class="text-xs text-muted">
            {{ t('settings.stats.spaces') }}
          </div>
        </div>
        <div>
          <div class="text-base font-medium text-foreground dark:text-foreground-dark">
            {{ stats.totalUses }}
          </div>
          <div class="text-xs text-muted">
            {{ t('settings.stats.totalUses') }}
          </div>
        </div>
        <div>
          <div class="text-base font-medium text-foreground dark:text-foreground-dark">
            {{ stats.favorites }}
          </div>
          <div class="text-xs text-muted">
            {{ t('settings.stats.favorites') }}
          </div>
        </div>
      </div>
      <div
        v-if="stats.top.length"
        class="mt-3"
      >
        <div class="text-xs text-muted mb-1">
          {{ t('settings.stats.topUsed') }}
        </div>
        <div
          v-for="(p, i) in stats.top"
          :key="p.id"
          class="flex justify-between gap-2 text-xs py-0.5"
        >
          <span class="truncate text-foreground dark:text-foreground-dark">{{ i + 1 }}. {{ p.title }}</span>
          <span class="shrink-0 text-muted">{{ t('settings.stats.times', { count: p.usageCount }) }}</span>
        </div>
      </div>
      <div
        v-if="stats.lastUsed"
        class="text-xs text-muted mt-2"
      >
        {{ t('settings.stats.lastUsed', { time: stats.lastUsed.slice(0, 16).replace('T', ' ') }) }}
      </div>
    </div>

    <!-- 导入导出 -->
    <div class="border-t border-surface dark:border-surface-dark pt-4 mt-4">
      <div class="flex gap-2 mb-3">
        <button
          class="flex-1 px-3 py-2 rounded text-sm bg-surface dark:bg-surface-dark hover:bg-surface-hover-light dark:hover:bg-surface-hover-dark text-foreground dark:text-foreground-dark"
          @click="handleExport"
        >
          {{ t('settings.importExport.export') }}
        </button>
        <button
          class="flex-1 px-3 py-2 rounded text-sm bg-surface dark:bg-surface-dark hover:bg-surface-hover-light dark:hover:bg-surface-hover-dark text-foreground dark:text-foreground-dark"
          @click="handleImport"
        >
          {{ t('settings.importExport.import') }}
        </button>
      </div>
      <!-- 状态提示 -->
      <div
        v-if="statusMessage"
        class="text-xs text-muted mb-2 text-center"
      >
        {{ statusMessage }}
      </div>
    </div>

    <!-- 关于 -->
    <div class="border-t border-surface dark:border-surface-dark pt-4 mt-4 text-center">
      <p class="text-xs text-muted">
        {{ t('settings.aboutExt', { version: appVersion }) }}
      </p>
      <p class="text-xs text-muted mt-1">
        {{ t('settings.aboutTagline') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePromptStore } from '@/sidepanel/stores/promptStore'
import { loadAppData, mutateAppData, saveAppData } from '@/lib/storage'
import { applyTheme, type ThemeSetting } from '@/lib/theme'
import { setLocale } from '../i18n'
import { testAiConnection } from '@/lib/ai'
import { DEFAULT_SETTINGS, DEFAULT_OPTIMIZE_TEMPLATE } from '@/types'

defineEmits<{
  close: []
}>()

const { t } = useI18n()
const promptStore = usePromptStore()
const appVersion = chrome.runtime.getManifest().version

// 使用统计（从当前数据即时计算，不额外落盘）
const stats = computed(() => {
  const prompts = promptStore.prompts
  const totalUses = prompts.reduce((sum, p) => sum + (p.usageCount || 0), 0)
  const top = [...prompts]
    .filter((p) => (p.usageCount || 0) > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5)
    .map((p) => ({ id: p.id, title: p.title, usageCount: p.usageCount }))
  const lastUsed = prompts.reduce<string | null>(
    (latest, p) => (p.lastUsedAt && (!latest || p.lastUsedAt > latest) ? p.lastUsedAt : latest),
    null
  )
  return {
    count: prompts.length,
    spaces: promptStore.spaces.length,
    totalUses,
    favorites: prompts.filter((p) => p.favorite).length,
    top,
    lastUsed
  }
})

const theme = ref('system')
const language = ref('system')
const maxResults = ref(DEFAULT_SETTINGS.maxResults)
const statusMessage = ref<string | null>(null)

// AI 优化设置（本地编辑，失焦保存）
const aiBaseUrl = ref(DEFAULT_SETTINGS.aiBaseUrl)
const aiApiKey = ref('')
const aiModel = ref(DEFAULT_SETTINGS.aiModel)
const optimizeTemplate = ref(DEFAULT_SETTINGS.optimizeTemplate)
const optimizeThinking = ref(false)
const isTestingAi = ref(false)

onMounted(async () => {
  const data = await loadAppData()
  theme.value = data.settings?.theme || 'system'
  language.value = data.settings?.language || 'system'
  maxResults.value = data.settings?.maxResults ?? DEFAULT_SETTINGS.maxResults
  aiBaseUrl.value = data.settings?.aiBaseUrl || DEFAULT_SETTINGS.aiBaseUrl
  aiApiKey.value = data.settings?.aiApiKey || ''
  aiModel.value = data.settings?.aiModel || DEFAULT_SETTINGS.aiModel
  optimizeTemplate.value = data.settings?.optimizeTemplate ?? ''
  optimizeThinking.value = data.settings?.optimizeThinking ?? false
})

const saveTheme = () => {
  applyTheme(theme.value as ThemeSetting)
  saveSettings()
}

const saveLanguage = () => {
  setLocale(language.value)
  saveSettings()
}

const saveSettings = async () => {
  // 原子化读改写：只更新设置字段，空间/提示词保留锁内最新快照，
  // 避免覆盖 background 正在写入的 AI 优化历史
  await mutateAppData((data) => {
    data.settings = {
      ...data.settings,
      theme: theme.value as ThemeSetting,
      language: language.value,
      maxResults: maxResults.value,
      aiBaseUrl: aiBaseUrl.value,
      aiApiKey: aiApiKey.value,
      aiModel: aiModel.value,
      optimizeTemplate: optimizeTemplate.value,
      optimizeThinking: optimizeThinking.value
    }
  })
}

// 恢复默认优化模板：清空 = 使用内置默认（模板正文单源维护在 shared/types.ts）
const resetTemplate = () => {
  optimizeTemplate.value = ''
  saveSettings()
}

// 把内置默认模板填入编辑框，便于在其基础上自定义（失焦后才保存）
const fillDefaultTemplate = () => {
  optimizeTemplate.value = DEFAULT_OPTIMIZE_TEMPLATE
}

// 测试 AI 连接（使用当前表单值，无需先保存）
const handleTestAi = async () => {
  isTestingAi.value = true
  statusMessage.value = t('aiSettings.testingConn')
  try {
    const reply = await testAiConnection(aiBaseUrl.value, aiApiKey.value, aiModel.value, optimizeThinking.value)
    statusMessage.value = t('aiSettings.testSuccess', { reply: reply.slice(0, 30) })
  } catch (err) {
    statusMessage.value = t('aiSettings.testFailed', { error: (err as Error).message })
  } finally {
    isTestingAi.value = false
  }
  setTimeout(() => statusMessage.value = null, 5000)
}

const handleExport = async () => {
  const data = await loadAppData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `promptx-extension-export-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  statusMessage.value = t('settings.importExport.exported')
  setTimeout(() => statusMessage.value = null, 2000)
}

const handleImport = async () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await saveAppData(data)
      await promptStore.loadData()
      statusMessage.value = t('settings.importExport.importSuccessExt', { count: data.prompts?.length || 0 })
    } catch (err) {
      statusMessage.value = t('settings.importExport.importFailed', { error: (err as Error).message })
    }
    setTimeout(() => statusMessage.value = null, 3000)
  }
  input.click()
}
</script>

<style scoped>
.settings-panel {
  min-height: 100%;
}
</style>