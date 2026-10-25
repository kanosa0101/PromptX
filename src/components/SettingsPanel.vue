<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getVersion } from '@tauri-apps/api/app'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { usePromptStore } from '@/stores/promptStore'
import HotkeyRow from './HotkeyRow.vue'
import AiSettingsSection from './AiSettingsSection.vue'

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
const searchDebounce = computed(() => settingsStore.searchDebounce)
const maxResults = computed(() => settingsStore.maxResults)

// 数值输入在 change 时提交（避免每键一次全量保存），并把越界值钳回范围内
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const commitNumber = (e: Event, lo: number, hi: number, fallback: number): number => {
  const input = e.target as HTMLInputElement
  const v = clamp(Number(input.value) || fallback, lo, hi)
  input.value = String(v)
  return v
}
const onDebounceChange = (e: Event) => {
  settingsStore.updateSettings({ searchDebounce: commitNumber(e, 100, 1000, 300) })
}
const onMaxResultsChange = (e: Event) => {
  settingsStore.updateSettings({ maxResults: commitNumber(e, 3, 20, 6) })
}

// 状态提示（本面板与 AI 设置区块共用）
const importStatus = ref<string | null>(null)

// 快捷键捕获状态（记录正在捕获哪个快捷键；按键监听挂在本面板）
type HotkeyField = 'globalHotkey' | 'optimizeHotkey' | 'clipboardOptimizeHotkey'
const capturingField = ref<HotkeyField | null>(null)

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
      } else if (field === 'optimizeHotkey') {
        // 保存后 update_settings 会统一重注册全部快捷键
        await settingsStore.updateSettings({ optimizeHotkey: fullHotkey })
      } else {
        await settingsStore.updateSettings({ clipboardOptimizeHotkey: fullHotkey })
      }
      importStatus.value = '快捷键已更新为 ' + fullHotkey
      await refreshHotkeyStatus()
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

// 保存快捷键后刷新注册状态，冲突立即提示
const refreshHotkeyStatus = async () => {
  try {
    const status = await invoke<{ name: string; hotkey: string; ok: boolean }[]>('get_hotkey_status')
    const failed = status.filter((s) => !s.ok)
    importStatus.value = failed.length
      ? failed.map((s) => `「${s.name}」${s.hotkey} 注册失败（可能被占用）`).join('；')
      : '全部快捷键注册正常'
  } catch {
    // 查询失败忽略
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
const handleImport = () => {
  // 创建文件选择器（onchange 回调在本函数返回后才执行，需自带错误处理）
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      const result = await promptStore.importData(data, true)
      importStatus.value = `导入成功！导入 ${result.importedPrompts} 个提示词，${result.importedSpaces} 个空间`
    } catch (error) {
      importStatus.value = '导入失败：' + (error instanceof Error ? error.message : String(error))
    }
  }
  input.click()
}

// 主题选项
const themeOptions = [
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
  { value: 'system', label: '跟随系统' },
]

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
    null,
  )
  return {
    count: prompts.length,
    spaces: promptStore.spaces.length,
    totalUses,
    favorites: prompts.filter((p) => p.favorite).length,
    top,
    lastUsed,
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleHotkeyCapture)
  loadAppVersion()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleHotkeyCapture)
})

// ===== 软件更新 =====
const appVersion = ref('')
const updaterState = ref<'idle' | 'checking' | 'available' | 'downloading' | 'uptodate' | 'error'>('idle')
const updaterMessage = ref('')
let pendingUpdate: Update | null = null

const loadAppVersion = async () => {
  try {
    appVersion.value = await getVersion()
  } catch {
    appVersion.value = ''
  }
}

const checkForUpdate = async () => {
  updaterState.value = 'checking'
  updaterMessage.value = ''
  try {
    const update = await check()
    if (update) {
      pendingUpdate = update
      updaterState.value = 'available'
      updaterMessage.value = `发现新版本 v${update.version}（当前 v${appVersion.value}）`
    } else {
      pendingUpdate = null
      updaterState.value = 'uptodate'
      updaterMessage.value = '已是最新版本'
    }
  } catch (error) {
    pendingUpdate = null
    updaterState.value = 'error'
    updaterMessage.value = '检查更新失败：' + (error instanceof Error ? error.message : String(error))
  }
}

const downloadAndInstall = async () => {
  if (!pendingUpdate) return
  updaterState.value = 'downloading'
  updaterMessage.value = '正在下载并安装更新，完成后应用将自动重启…'
  try {
    await pendingUpdate.downloadAndInstall()
    await relaunch()
  } catch (error) {
    updaterState.value = 'error'
    updaterMessage.value = '更新失败：' + (error instanceof Error ? error.message : String(error))
  }
}
</script>

