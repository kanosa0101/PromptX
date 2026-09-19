<template>
  <div class="settings-panel p-4 bg-white dark:bg-[#1A1A2E]">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium text-[#1A1A2E] dark:text-[#E4E4E7]">设置</h3>
      <button
        class="p-1 rounded hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#1A1A2E] dark:text-[#E4E4E7]"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>

    <!-- 主题设置 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">主题</span>
      <select
        v-model="theme"
        class="px-3 py-1.5 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent text-[#1A1A2E] dark:text-[#E4E4E7]"
        @change="saveTheme"
      >
        <option value="light">亮色</option>
        <option value="dark">暗色</option>
        <option value="system">跟随系统</option>
      </select>
    </div>

    <!-- 最大结果数 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">最大结果数</span>
      <input
        v-model.number="maxResults"
        type="number"
        min="5"
        max="50"
        class="px-3 py-1.5 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent w-16 text-[#1A1A2E] dark:text-[#E4E4E7]"
        @change="saveSettings"
      />
    </div>

    <!-- AI 优化设置 -->
    <div class="border-t border-[#E4E4E7] dark:border-[#27272A] pt-4 mt-4">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-medium text-[#1A1A2E] dark:text-[#E4E4E7]">AI 快捷优化</h4>
        <button
          class="px-3 py-1 rounded text-xs border border-[#E4E4E7] dark:border-[#27272A] hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#1A1A2E] dark:text-[#E4E4E7] disabled:opacity-50"
          :disabled="isTestingAi"
          @click="handleTestAi"
        >
          {{ isTestingAi ? '测试中...' : '测试连接' }}
        </button>
      </div>

      <div class="setting-item flex items-center justify-between py-1.5">
        <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">API Key</span>
        <input
          v-model="aiApiKey"
          type="password"
          placeholder="sk-..."
          class="w-40 px-2 py-1 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent text-[#1A1A2E] dark:text-[#E4E4E7]"
          @blur="saveSettings"
        />
      </div>

      <div class="setting-item flex items-center justify-between py-1.5">
        <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">服务地址</span>
        <input
          v-model="aiBaseUrl"
          type="text"
          placeholder="https://api.deepseek.com"
          class="w-40 px-2 py-1 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent text-[#1A1A2E] dark:text-[#E4E4E7]"
          @blur="saveSettings"
        />
      </div>

      <div class="setting-item flex items-center justify-between py-1.5">
        <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">模型</span>
        <input
          v-model="aiModel"
          type="text"
          placeholder="deepseek-flash"
          class="w-40 px-2 py-1 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent text-[#1A1A2E] dark:text-[#E4E4E7]"
          @blur="saveSettings"
        />
      </div>

      <div class="setting-item flex items-center justify-between py-1.5">
        <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">推理模式</span>
        <label class="flex items-center gap-1.5 text-xs text-[#71717A] cursor-pointer">
          <input
            v-model="optimizeThinking"
            type="checkbox"
            class="w-4 h-4"
            @change="saveSettings"
          />
          深度思考（更慢）
        </label>
      </div>

      <div class="py-1.5">
        <span class="setting-label text-xs text-[#71717A]">优化指令模板（失焦自动保存）</span>
        <textarea
          v-model="optimizeTemplate"
          rows="3"
          class="w-full mt-1 px-2 py-1 rounded border border-[#E4E4E7] dark:border-[#27272A] text-xs bg-transparent text-[#1A1A2E] dark:text-[#E4E4E7] resize-none"
          @blur="saveSettings"
        ></textarea>
      </div>

      <p class="text-xs text-[#71717A] leading-relaxed">
        在网页输入框中选中文本，按 Alt+Shift+O 自动 AI 优化并原位替换（快捷键可在 chrome://extensions/shortcuts 修改）
      </p>
    </div>

    <!-- 导入导出 -->
    <div class="border-t border-[#E4E4E7] dark:border-[#27272A] pt-4 mt-4">
      <div class="flex gap-2 mb-3">
        <button
          class="flex-1 px-3 py-2 rounded text-sm bg-[#E4E4E7] dark:bg-[#27272A] hover:bg-[#D4D4D8] dark:hover:bg-[#3A3A3E] text-[#1A1A2E] dark:text-[#E4E4E7]"
          @click="handleExport"
        >
          导出数据
        </button>
        <button
          class="flex-1 px-3 py-2 rounded text-sm bg-[#E4E4E7] dark:bg-[#27272A] hover:bg-[#D4D4D8] dark:hover:bg-[#3A3A3E] text-[#1A1A2E] dark:text-[#E4E4E7]"
          @click="handleImport"
        >
          导入数据
        </button>
      </div>
      <!-- 状态提示 -->
      <div v-if="statusMessage" class="text-xs text-[#71717A] mb-2 text-center">
        {{ statusMessage }}
      </div>
    </div>

    <!-- 关于 -->
    <div class="border-t border-[#E4E4E7] dark:border-[#27272A] pt-4 mt-4 text-center">
      <p class="text-xs text-[#71717A]">PromptX 浏览器插件 v1.0.0</p>
      <p class="text-xs text-[#71717A] mt-1">AI 提示词剪贴板管理工具</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePromptStore } from '@/sidepanel/stores/promptStore'
import { loadAppData, saveAppData } from '@/lib/storage'
import { testAiConnection } from '@/lib/ai'
import { DEFAULT_SETTINGS } from '@/types'

defineEmits<{
  close: []
}>()

const promptStore = usePromptStore()

const theme = ref('system')
const maxResults = ref(20)
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
  maxResults.value = data.settings?.maxResults || 20
  aiBaseUrl.value = data.settings?.aiBaseUrl || DEFAULT_SETTINGS.aiBaseUrl
  aiApiKey.value = data.settings?.aiApiKey || ''
  aiModel.value = data.settings?.aiModel || DEFAULT_SETTINGS.aiModel
  optimizeTemplate.value = data.settings?.optimizeTemplate || DEFAULT_SETTINGS.optimizeTemplate
  optimizeThinking.value = data.settings?.optimizeThinking ?? false
})

const saveTheme = () => {
  applyTheme(theme.value)
  saveSettings()
}

const applyTheme = (themeValue: string) => {
  if (themeValue === 'dark' || (themeValue === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

const saveSettings = async () => {
  // 先读取现有数据，合并保存（避免覆盖其他设置字段）
  const data = await loadAppData()
  await saveAppData({
    version: '1.0.0',
    settings: {
      ...data.settings,
      theme: theme.value as 'light' | 'dark' | 'system',
      maxResults: maxResults.value,
      aiBaseUrl: aiBaseUrl.value,
      aiApiKey: aiApiKey.value,
      aiModel: aiModel.value,
      optimizeTemplate: optimizeTemplate.value,
      optimizeThinking: optimizeThinking.value
    },
    spaces: promptStore.spaces,
    prompts: promptStore.prompts
  })
}

// 测试 AI 连接（使用当前表单值，无需先保存）
const handleTestAi = async () => {
  isTestingAi.value = true
  statusMessage.value = '正在测试 AI 连接...'
  try {
    const reply = await testAiConnection(aiBaseUrl.value, aiApiKey.value, aiModel.value, optimizeThinking.value)
    statusMessage.value = '连接成功，模型回复：' + reply.slice(0, 30)
  } catch (err) {
    statusMessage.value = '连接失败：' + (err as Error).message
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
  statusMessage.value = '导出成功！'
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
      statusMessage.value = `导入成功！${data.prompts?.length || 0} 个提示词`
    } catch (err) {
      statusMessage.value = '导入失败：' + (err as Error).message
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