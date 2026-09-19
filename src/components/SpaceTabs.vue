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

const editSpace = (spaceId: string) => {
  const space = promptStore.spaces.find(s => s.id === spaceId)
  if (space) {
    uiStore.openSpaceEditor(space)
  }
}

const showCreateSpace = () => {
  uiStore.openSpaceEditor()
}

const deleteSpace = (spaceId: string) => {
  if (spaceId === 'space_default') return
  const promptCount = promptStore.prompts.filter(p => p.spaceId === spaceId).length
  const msg = promptCount > 0
    ? `确定删除此空间吗？空间内的 ${promptCount} 个提示词将移至默认空间。`
    : '确定删除此空间吗？'
  uiStore.openConfirmDialog(
    msg,
    () => {
      promptStore.deleteSpace(spaceId)
    },
    '删除空间'
  )
}
</script>

<template>
  <div class="space-tabs flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1A1A2E]" role="tablist">
    <!-- 空间标签 -->
    <button
      v-for="space in spaces"
      :key="space.id"
      role="tab"
      :aria-selected="space.id === currentSpaceId"
      class="px-3.5 py-1.5 rounded-full text-sm transition-all duration-150 group relative"
      :class="[
        space.id === currentSpaceId
          ? 'bg-[#3B82F6] text-white shadow-sm'
          : 'hover:bg-[#E4E4E7]/80 dark:hover:bg-[#27272A] text-[#1A1A2E] dark:text-[#E4E4E7]'
      ]"
      @click="selectSpace(space.id)"
      @dblclick="editSpace(space.id)"
    >
      <span class="mr-1">{{ space.icon }}</span>
      {{ space.name }}
      <!-- 编辑按钮（悬停时显示） -->
      <span
        class="ml-1 opacity-0 group-hover:opacity-100 hover:text-[#3B82F6] transition-opacity"
        @click.stop="editSpace(space.id)"
        title="编辑空间"
      >✎</span>
      <!-- 删除按钮（悬停时显示，默认空间不可删除） -->
      <span
        v-if="space.id !== 'space_default'"
        class="ml-1 opacity-0 group-hover:opacity-100 hover:text-[#EF4444] transition-opacity"
        @click.stop="deleteSpace(space.id)"
        title="删除空间"
      >✕</span>
    </button>

    <!-- 新建空间按钮 -->
    <button
      class="px-3 py-1.5 rounded text-sm text-[#71717A] hover:bg-[#E4E4E7] dark:hover:bg-[#27272A]"
      aria-label="新建空间"
      @click="showCreateSpace"
    >
      ➕
    </button>
  </div>
</template>