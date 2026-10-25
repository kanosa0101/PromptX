<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePromptStore } from '@/stores/promptStore'
import PromptItem from '@/components/PromptItem.vue'

const { t } = useI18n()
const promptStore = usePromptStore()

const filteredPrompts = computed(() => promptStore.filteredPrompts)
const selectedIndex = computed(() => promptStore.selectedIndex)

// 点击选中项（不直接输出，Enter 才输出）
const onItemClick = (index: number) => {
  promptStore.moveSelection(index - promptStore.selectedIndex)
}
</script>

<template>
  <div
    class="result-list overflow-y-auto bg-white dark:bg-background-dark"
    role="listbox"
    :aria-label="t('search.listLabel')"
  >
    <!-- 结果列表 -->
    <PromptItem
      v-for="(prompt, index) in filteredPrompts"
      :key="prompt.id"
      :prompt="prompt"
      :selected="index === selectedIndex"
      @click="onItemClick(index)"
    />

    <!-- 空状态 -->
    <div
      v-if="filteredPrompts.length === 0"
      class="empty-state py-10 text-center"
    >
      <div
        class="text-3xl mb-2 opacity-40"
        aria-hidden="true"
      >
        🔍
      </div>
      <p class="text-muted text-sm">
        {{ t('search.noResults') }}
      </p>
      <p class="text-xs text-muted/70 mt-1.5">
        {{ t('search.createHint') }}
      </p>
    </div>
  </div>
</template>