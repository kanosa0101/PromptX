<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { usePromptStore } from '@/stores/promptStore'

const settingsStore = useSettingsStore()
const uiStore = useUiStore()
const promptStore = usePromptStore()

const emit = defineEmits<{
  close: []
}>()

// 本地状态
const theme = ref(settingsStore.theme)
const hotkey = ref(settingsStore.globalHotkey)
const windowOpacity = ref(settingsStore.windowOpacity)
const autoHide = ref(settingsStore.autoHide)
const showInDock = ref(settingsStore.showInDock)
const launchAtLogin = ref(settingsStore.launchAtLogin)

// 导入导出状态
const importStatus = ref<string | null>(null)

// 快捷键捕获状态
const isCapturingHotkey = ref(false)
const capturedKeys = ref<string[]>([])

// 快捷键按键监听
const handleHotkeyCapture = async (e: KeyboardEvent) => {
  if (!isCapturingHotkey.value) return

  e.preventDefault()
  e.stopPropagation()

  // 获取按键
  const key = e.key.toUpperCase()
  const modifiers: string[] = []

  if (e.altKey) modifiers.push('Alt')
  if (e.ctrlKey) modifiers.push('Ctrl')
  if (e.shiftKey) modifiers.push('Shift')
  if (e.metaKey) modifiers.push('Cmd')

  // 至少需要一个修饰键 + 一个普通键
  if (modifiers.length > 0 && key.length === 1) {
    const fullHotkey = [...modifiers, key].join('+')
    hotkey.value = fullHotkey
    capturedKeys.value = [...modifiers, key]

    // 立即注册新快捷键
    try {
      await invoke('register_hotkey', { hotkey: fullHotkey })
      await saveSettings()
      importStatus.value = '快捷键已更新为 ' + fullHotkey
    } catch (error) {
      importStatus.value = '快捷键注册失败：' + (error as string)
    }

    isCapturingHotkey.value = false
  }
}

// 开始捕获快捷键
const startHotkeyCapture = () => {
  isCapturingHotkey.value = true
  capturedKeys.value = []
  importStatus.value = '请按下新的快捷键组合...'
}

// 取消捕获
const cancelHotkeyCapture = () => {
  isCapturingHotkey.value = false
  capturedKeys.value = []
  importStatus.value = null
}

// 透明度实时更新
const updateOpacity = async () => {
  // 实时预览（通过 CSS）
  document.documentElement.style.setProperty('--window-opacity', String(windowOpacity.value))
  await saveSettings()
}

// 保存设置
const saveSettings = async () => {
  await settingsStore.updateSettings({
    theme: theme.value,
    globalHotkey: hotkey.value,
    windowOpacity: windowOpacity.value,
    autoHide: autoHide.value,
    showInDock: showInDock.value,
    launchAtLogin: launchAtLogin.value,
  })
}

// 关闭
const handleClose = () => {
  if (isCapturingHotkey.value) {
    cancelHotkeyCapture()
  }
  emit('close')
}

// 显示帮助
const showHelp = () => {
  emit('close')
  uiStore.openHelp()
}

// 导出数据
const handleExport = async () => {
  try {
    const data = await promptStore.exportData()
    // 创建 JSON 文件并下载
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `promptx-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    importStatus.value = '导出成功！'
  } catch (error) {
    importStatus.value = '导出失败：' + (error as Error).message
  }
}

// 导入数据
const handleImport = async () => {
  try {
    // 创建文件选择器
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const text = await file.text()
      const data = JSON.parse(text)

      const result = await promptStore.importData(data, true)
      importStatus.value = `导入成功！导入 ${result.importedPrompts} 个提示词，${result.importedSpaces} 个空间`
    }
    input.click()
  } catch (error) {
    importStatus.value = '导入失败：' + (error as Error).message
  }
}

// 主题选项
const themeOptions = [
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
  { value: 'system', label: '跟随系统' },
]

onMounted(() => {
  window.addEventListener('keydown', handleHotkeyCapture)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleHotkeyCapture)
})
</script>

<template>
  <div class="settings-panel p-4 bg-white dark:bg-[#1A1A2E]">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium text-[#1A1A2E] dark:text-[#E4E4E7]">设置</h3>
      <button
        class="p-1 rounded hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#1A1A2E] dark:text-[#E4E4E7]"
        @click="handleClose"
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
        @change="saveSettings"
      >
        <option v-for="opt in themeOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- 快捷键设置 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">全局快捷键</span>
      <button
        v-if="!isCapturingHotkey"
        class="px-3 py-1.5 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#1A1A2E] dark:text-[#E4E4E7] w-24"
        @click="startHotkeyCapture"
      >
        {{ hotkey }}
      </button>
      <button
        v-else
        class="px-3 py-1.5 rounded border border-[#3B82F6] text-sm bg-[#3B82F6]/10 text-[#3B82F6] w-24 animate-pulse"
        @click="cancelHotkeyCapture"
      >
        取消
      </button>
    </div>

    <!-- 窗口透明度 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">窗口透明度</span>
      <input
        v-model.number="windowOpacity"
        type="range"
        min="0.5"
        max="1"
        step="0.05"
        class="w-24"
        @input="updateOpacity"
      />
      <span class="text-xs text-[#71717A] w-12">{{ Math.round(windowOpacity * 100) }}%</span>
    </div>

    <!-- 失去焦点自动隐藏 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">失去焦点自动隐藏</span>
      <input
        v-model="autoHide"
        type="checkbox"
        class="w-4 h-4"
        @change="saveSettings"
      />
    </div>

    <!-- 显示在 Dock -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">显示在任务栏</span>
      <input
        v-model="showInDock"
        type="checkbox"
        class="w-4 h-4"
        @change="saveSettings"
      />
    </div>

    <!-- 开机自启动 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">开机自启动</span>
      <input
        v-model="launchAtLogin"
        type="checkbox"
        class="w-4 h-4"
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
      <div v-if="importStatus" class="text-xs text-[#71717A] mb-2 text-center">
        {{ importStatus }}
      </div>
      <button
        class="w-full px-3 py-2 rounded text-sm bg-[#3B82F6] text-white hover:bg-[#2563EB]"
        @click="showHelp"
      >
        使用说明
      </button>
    </div>
  </div>
</template>