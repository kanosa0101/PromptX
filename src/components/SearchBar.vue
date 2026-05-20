<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePromptStore } from '@/stores/promptStore'
import { useUiStore } from '@/stores/uiStore'

const promptStore = usePromptStore()
const uiStore = useUiStore()

const query = ref('')
const inputRef = ref<HTMLInputElement>()

const onInput = () => {
  promptStore.setSearchQuery(query.value)
}

const showSettings = () => {
  uiStore.showSettingsPanel()
}

const showHelp = () => {
  uiStore.openHelp()
}

// 自动聚焦输入框
onMounted(() => {
  inputRef.value?.focus()
})
</script>

<template>
  <div class="search-bar bg-white dark:bg-[#1A1A2E]">
    <div class="flex items-center gap-3 px-4 py-3">
      <!-- 搜索图标（可拖拽） -->
      <span
        data-tauri-drag-region
        class="text-[#71717A] cursor-move"
      >🔍</span>

      <!-- 搜索输入框 -->
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        placeholder="搜索提示词..."
        class="flex-1 bg-transparent outline-none text-base placeholder:text-[#71717A] text-[#1A1A2E] dark:text-[#E4E4E7]"
        @input="onInput"
      />

      <!-- 操作按钮 -->
      <div class="flex items-center gap-1">
        <button class="p-1.5 rounded hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#71717A] hover:text-[#1A1A2E] dark:hover:text-[#E4E4E7]" @click="showHelp">
          ?
        </button>
        <button class="p-1.5 rounded hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#71717A] hover:text-[#1A1A2E] dark:hover:text-[#E4E4E7]" @click="showSettings">
          ⚙️
        </button>
      </div>
    </div>
  </div>
</template>