<script setup lang="ts">
/**
 * 快捷键设置行：展示当前快捷键，点击进入捕获态（由父组件处理按键监听）
 */
defineProps<{
  label: string
  hotkey: string
  capturing: boolean
  hint?: string
}>()

const emit = defineEmits<{ start: []; cancel: [] }>()
</script>

<template>
  <div
    class="setting-item flex items-center justify-between py-1.5"
    :title="hint"
  >
    <span class="setting-label text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">{{ label }}</span>
    <button
      v-if="!capturing"
      class="px-3 py-1.5 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#1A1A2E] dark:text-[#E4E4E7] w-24"
      @click="emit('start')"
    >
      {{ hotkey }}
    </button>
    <button
      v-else
      class="px-3 py-1.5 rounded border border-[#3B82F6] text-sm bg-[#3B82F6]/10 text-[#3B82F6] w-24 animate-pulse"
      @click="emit('cancel')"
    >
      取消
    </button>
  </div>
</template>
