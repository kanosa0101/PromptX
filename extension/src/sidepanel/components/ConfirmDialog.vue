<script setup lang="ts">
// 共享确认对话框的薄包装：绑定本端 uiStore 的对话框状态
import { useUiStore } from '../stores/uiStore'
import SharedConfirmDialog from '@shared/components/ConfirmDialog.vue'

const uiStore = useUiStore()
</script>

<template>
  <SharedConfirmDialog
    :title="uiStore.confirmDialogTitle"
    :message="uiStore.confirmDialogMessage"
    @confirm="uiStore.confirmAction"
    @cancel="uiStore.closeConfirmDialog"
  />
</template>
