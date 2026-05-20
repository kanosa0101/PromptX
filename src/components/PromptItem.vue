<script setup lang="ts">
import type { SearchResult } from '@/types'
import { highlightMatches, truncate } from '@/composables/useSearch'
import { useUiStore } from '@/stores/uiStore'
import { usePromptStore } from '@/stores/promptStore'

const props = defineProps<{
  prompt: SearchResult
  selected: boolean
}>()

defineEmits<{
  click: []
}>()

const uiStore = useUiStore()
const promptStore = usePromptStore()

// 格式化匹配高亮
const formatTitle = (prompt: SearchResult) => {
  const titleMatches = prompt.matches?.filter((m) => m.key === 'title')
  return highlightMatches(prompt.title, titleMatches)
}

// 格式化内容摘要
const formatContent = (prompt: SearchResult) => {
  const contentMatches = prompt.matches?.filter((m) => m.key === 'content')
  const truncated = truncate(prompt.content, 80)
  return highlightMatches(truncated, contentMatches)
}

// 格式化变量显示
const formatVariables = (variables: { name: string }[]) => {
  return variables.map(v => '\{\{' + v.name + '\}\}').join(' ')
}

// 编辑
const handleEdit = () => {
  uiStore.openPromptEditor(props.prompt)
}

// 删除
const handleDelete = () => {
  uiStore.openConfirmDialog(
    '确定删除此提示词吗？',
    () => {
      promptStore.deletePrompt(props.prompt.id)
    },
    '删除提示词'
  )
}
</script>

<template>
  <div
    class="prompt-item px-4 py-3 cursor-pointer transition-colors duration-100 relative"
    :class="[
      selected
        ? 'bg-[#3B82F6]/10 dark:bg-[#60A5FA]/20 border-l-2 border-[#3B82F6]'
        : 'hover:bg-[#E4E4E7]/50 dark:hover:bg-[#27272A]/50'
    ]"
    @click="$emit('click')"
  >
    <!-- 操作按钮（选中时显示） -->
    <div v-if="selected" class="absolute right-2 top-2 flex gap-1">
      <button
        class="p-1 rounded hover:bg-[#3B82F6]/20 text-[#71717A] hover:text-[#3B82F6]"
        @click.stop="handleEdit"
        title="编辑 (Ctrl+E)"
      >
        ✏️
      </button>
      <button
        class="p-1 rounded hover:bg-[#EF4444]/20 text-[#71717A] hover:text-[#EF4444]"
        @click.stop="handleDelete"
        title="删除 (Ctrl+D)"
      >
        🗑️
      </button>
    </div>

    <!-- 标题 -->
    <div class="font-medium text-sm text-[#1A1A2E] dark:text-[#E4E4E7]" v-html="formatTitle(prompt)" />

    <!-- 内容摘要 -->
    <div class="text-xs text-[#71717A] mt-1 line-clamp-1" v-html="formatContent(prompt)" />

    <!-- 标签 -->
    <div class="prompt-tags flex gap-1 mt-2">
      <span
        v-for="tag in prompt.tags"
        :key="tag"
        class="text-xs px-2 py-0.5 rounded bg-[#E4E4E7]/50 dark:bg-[#27272A]/50 text-[#71717A]"
      >
        {{ tag }}
      </span>
    </div>

    <!-- 变量提示 -->
    <div v-if="prompt.variables.length > 0" class="text-xs text-[#3B82F6] mt-1">
      {{ formatVariables(prompt.variables) }}
    </div>
  </div>
</template>