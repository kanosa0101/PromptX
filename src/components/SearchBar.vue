<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePromptStore } from '@/stores/promptStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'

const { t } = useI18n()
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
  <div
    class="search-bar group bg-white dark:bg-background-dark border-b border-black/5 dark:border-white/5"
    role="search"
  >
    <div class="flex items-center gap-3 px-4 py-3">
      <!-- 搜索图标（可拖拽） -->
      <span
        data-tauri-drag-region
        class="text-muted group-focus-within:text-primary transition-colors cursor-move"
      >🔍</span>

      <!-- 搜索输入框 -->
      <input
        ref="inputRef"
        v-model="localQuery"
        type="text"
        :placeholder="t('search.placeholderDesktop')"
        :aria-label="t('search.placeholderDesktop')"
        class="flex-1 bg-transparent outline-none text-base placeholder:text-muted text-foreground dark:text-foreground-dark"
        @input="onInput"
      >

      <!-- 操作按钮 -->
      <div class="flex items-center gap-1">
        <button
          class="p-1.5 rounded hover:bg-surface dark:hover:bg-surface-dark text-muted hover:text-foreground dark:hover:text-foreground-dark"
          :aria-label="t('common.help')"
          @click="showHelp"
        >
          ?
        </button>
        <button
          class="p-1.5 rounded hover:bg-surface dark:hover:bg-surface-dark text-muted hover:text-foreground dark:hover:text-foreground-dark"
          :aria-label="t('common.settings')"
          @click="showSettings"
        >
          ⚙️
        </button>
      </div>
    </div>
  </div>
</template>
