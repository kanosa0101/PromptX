<script setup lang="ts">
import { computed } from 'vue'
import { usePromptStore } from '@/stores/promptStore'
import { useUiStore } from '@/stores/uiStore'

const promptStore = usePromptStore()
const uiStore = useUiStore()

const spaces = computed(() => promptStore.spaces)
const currentSpaceId = computed(() => promptStore.currentSpaceId)

const selectSpace = (spaceId: string) => {
  promptStore.setCurrentSpace(spaceId)
}

const showCreateSpace = () => {
  uiStore.openSpaceEditor()
}
</script>

<template>
  <div class="space-tabs flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1A1A2E]">
    <!-- 空间标签 -->
    <button
      v-for="space in spaces"
      :key="space.id"
      class="px-3 py-1.5 rounded text-sm transition-colors duration-100"
      :class="[
        space.id === currentSpaceId
          ? 'bg-[#3B82F6] text-white'
          : 'hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#1A1A2E] dark:text-[#E4E4E7]'
      ]"
      @click="selectSpace(space.id)"
    >
      <span class="mr-1">{{ space.icon }}</span>
      {{ space.name }}
    </button>

    <!-- 新建空间按钮 -->
    <button
      class="px-3 py-1.5 rounded text-sm text-[#71717A] hover:bg-[#E4E4E7] dark:hover:bg-[#27272A]"
      @click="showCreateSpace"
    >
      ➕
    </button>
  </div>
</template>