<script setup lang="ts">
import { computed, ref } from 'vue'
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

// ===== 拖拽排序 =====
// 拖起某个标签放到另一个标签上即交换顺序，order 字段随后端持久化
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const resetDragState = () => {
  dragIndex.value = null
  dragOverIndex.value = null
}

const onDragStart = (index: number, e: DragEvent) => {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    // 部分浏览器要求设置数据后拖拽才会真正开始
    e.dataTransfer.setData('text/plain', String(index))
  }
}

const onDragOver = (index: number, e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

const onDrop = (index: number) => {
  const from = dragIndex.value
  if (from !== null && from !== index) {
    const ids = promptStore.spaces.map(s => s.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(index, 0, moved)
    promptStore.reorderSpaces(ids)
  }
  resetDragState()
}
</script>

<template>
  <div
    class="space-tabs flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1A1A2E]"
    role="tablist"
  >
    <!-- 空间标签（可拖拽排序） -->
    <button
      v-for="(space, index) in spaces"
      :key="space.id"
      role="tab"
      :aria-selected="space.id === currentSpaceId"
      draggable="true"
      title="拖拽调整空间顺序"
      class="px-3.5 py-1.5 rounded-full text-sm transition-all duration-150 group relative cursor-grab active:cursor-grabbing"
      :class="[
        space.id === currentSpaceId
          ? 'bg-[#3B82F6] text-white shadow-sm'
          : 'hover:bg-[#E4E4E7]/80 dark:hover:bg-[#27272A] text-[#1A1A2E] dark:text-[#E4E4E7]',
        dragIndex === index ? 'opacity-40' : '',
        dragOverIndex === index && dragIndex !== index
          ? 'ring-2 ring-[#3B82F6] ring-offset-1'
          : ''
      ]"
      @click="selectSpace(space.id)"
      @dblclick="editSpace(space.id)"
      @dragstart="onDragStart(index, $event)"
      @dragover="onDragOver(index, $event)"
      @drop="onDrop(index)"
      @dragend="resetDragState"
      @dragleave="dragOverIndex === index && (dragOverIndex = null)"
    >
      <span class="mr-1">{{ space.icon }}</span>
      {{ space.name }}
      <!-- 编辑按钮（悬停时显示） -->
      <span
        class="ml-1 opacity-0 group-hover:opacity-100 hover:text-[#3B82F6] transition-opacity"
        title="编辑空间"
        @click.stop="editSpace(space.id)"
      >✎</span>
      <!-- 删除按钮（悬停时显示，默认空间不可删除） -->
      <span
        v-if="space.id !== 'space_default'"
        class="ml-1 opacity-0 group-hover:opacity-100 hover:text-[#EF4444] transition-opacity"
        title="删除空间"
        @click.stop="deleteSpace(space.id)"
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
