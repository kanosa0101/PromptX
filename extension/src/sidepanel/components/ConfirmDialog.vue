<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useUiStore } from '../stores/uiStore'

const uiStore = useUiStore()

const title = () => uiStore.confirmDialogTitle
const message = () => uiStore.confirmDialogMessage

const onConfirm = () => {
  uiStore.confirmAction()
}

const onCancel = () => {
  uiStore.closeConfirmDialog()
}

const handleKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    onConfirm()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    onCancel()
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
  <div class="confirm-dialog-overlay" role="alertdialog" aria-modal="true">
    <div class="confirm-dialog-backdrop" @click="onCancel" />
    <div class="confirm-dialog-content">
      <h3 v-if="title()" class="confirm-dialog-title">
        {{ title() }}
      </h3>
      <p class="confirm-dialog-message">
        {{ message() }}
      </p>
      <div class="confirm-dialog-actions">
        <button class="btn btn-secondary" @click="onCancel">
          取消
        </button>
        <button class="btn btn-danger" @click="onConfirm">
          删除
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-dialog-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.confirm-dialog-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.confirm-dialog-content {
  position: relative;
  @apply bg-background-light dark:bg-background-dark rounded-lg shadow-lg p-4 min-w-[280px];
}

.confirm-dialog-title {
  @apply text-base font-medium mb-2 text-foreground-light dark:text-foreground-dark;
}

.confirm-dialog-message {
  @apply text-sm text-gray-500 dark:text-gray-400 mb-4;
}

.confirm-dialog-actions {
  @apply flex justify-end gap-2;
}

.btn-danger {
  @apply bg-red-500 text-white hover:bg-red-600;
}
</style>
