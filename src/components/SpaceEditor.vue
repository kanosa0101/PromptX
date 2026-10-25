<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePromptStore } from '@/stores/promptStore'
import { SPACE_ICON_OPTIONS, SPACE_COLOR_OPTIONS } from '@shared/spaceOptions'
import type { Space } from '@/types'

const { t } = useI18n()

const props = defineProps<{
  space?: Space | null
}>()

const promptStore = usePromptStore()

const emit = defineEmits<{
  close: []
}>()

const isEditing = computed(() => !!props.space)

// 表单状态
const name = ref('')
const icon = ref('📁')
const color = ref('#3B82F6')

// 从 props 初始化（编辑模式）
watch(() => props.space, (space) => {
  if (space) {
    name.value = space.name
    icon.value = space.icon
    color.value = space.color
  } else {
    name.value = ''
    icon.value = '📁'
    color.value = '#3B82F6'
  }
}, { immediate: true })

// 可选图标/颜色（双端共用，见 shared/spaceOptions.ts）
const iconOptions = SPACE_ICON_OPTIONS
const colorOptions = SPACE_COLOR_OPTIONS

// 保存
const handleSave = async () => {
  if (!name.value.trim()) {
    return
  }

  try {
    if (isEditing.value && props.space) {
      await promptStore.updateSpace(props.space.id, {
        name: name.value.trim(),
        icon: icon.value,
        color: color.value,
      })
    } else {
      await promptStore.createSpace(name.value.trim(), icon.value, color.value)
    }
    emit('close')
  } catch (error) {
    console.error('Failed to save space:', error)
  }
}

// 关闭
const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div class="p-4 bg-white dark:bg-background-dark text-foreground dark:text-foreground-dark">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium">
        {{ isEditing ? t('spaceEditor.editSpace') : t('spaceEditor.newSpace') }}
      </h3>
      <button
        class="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark"
        @click="handleClose"
      >
        ✕
      </button>
    </div>

    <!-- 名称 -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">{{ t('common.name') }}</label>
      <input
        v-model="name"
        type="text"
        :placeholder="t('spaceEditor.namePlaceholder')"
        class="w-full px-3 py-2 rounded border border-surface dark:border-surface-dark bg-transparent focus:outline-none focus:border-primary text-sm"
      >
    </div>

    <!-- 图标 -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">{{ t('common.icon') }}</label>
      <div class="flex gap-2">
        <button
          v-for="ic in iconOptions"
          :key="ic"
          class="w-8 h-8 rounded flex items-center justify-center text-lg"
          :class="[
            icon === ic
              ? 'bg-primary text-white'
              : 'bg-surface dark:bg-surface-dark hover:bg-primary/20'
          ]"
          @click="icon = ic"
        >
          {{ ic }}
        </button>
      </div>
    </div>

    <!-- 颜色 -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">{{ t('common.color') }}</label>
      <div class="flex gap-2">
        <button
          v-for="c in colorOptions"
          :key="c"
          class="w-8 h-8 rounded flex items-center justify-center"
          :class="[color === c ? 'ring-2 ring-offset-2 ring-background-dark dark:ring-surface' : '']"
          :style="{ backgroundColor: c }"
          @click="color = c"
        >
          <span
            v-if="color === c"
            class="text-white"
          >✓</span>
        </button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-end gap-2">
      <button
        class="px-4 py-2 rounded text-sm bg-surface dark:bg-surface-dark hover:bg-surface-hover-light dark:hover:bg-surface-hover-dark"
        @click="handleClose"
      >
        {{ t('common.cancel') }}
      </button>
      <button
        class="px-4 py-2 rounded text-sm bg-primary text-white hover:bg-primary-hover"
        :disabled="!name.trim()"
        @click="handleSave"
      >
        {{ isEditing ? t('common.save') : t('common.create') }}
      </button>
    </div>
  </div>
</template>
