<script setup lang="ts">
/**
 * AI 快捷优化设置区块：服务配置 + 快捷键 + 推理模式 + 优化模板
 * 数据直接读写 settingsStore；状态提示通过 status 事件交由父级展示
 */
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settingsStore'
import { testAiConnection, describeAiError } from '@/services/ai'
import { DEFAULT_OPTIMIZE_TEMPLATE } from '@/types'
import { OPTIMIZE_PRESETS } from '@shared/optimizePresets'
import HotkeyRow from './HotkeyRow.vue'

const props = defineProps<{
  /** 正在捕获的快捷键字段（捕获按键的监听在父级） */
  capturingField: string | null
}>()

const emit = defineEmits<{
  capture: [field: 'optimizeHotkey' | 'clipboardOptimizeHotkey']
  cancel: []
  status: [message: string]
}>()

const { t } = useI18n()
const settingsStore = useSettingsStore()

const optimizeHotkey = computed(() => settingsStore.optimizeHotkey)
const clipboardOptimizeHotkey = computed(() => settingsStore.clipboardOptimizeHotkey)

// AI 优化设置（本地编辑，失焦或变更即保存）
const aiBaseUrl = ref(settingsStore.aiBaseUrl)
const aiApiKey = ref(settingsStore.aiApiKey)
const aiModel = ref(settingsStore.aiModel)
const optimizeTemplate = ref(settingsStore.optimizeTemplate)
const optimizeThinking = ref(settingsStore.optimizeThinking)
const optimizePreview = ref(settingsStore.optimizePreview)
const isTestingAi = ref(false)

// 响应 store 加载后的异步更新（如钥匙串加载完附加 key）
watch(
  () => settingsStore.aiApiKey,
  (v) => {
    if (v !== aiApiKey.value) aiApiKey.value = v
  }
)
watch(
  () => settingsStore.aiBaseUrl,
  (v) => {
    if (v !== aiBaseUrl.value) aiBaseUrl.value = v
  }
)
watch(
  () => settingsStore.aiModel,
  (v) => {
    if (v !== aiModel.value) aiModel.value = v
  }
)
watch(
  () => settingsStore.optimizeTemplate,
  (v) => {
    if (v !== optimizeTemplate.value) optimizeTemplate.value = v
  }
)
watch(
  () => settingsStore.optimizeThinking,
  (v) => {
    optimizeThinking.value = v
  }
)
watch(
  () => settingsStore.optimizePreview,
  (v) => {
    optimizePreview.value = v
  }
)

// 保存单个 AI 设置项（失焦或回车触发）
const saveAiField = (field: 'aiBaseUrl' | 'aiApiKey' | 'aiModel' | 'optimizeTemplate', value: string) => {
  const trimmed = field === 'aiBaseUrl' || field === 'aiApiKey' || field === 'aiModel' ? value.trim() : value
  settingsStore.updateSettings({ [field]: trimmed }).catch((error) => {
    emit('status', t('aiSettings.saveFailed', { error: error instanceof Error ? error.message : String(error) }))
  })
}

// 组件卸载时确保未失焦的修改落盘保存
onUnmounted(() => {
  if (
    aiApiKey.value.trim() !== settingsStore.aiApiKey.trim() ||
    aiBaseUrl.value.trim() !== settingsStore.aiBaseUrl.trim() ||
    aiModel.value.trim() !== settingsStore.aiModel.trim() ||
    optimizeTemplate.value !== settingsStore.optimizeTemplate
  ) {
    settingsStore
      .updateSettings({
        aiBaseUrl: aiBaseUrl.value.trim(),
        aiApiKey: aiApiKey.value.trim(),
        aiModel: aiModel.value.trim(),
        optimizeTemplate: optimizeTemplate.value,
      })
      .catch(() => {})
  }
})

// 恢复默认优化模板：清空 = 使用内置默认（模板正文单源维护在 shared/types.ts）
const resetTemplate = () => {
  optimizeTemplate.value = ''
  saveAiField('optimizeTemplate', '')
  emit('status', t('aiSettings.templateReset'))
}

// 把内置默认模板填入编辑框，便于在其基础上自定义（失焦后才保存）
const fillDefaultTemplate = () => {
  optimizeTemplate.value = DEFAULT_OPTIMIZE_TEMPLATE
}

// 风格预设：选择即填入对应模板并立即保存（custom = 保留当前内容不动）
const presetOptions = [{ id: 'custom', nameKey: 'presets.custom' }, ...OPTIMIZE_PRESETS]
const selectedPreset = ref('custom')

const applyPreset = () => {
  const preset = OPTIMIZE_PRESETS.find((p) => p.id === selectedPreset.value)
  if (!preset) return
  optimizeTemplate.value = preset.template
  saveAiField('optimizeTemplate', preset.template)
}

// 切换推理模式（即时保存）
const toggleThinking = () => {
  settingsStore.updateSettings({ optimizeThinking: optimizeThinking.value }).catch((error) => {
    emit('status', t('settings.saveFailed', { error: error instanceof Error ? error.message : String(error) }))
  })
}

// 切换优化结果预览确认（即时保存）
const togglePreview = () => {
  settingsStore.updateSettings({ optimizePreview: optimizePreview.value }).catch((error) => {
    emit('status', t('aiSettings.saveFailed', { error: error instanceof Error ? error.message : String(error) }))
  })
}

