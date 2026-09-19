<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { usePromptStore } from '@/stores/promptStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'

const promptStore = usePromptStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()

// 本地输入值（用于防抖，避免每次击键都更新 store）
const localQuery = ref(promptStore.searchQuery)

// 防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// 本地输入 → 防抖后同步到 store
function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  const delay = settingsStore.searchDebounce || 300
  debounceTimer = setTimeout(() => {
    promptStore.setSearchQuery(localQuery.value)
  }, delay)
}

// 外部变化（如清空搜索）→ 同步回本地
watch(() => promptStore.searchQuery, (newVal) => {
  if (newVal !== localQuery.value) {
    localQuery.value = newVal
  }
})

const inputRef = ref<HTMLInputElement>()

const showSettings = () => {
  uiStore.showSettingsPanel()
}

const showHelp = () => {
  uiStore.openHelp()
}

// 自动聚焦输入框（面板关闭后也恢复焦点）
watch(() => uiStore.showSettings || uiStore.showHelp || uiStore.showPromptEditor || uiStore.showSpaceEditor || uiStore.showVariableForm, (isPanelOpen) => {
  if (!isPanelOpen) {
    setTimeout(() => inputRef.value?.focus(), 50)
  }
})

onMounted(() => {
  inputRef.value?.focus()
})
</script>

<template>
  <div class="search-bar bg-white dark:bg-[#1A1A2E]" role="search">
    <div class="flex items-center gap-3 px-4 py-3">
      <!-- 搜索图标（可拖拽） -->
      <span
        data-tauri-drag-region
        class="text-[#71717A] cursor-move"
      >🔍</span>

      <!-- 搜索输入框 -->
      <input
        ref="inputRef"
        v-model="localQuery"
        @input="onInput"
        type="text"
        placeholder="搜索提示词..."
        aria-label="搜索提示词"
        class="flex-1 bg-transparent outline-none text-base placeholder:text-[#71717A] text-[#1A1A2E] dark:text-[#E4E4E7]"
      />

      <!-- 操作按钮 -->
      <div class="flex items-center gap-1">
        <button class="p-1.5 rounded hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#71717A] hover:text-[#1A1A2E] dark:hover:text-[#E4E4E7]" aria-label="帮助" @click="showHelp">
          ?
        </button>
        <button class="p-1.5 rounded hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#71717A] hover:text-[#1A1A2E] dark:hover:text-[#E4E4E7]" aria-label="设置" @click="showSettings">
          ⚙️
        </button>
      </div>
    </div>
  </div>
</template>
