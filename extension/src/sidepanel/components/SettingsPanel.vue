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

const emit = defineEmits<{
  close: []
}>()

const promptStore = usePromptStore()

const theme = ref('system')
const maxResults = ref(20)
const statusMessage = ref<string | null>(null)

onMounted(async () => {
  const data = await loadAppData()
  theme.value = data.settings?.theme || 'system'
  maxResults.value = data.settings?.maxResults || 20
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
  await saveAppData({
    version: '1.0.0',
    settings: {
      theme: theme.value,
      maxResults: maxResults.value
    },
    spaces: promptStore.spaces,
    prompts: promptStore.prompts
  })
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