<template>
  <div class="settings-panel p-4 bg-white dark:bg-[#1A1A2E]">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium text-[#1A1A2E] dark:text-[#E4E4E7]">
        设置
      </h3>
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
        <option
          v-for="opt in themeOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- 搜索防抖 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">搜索防抖 (ms)</span>
      <input
        :value="searchDebounce"
        type="number"
        min="100"
        max="1000"
        step="50"
        class="px-3 py-1.5 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent w-20 text-[#1A1A2E] dark:text-[#E4E4E7]"
        @change="onDebounceChange"
      >
    </div>

    <!-- 最大结果数 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">最大结果数</span>
      <input
        :value="maxResults"
        type="number"
        min="3"
        max="20"
        step="1"
        class="px-3 py-1.5 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent w-20 text-[#1A1A2E] dark:text-[#E4E4E7]"
        @change="onMaxResultsChange"
      >
    </div>

    <!-- 快捷键设置 -->
    <HotkeyRow
      label="全局快捷键"
      :hotkey="hotkey"
      :capturing="capturingField === 'globalHotkey'"
      @start="startHotkeyCapture('globalHotkey')"
      @cancel="cancelHotkeyCapture"
    />

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
      >
      <span class="text-xs text-[#71717A] w-12">{{ Math.round(windowOpacity * 100) }}%</span>
    </div>

    <!-- 失去焦点自动隐藏 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">失去焦点自动隐藏</span>
      <input
        v-model="autoHide"
        type="checkbox"
        class="w-4 h-4"
      >
    </div>

    <!-- 开机自启动 -->
    <div class="setting-item flex items-center justify-between py-2">
      <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">开机自启动</span>
      <input
        v-model="launchAtLogin"
        type="checkbox"
        class="w-4 h-4"
      >
    </div>

    <!-- AI 优化设置 -->
    <AiSettingsSection
      :capturing-field="capturingField"
      @capture="startHotkeyCapture"
      @cancel="cancelHotkeyCapture"
      @status="(message) => (importStatus = message)"
    />

    <!-- 使用统计 -->
    <div class="border-t border-[#E4E4E7] dark:border-[#27272A] pt-4 mt-4">
      <h4 class="text-sm font-medium text-[#1A1A2E] dark:text-[#E4E4E7] mb-2">
        📊 使用统计
      </h4>
      <div class="grid grid-cols-4 gap-2 text-center">
        <div>
          <div class="text-base font-medium text-[#1A1A2E] dark:text-[#E4E4E7]">
            {{ stats.count }}
          </div>
          <div class="text-xs text-[#71717A]">
            提示词
          </div>
        </div>
        <div>
          <div class="text-base font-medium text-[#1A1A2E] dark:text-[#E4E4E7]">
            {{ stats.spaces }}
          </div>
          <div class="text-xs text-[#71717A]">
            空间
          </div>
        </div>
        <div>
          <div class="text-base font-medium text-[#1A1A2E] dark:text-[#E4E4E7]">
            {{ stats.totalUses }}
          </div>
          <div class="text-xs text-[#71717A]">
            累计输出
          </div>
        </div>
        <div>
          <div class="text-base font-medium text-[#1A1A2E] dark:text-[#E4E4E7]">
            {{ stats.favorites }}
          </div>
          <div class="text-xs text-[#71717A]">
            收藏
          </div>
        </div>
      </div>
      <div
        v-if="stats.top.length"
        class="mt-3"
      >
        <div class="text-xs text-[#71717A] mb-1">
          最常用
        </div>
        <div
          v-for="(p, i) in stats.top"
          :key="p.id"
          class="flex justify-between gap-2 text-xs py-0.5"
        >
          <span class="truncate text-[#1A1A2E] dark:text-[#E4E4E7]">{{ i + 1 }}. {{ p.title }}</span>
          <span class="shrink-0 text-[#71717A]">{{ p.usageCount }} 次</span>
        </div>
      </div>
      <div
        v-if="stats.lastUsed"
        class="text-xs text-[#71717A] mt-2"
      >
        最近使用：{{ stats.lastUsed.slice(0, 16).replace('T', ' ') }}
      </div>
    </div>

    <!-- 软件更新 -->
    <div class="border-t border-[#E4E4E7] dark:border-[#27272A] pt-4 mt-4">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-[#1A1A2E] dark:text-[#E4E4E7]">
          🔄 软件更新
        </h4>
        <span
          v-if="appVersion"
          class="text-xs text-[#71717A]"
        >当前版本 v{{ appVersion }}</span>
      </div>
      <div class="flex items-center justify-between gap-2 mt-2">
        <span
          v-if="updaterMessage"
          class="text-xs text-[#71717A] truncate"
        >{{ updaterMessage }}</span>
        <span
          v-else
          class="text-xs text-[#71717A]"
        >检查并安装新版本（安装后自动重启）</span>
        <button
          v-if="updaterState === 'available'"
          class="shrink-0 px-3 py-1.5 rounded text-xs bg-[#3B82F6] text-white hover:bg-[#2563EB]"
          @click="downloadAndInstall"
        >
          下载并安装
        </button>
        <button
          v-else-if="updaterState === 'downloading'"
          class="shrink-0 px-3 py-1.5 rounded text-xs bg-[#3B82F6] text-white opacity-60 cursor-not-allowed"
          disabled
        >
          安装中…
        </button>
        <button
          v-else
          class="shrink-0 px-3 py-1.5 rounded text-xs bg-[#E4E4E7] dark:bg-[#27272A] hover:bg-[#D4D4D8] dark:hover:bg-[#3A3A3E] text-[#1A1A2E] dark:text-[#E4E4E7] disabled:opacity-50"
          :disabled="updaterState === 'checking'"
          @click="checkForUpdate"
        >
          {{ updaterState === 'checking' ? '检查中…' : '检查更新' }}
        </button>
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
      <div
        v-if="importStatus"
        class="text-xs text-[#71717A] mb-2 text-center"
      >
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
