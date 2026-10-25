<script setup lang="ts">
/**
 * AI 快捷优化设置区块：服务配置 + 快捷键 + 推理模式 + 优化模板
 * 数据直接读写 settingsStore；状态提示通过 status 事件交由父级展示
 */
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { testAiConnection } from '@/services/ai'
import { DEFAULT_OPTIMIZE_TEMPLATE } from '@/types'
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

const settingsStore = useSettingsStore()

const optimizeHotkey = computed(() => settingsStore.optimizeHotkey)
const clipboardOptimizeHotkey = computed(() => settingsStore.clipboardOptimizeHotkey)

// AI 优化设置（本地编辑，失焦即保存）
const aiBaseUrl = ref(settingsStore.aiBaseUrl)
const aiApiKey = ref(settingsStore.aiApiKey)
const aiModel = ref(settingsStore.aiModel)
const optimizeTemplate = ref(settingsStore.optimizeTemplate)
const optimizeThinking = ref(settingsStore.optimizeThinking)
const isTestingAi = ref(false)

// 保存单个 AI 设置项（失焦触发）
const saveAiField = (field: 'aiBaseUrl' | 'aiApiKey' | 'aiModel' | 'optimizeTemplate', value: string) => {
  settingsStore.updateSettings({ [field]: value }).catch((error) => {
    emit('status', 'AI 设置保存失败：' + (error instanceof Error ? error.message : String(error)))
  })
}

// 恢复默认优化模板：清空 = 使用内置默认（模板正文单源维护在 shared/types.ts）
const resetTemplate = () => {
  optimizeTemplate.value = ''
  saveAiField('optimizeTemplate', '')
  emit('status', '已恢复内置默认优化模板')
}

// 把内置默认模板填入编辑框，便于在其基础上自定义（失焦后才保存）
const fillDefaultTemplate = () => {
  optimizeTemplate.value = DEFAULT_OPTIMIZE_TEMPLATE
}

// 切换推理模式（即时保存）
const toggleThinking = () => {
  settingsStore.updateSettings({ optimizeThinking: optimizeThinking.value }).catch((error) => {
    emit('status', '保存失败：' + (error instanceof Error ? error.message : String(error)))
  })
}

// 测试 AI 连接（使用当前表单值，无需先保存）
const handleTestAi = async () => {
  isTestingAi.value = true
  emit('status', '正在测试 AI 连接...')
  try {
    const reply = await testAiConnection(aiBaseUrl.value, aiApiKey.value, aiModel.value, optimizeThinking.value)
    emit('status', '连接成功，模型回复：' + reply.slice(0, 30))
  } catch (error) {
    emit('status', '连接失败：' + (error instanceof Error ? error.message : String(error)))
  } finally {
    isTestingAi.value = false
  }
}
</script>

<template>
  <div class="border-t border-surface dark:border-surface-dark pt-3 mt-3">
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-medium text-foreground dark:text-foreground-dark">
        AI 快捷优化
      </h4>
      <button
        class="px-3 py-1 rounded text-xs border border-surface dark:border-surface-dark hover:bg-surface dark:hover:bg-surface-dark text-foreground dark:text-foreground-dark disabled:opacity-50"
        :disabled="isTestingAi"
        @click="handleTestAi"
      >
        {{ isTestingAi ? '测试中...' : '测试连接' }}
      </button>
    </div>

    <div class="setting-item flex items-center justify-between py-1.5">
      <span class="setting-label text-sm text-foreground dark:text-foreground-dark">API Key</span>
      <input
        v-model="aiApiKey"
        type="password"
        placeholder="sk-..."
        class="w-40 px-2 py-1 rounded border border-surface dark:border-surface-dark text-sm bg-transparent text-foreground dark:text-foreground-dark"
        @blur="saveAiField('aiApiKey', aiApiKey)"
      >
    </div>

    <div class="setting-item flex items-center justify-between py-1.5">
      <span class="setting-label text-sm text-foreground dark:text-foreground-dark">服务地址</span>
      <input
        v-model="aiBaseUrl"
        type="text"
        placeholder="https://api.deepseek.com"
        class="w-40 px-2 py-1 rounded border border-surface dark:border-surface-dark text-sm bg-transparent text-foreground dark:text-foreground-dark"
        @blur="saveAiField('aiBaseUrl', aiBaseUrl)"
      >
    </div>

    <div class="setting-item flex items-center justify-between py-1.5">
      <span class="setting-label text-sm text-foreground dark:text-foreground-dark">模型</span>
      <input
        v-model="aiModel"
        type="text"
        placeholder="deepseek-flash"
        class="w-40 px-2 py-1 rounded border border-surface dark:border-surface-dark text-sm bg-transparent text-foreground dark:text-foreground-dark"
        @blur="saveAiField('aiModel', aiModel)"
      >
    </div>

    <HotkeyRow
      label="优化快捷键"
      :hotkey="optimizeHotkey"
      :capturing="props.capturingField === 'optimizeHotkey'"
      @start="emit('capture', 'optimizeHotkey')"
      @cancel="emit('cancel')"
    />

    <HotkeyRow
      label="剪贴板优化快捷键"
      :hotkey="clipboardOptimizeHotkey"
      :capturing="props.capturingField === 'clipboardOptimizeHotkey'"
      hint="优化剪贴板内容并写回剪贴板，适用于终端等选区不可靠场景"
      @start="emit('capture', 'clipboardOptimizeHotkey')"
      @cancel="emit('cancel')"
    />

    <div class="setting-item flex items-center justify-between py-1.5">
      <span class="setting-label text-sm text-foreground dark:text-foreground-dark">推理模式</span>
      <label class="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
        <input
          v-model="optimizeThinking"
          type="checkbox"
          class="w-4 h-4"
          @change="toggleThinking"
        >
        深度思考（更慢）
      </label>
    </div>

    <div class="py-1.5">
      <div class="flex items-center justify-between">
        <span class="setting-label text-xs text-muted">优化指令模板（失焦自动保存）</span>
        <div class="flex gap-3">
          <button
            class="text-xs text-primary hover:underline"
            @click="fillDefaultTemplate"
          >
            填入默认
          </button>
          <button
            class="text-xs text-primary hover:underline"
            @click="resetTemplate"
          >
            恢复默认
          </button>
        </div>
      </div>
      <textarea
        v-model="optimizeTemplate"
        rows="3"
        placeholder="留空使用内置默认优化模板"
        class="w-full mt-1 px-2 py-1 rounded border border-surface dark:border-surface-dark text-xs bg-transparent text-foreground dark:text-foreground-dark resize-none"
        @blur="saveAiField('optimizeTemplate', optimizeTemplate)"
      />
    </div>
  </div>
</template>
