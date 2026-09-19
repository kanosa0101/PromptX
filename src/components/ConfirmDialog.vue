<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

defineProps<{
  title?: string
  message: string
  confirmText?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

// 处理键盘事件
const handleKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    emit('confirm')
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('cancel')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey)
})
</script>

<template>
  <div class="confirm-dialog fixed inset-0 flex items-center justify-center z-[100]" role="alertdialog" aria-modal="true">
    <!-- 背景遮罩 -->
    <div
      class="absolute inset-0 bg-black/50"
      @click="emit('cancel')"
    />

    <!-- 对话框 -->
    <div class="dialog-content animate-fade-in relative bg-white dark:bg-[#1A1A2E] rounded-xl shadow-xl p-4 min-w-[280px]">
      <!-- 标题 -->
      <h3 v-if="title" class="text-base font-medium mb-2 text-[#1A1A2E] dark:text-[#E4E4E7]">
        {{ title }}
      </h3>

      <!-- 消息 -->
      <p class="text-sm text-[#71717A] mb-4">
        {{ message }}
      </p>

      <!-- 按钮 -->
      <div class="flex justify-end gap-2">
        <button
          class="px-3 py-1.5 rounded text-sm bg-[#E4E4E7] dark:bg-[#27272A] text-[#1A1A2E] dark:text-[#E4E4E7] hover:bg-[#D4D4D8] dark:hover:bg-[#3F3F46]"
          @click="emit('cancel')"
        >
          取消
        </button>
        <button
          class="px-3 py-1.5 rounded text-sm bg-[#EF4444] text-white hover:bg-[#DC2626]"
          @click="emit('confirm')"
        >
          {{ confirmText || '删除' }}
        </button>
      </div>
    </div>
  </div>
</template>