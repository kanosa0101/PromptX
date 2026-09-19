<script setup lang="ts">
import { computed } from 'vue'
import { usePromptStore } from '@/stores/promptStore'
import PromptItem from '@/components/PromptItem.vue'

const promptStore = usePromptStore()

const filteredPrompts = computed(() => promptStore.filteredPrompts)
const selectedIndex = computed(() => promptStore.selectedIndex)

// 点击选中项（不直接输出，Enter 才输出）
const onItemClick = (index: number) => {
  promptStore.moveSelection(index - promptStore.selectedIndex)
}
</script>

<template>
  <div class="result-list overflow-y-auto bg-white dark:bg-[#1A1A2E]" role="listbox" aria-label="提示词列表">
    <!-- 结果列表 -->
    <PromptItem
      v-for="(prompt, index) in filteredPrompts"
      :key="prompt.id"
      :prompt="prompt"
      :selected="index === selectedIndex"
      @click="onItemClick(index)"
    />

    <!-- 空状态 -->
    <div v-if="filteredPrompts.length === 0" class="empty-state py-10 text-center">
      <div class="text-3xl mb-2 opacity-40" aria-hidden="true">🔍</div>
      <p class="text-[#71717A] text-sm">暂无匹配结果</p>
      <p class="text-xs text-[#71717A]/70 mt-1.5">按 Ctrl+N 创建新提示词</p>
    </div>
  </div>
</template>