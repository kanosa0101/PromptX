<!--
  确认对话框（桌面端 + 浏览器扩展端共用的展示组件）
  状态管理由各端接入：桌面端走 props/events，扩展端用薄包装绑 uiStore
-->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
  <div
    class="confirm-dialog fixed inset-0 flex items-center justify-center z-[100]"
    role="alertdialog"
    aria-modal="true"
  >
    <!-- 背景遮罩 -->
    <div
      class="absolute inset-0 bg-black/50"
      @click="emit('cancel')"
    />

    <!-- 对话框 -->
    <div class="dialog-content animate-fade-in relative bg-white dark:bg-background-dark rounded-xl shadow-xl p-4 min-w-[280px]">
      <!-- 标题 -->
      <h3
        v-if="title"
        class="text-base font-medium mb-2 text-foreground dark:text-foreground-dark"
      >
        {{ title }}
      </h3>

      <!-- 消息 -->
      <p class="text-sm text-muted mb-4">
        {{ message }}
      </p>

      <!-- 按钮 -->
      <div class="flex justify-end gap-2">
        <button
          class="px-3 py-1.5 rounded text-sm bg-surface dark:bg-surface-dark text-foreground dark:text-foreground-dark hover:bg-surface-hover-light dark:hover:bg-surface-soft-dark"
          @click="emit('cancel')"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          class="px-3 py-1.5 rounded text-sm bg-error text-white hover:bg-error-hover"
          @click="emit('confirm')"
        >
          {{ confirmText || t('confirmDialog.deleteDefault') }}
        </button>
      </div>
    </div>
  </div>
</template>
