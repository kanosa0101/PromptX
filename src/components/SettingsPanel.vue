<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { usePromptStore } from '@/stores/promptStore'
import { testAiConnection } from '@/services/ai'

const settingsStore = useSettingsStore()
const uiStore = useUiStore()
const promptStore = usePromptStore()

const emit = defineEmits<{
  close: []
}>()

// 本地可编辑状态（通过 computed 从 store 读取，保存时写回 store）
const theme = computed({
  get: () => settingsStore.theme,
  set: (v: 'light' | 'dark' | 'system') => { settingsStore.setTheme(v) }
})
const hotkey = computed(() => settingsStore.globalHotkey)
const optimizeHotkey = computed(() => settingsStore.optimizeHotkey)
const windowOpacity = computed({
  get: () => settingsStore.windowOpacity,
  set: (v: number) => { settingsStore.setWindowOpacity(v) }
})
const autoHide = computed({
  get: () => settingsStore.autoHide,
  set: (v: boolean) => { settingsStore.setAutoHide(v) }
})
const launchAtLogin = computed({
  get: () => settingsStore.launchAtLogin,
  set: (v: boolean) => { settingsStore.setLaunchAtLogin(v) }
})

// 导入导出状态
const importStatus = ref<string | null>(null)

// 快捷键捕获状态（记录正在捕获哪个快捷键）
type HotkeyField = 'globalHotkey' | 'optimizeHotkey'
const capturingField = ref<HotkeyField | null>(null)

// AI 优化设置（本地编辑，失焦即保存）
const aiBaseUrl = ref(settingsStore.aiBaseUrl)
const aiApiKey = ref(settingsStore.aiApiKey)
const aiModel = ref(settingsStore.aiModel)
const optimizeTemplate = ref(settingsStore.optimizeTemplate)
const optimizeThinking = ref(settingsStore.optimizeThinking)
const isTestingAi = ref(false)

// 透明度防抖
let opacityTimer: ReturnType<typeof setTimeout> | null = null
const updateOpacity = () => {
  // 实时预览（通过 CSS）
  document.documentElement.style.setProperty('--window-opacity', String(windowOpacity.value))
  if (opacityTimer) clearTimeout(opacityTimer)
  opacityTimer = setTimeout(() => {
    settingsStore.setWindowOpacity(windowOpacity.value)
  }, 300)
}
// 快捷键按键监听
const handleHotkeyCapture = async (e: KeyboardEvent) => {
  const field = capturingField.value
  if (!field) return

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

    try {
      if (field === 'globalHotkey') {
        // 立即注册新快捷键
        await invoke('register_hotkey', { hotkey: fullHotkey })
        await settingsStore.changeHotkey(fullHotkey)
      } else {
        // 保存后 update_settings 会统一重注册全部快捷键
        await settingsStore.updateSettings({ optimizeHotkey: fullHotkey })
      }
      importStatus.value = '快捷键已更新为 ' + fullHotkey
    } catch (error) {
      importStatus.value = '快捷键注册失败：' + (error instanceof Error ? error.message : String(error))
    }

    capturingField.value = null
  }
}

// 开始捕获快捷键
const startHotkeyCapture = (field: HotkeyField) => {
  capturingField.value = field
  importStatus.value = '请按下新的快捷键组合...'
}

// 取消捕获
const cancelHotkeyCapture = () => {
  capturingField.value = null
  importStatus.value = null
}

// 保存单个 AI 设置项（失焦触发）
const saveAiField = (field: 'aiBaseUrl' | 'aiApiKey' | 'aiModel' | 'optimizeTemplate', value: string) => {
  settingsStore.updateSettings({ [field]: value }).catch((error) => {
    importStatus.value = 'AI 设置保存失败：' + (error instanceof Error ? error.message : String(error))
  })
}

// 切换推理模式（即时保存）
const toggleThinking = () => {
  settingsStore.updateSettings({ optimizeThinking: optimizeThinking.value }).catch((error) => {
    importStatus.value = '保存失败：' + (error instanceof Error ? error.message : String(error))
  })
}

// 测试 AI 连接（使用当前表单值，无需先保存）
const handleTestAi = async () => {
  isTestingAi.value = true
  importStatus.value = '正在测试 AI 连接...'
  try {
    const reply = await testAiConnection(aiBaseUrl.value, aiApiKey.value, aiModel.value, optimizeThinking.value)
    importStatus.value = '连接成功，模型回复：' + reply.slice(0, 30)
  } catch (error) {
    importStatus.value = '连接失败：' + (error instanceof Error ? error.message : String(error))
  } finally {
    isTestingAi.value = false
  }
}

// 关闭
const handleClose = () => {
  if (capturingField.value) {
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
        v-if="capturingField !== 'globalHotkey'"
        class="px-3 py-1.5 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#1A1A2E] dark:text-[#E4E4E7] w-24"
        @click="startHotkeyCapture('globalHotkey')"
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
      />
    </div>

    <!-- 开机自启动 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">开机自启动</span>
      <input
        v-model="launchAtLogin"
        type="checkbox"
        class="w-4 h-4"
      />
    </div>

    <!-- AI 优化设置 -->
    <div class="border-t border-[#E4E4E7] dark:border-[#27272A] pt-3 mt-3">
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
          @blur="saveAiField('aiApiKey', aiApiKey)"
        />
      </div>

      <div class="setting-item flex items-center justify-between py-1.5">
        <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">服务地址</span>
        <input
          v-model="aiBaseUrl"
          type="text"
          placeholder="https://api.deepseek.com"
          class="w-40 px-2 py-1 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent text-[#1A1A2E] dark:text-[#E4E4E7]"
          @blur="saveAiField('aiBaseUrl', aiBaseUrl)"
        />
      </div>

      <div class="setting-item flex items-center justify-between py-1.5">
        <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">模型</span>
        <input
          v-model="aiModel"
          type="text"
          placeholder="deepseek-flash"
          class="w-40 px-2 py-1 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent text-[#1A1A2E] dark:text-[#E4E4E7]"
          @blur="saveAiField('aiModel', aiModel)"
        />
      </div>

      <div class="setting-item flex items-center justify-between py-1.5">
        <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">优化快捷键</span>
        <button
          v-if="capturingField !== 'optimizeHotkey'"
          class="px-3 py-1.5 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#1A1A2E] dark:text-[#E4E4E7] w-24"
          @click="startHotkeyCapture('optimizeHotkey')"
        >
          {{ optimizeHotkey }}
        </button>
        <button
          v-else
          class="px-3 py-1.5 rounded border border-[#3B82F6] text-sm bg-[#3B82F6]/10 text-[#3B82F6] w-24 animate-pulse"
          @click="cancelHotkeyCapture"
        >
          取消
        </button>
      </div>

      <div class="setting-item flex items-center justify-between py-1.5">
        <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">推理模式</span>
        <label class="flex items-center gap-1.5 text-xs text-[#71717A] cursor-pointer">
          <input
            v-model="optimizeThinking"
            type="checkbox"
            class="w-4 h-4"
            @change="toggleThinking"
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
          @blur="saveAiField('optimizeTemplate', optimizeTemplate)"
        ></textarea>
      </div>
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