// 测试 AI 连接（自动同步当前表单最新值并测试）
const handleTestAi = async () => {
  isTestingAi.value = true
  emit('status', t('aiSettings.testingConn'))
  try {
    await settingsStore.updateSettings({
      aiBaseUrl: aiBaseUrl.value.trim(),
      aiApiKey: aiApiKey.value.trim(),
      aiModel: aiModel.value.trim(),
    })
    const reply = await testAiConnection(
      aiBaseUrl.value.trim(),
      aiApiKey.value.trim(),
      aiModel.value.trim(),
      optimizeThinking.value
    )
    emit('status', t('aiSettings.testSuccess', { reply: reply.slice(0, 30) }))
  } catch (error) {
    emit('status', t('aiSettings.testFailed', { error: describeAiError(error, t) }))
  } finally {
    isTestingAi.value = false
  }
}
</script>

<template>
  <div class="border-t border-surface dark:border-surface-dark pt-3 mt-3">
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
      <span class="setting-label text-sm text-foreground dark:text-foreground-dark">API Key</span>
      <input
        v-model="aiApiKey"
        type="password"
        placeholder="sk-..."
        class="w-40 px-2 py-1 rounded border border-surface dark:border-surface-dark text-sm bg-transparent text-foreground dark:text-foreground-dark"
        @change="saveAiField('aiApiKey', aiApiKey)"
        @blur="saveAiField('aiApiKey', aiApiKey)"
        @keydown.enter="saveAiField('aiApiKey', aiApiKey); ($event.target as HTMLElement)?.blur()"
      >
    </div>

    <div class="setting-item flex items-center justify-between py-1.5">
      <span class="setting-label text-sm text-foreground dark:text-foreground-dark">{{ t('aiSettings.baseUrl') }}</span>
      <input
        v-model="aiBaseUrl"
        type="text"
        placeholder="https://api.deepseek.com"
        class="w-40 px-2 py-1 rounded border border-surface dark:border-surface-dark text-sm bg-transparent text-foreground dark:text-foreground-dark"
        @change="saveAiField('aiBaseUrl', aiBaseUrl)"
        @blur="saveAiField('aiBaseUrl', aiBaseUrl)"
        @keydown.enter="saveAiField('aiBaseUrl', aiBaseUrl); ($event.target as HTMLElement)?.blur()"
      >
    </div>

    <div class="setting-item flex items-center justify-between py-1.5">
      <span class="setting-label text-sm text-foreground dark:text-foreground-dark">{{ t('aiSettings.model') }}</span>
      <input
        v-model="aiModel"
        type="text"
        placeholder="deepseek-flash"
        class="w-40 px-2 py-1 rounded border border-surface dark:border-surface-dark text-sm bg-transparent text-foreground dark:text-foreground-dark"
        @change="saveAiField('aiModel', aiModel)"
        @blur="saveAiField('aiModel', aiModel)"
        @keydown.enter="saveAiField('aiModel', aiModel); ($event.target as HTMLElement)?.blur()"
      >
    </div>

    <HotkeyRow
      :label="t('aiSettings.optimizeHotkey')"
      :hotkey="optimizeHotkey"
      :capturing="props.capturingField === 'optimizeHotkey'"
      @start="emit('capture', 'optimizeHotkey')"
      @cancel="emit('cancel')"
    />

    <HotkeyRow
      :label="t('aiSettings.clipboardHotkey')"
      :hotkey="clipboardOptimizeHotkey"
      :capturing="props.capturingField === 'clipboardOptimizeHotkey'"
      :hint="t('aiSettings.clipboardHotkeyHint')"
      @start="emit('capture', 'clipboardOptimizeHotkey')"
      @cancel="emit('cancel')"
    />

    <div class="setting-item flex items-center justify-between py-1.5">
      <span class="setting-label text-sm text-foreground dark:text-foreground-dark">{{ t('aiSettings.thinkingMode') }}</span>
      <label class="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
        <input
          v-model="optimizeThinking"
          type="checkbox"
          class="w-4 h-4"
          @change="toggleThinking"
        >
        {{ t('aiSettings.thinkingLabel') }}
      </label>
    </div>

    <div
      class="setting-item flex items-center justify-between py-1.5"
      :title="t('aiSettings.previewHint')"
    >
      <span class="setting-label text-sm text-foreground dark:text-foreground-dark">{{ t('aiSettings.previewLabel') }}</span>
      <input
        v-model="optimizePreview"
        type="checkbox"
        class="w-4 h-4"
        @change="togglePreview"
      >
    </div>

    <div
      class="setting-item flex items-center justify-between py-1.5"
      :title="t('presets.hint')"
    >
      <span class="setting-label text-sm text-foreground dark:text-foreground-dark">{{ t('presets.label') }}</span>
      <select
        v-model="selectedPreset"
        class="px-2 py-1 rounded border border-surface dark:border-surface-dark text-xs bg-transparent text-foreground dark:text-foreground-dark"
        @change="applyPreset"
      >
        <option
          v-for="opt in presetOptions"
          :key="opt.id"
          :value="opt.id"
        >
          {{ t(opt.nameKey) }}
        </option>
      </select>
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
        @change="saveAiField('optimizeTemplate', optimizeTemplate)"
        @blur="saveAiField('optimizeTemplate', optimizeTemplate)"
      />
    </div>
  </div>
</template>
