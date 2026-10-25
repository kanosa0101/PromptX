<template>
  <div class="space-editor-panel p-4 bg-white dark:bg-background-dark">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium text-foreground dark:text-foreground-dark">
        {{ t('spaceEditor.manageSpaces') }}
      </h3>
      <button
        class="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark text-foreground dark:text-foreground-dark"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>

    <!-- 空间列表 -->
    <div class="space-list mb-4">
      <div
        v-for="space in spaces"
        :key="space.id"
        class="space-item flex items-center justify-between p-2 rounded border border-surface dark:border-surface-dark mb-2"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg">{{ space.icon }}</span>
          <span class="text-sm text-foreground dark:text-foreground-dark">{{ space.name }}</span>
        </div>
        <div class="flex gap-1">
          <button
            class="px-2 py-1 text-xs rounded hover:bg-surface dark:hover:bg-surface-dark text-muted"
            @click="editSpace(space)"
          >
            {{ t('common.edit') }}
          </button>
          <button
            v-if="space.id !== 'space_default'"
            class="px-2 py-1 text-xs rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
            @click="deleteSpace(space.id)"
          >
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 新建空间 -->
    <button
      class="w-full px-3 py-2 rounded text-sm bg-primary text-white hover:bg-primary-hover"
      @click="showCreateForm = true"
    >
      + {{ t('spaceEditor.newSpace') }}
    </button>

    <!-- 创建/编辑表单 -->
    <div
      v-if="showCreateForm || editingSpace"
      class="mt-4 p-3 bg-surface-soft-light dark:bg-surface-dark rounded"
    >
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-foreground dark:text-foreground-dark mb-1">{{ t('common.icon') }}</label>
          <select
            v-model="form.icon"
            class="w-full px-2 py-1 rounded border border-surface dark:border-surface-dark text-sm bg-transparent"
          >
            <option
              v-for="icon in iconOptions"
              :key="icon"
              :value="icon"
            >
              {{ icon }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-foreground dark:text-foreground-dark mb-1">{{ t('common.name') }}</label>
          <input
            v-model="form.name"
            type="text"
            class="w-full px-2 py-1 rounded border border-surface dark:border-surface-dark text-sm bg-transparent"
            :placeholder="t('spaceEditor.namePlaceholder')"
          >
        </div>
        <div>
          <label class="block text-sm text-foreground dark:text-foreground-dark mb-1">{{ t('common.color') }}</label>
          <div class="flex gap-2">
            <button
              v-for="color in colorOptions"
              :key="color"
              :class="['w-6 h-6 rounded', { 'ring-2 ring-offset-1': form.color === color }]"
              :style="{ backgroundColor: color }"
              @click="form.color = color"
            />
          </div>
        </div>
      </div>
      <div class="flex gap-2 mt-3">
        <button
          class="flex-1 px-2 py-1 text-sm rounded bg-surface dark:bg-surface-hover-dark"
          @click="cancelEdit"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          class="flex-1 px-2 py-1 text-sm rounded bg-primary text-white"
          :disabled="!form.name"
          @click="saveSpace"
        >
          {{ t('common.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePromptStore } from '@/sidepanel/stores/promptStore'
import { useUiStore } from '../stores/uiStore'
import { SPACE_ICON_OPTIONS, SPACE_COLOR_OPTIONS } from '@shared/spaceOptions'
import type { Space } from '@/types'

const { t } = useI18n()

const emit = defineEmits<{
  close: []
}>()

const promptStore = usePromptStore()
const uiStore = useUiStore()

const spaces = computed(() => promptStore.spaces)

const showCreateForm = ref(false)
const editingSpace = ref<Space | null>(null)

const form = reactive({
  icon: '📁',
  name: '',
  color: '#3B82F6'
})

// 可选图标/颜色（双端共用，见 shared/spaceOptions.ts）
const iconOptions = SPACE_ICON_OPTIONS
const colorOptions = SPACE_COLOR_OPTIONS

const editSpace = (space: Space) => {
  editingSpace.value = space
  form.icon = space.icon
  form.name = space.name
  form.color = space.color
  showCreateForm.value = false
}

const deleteSpace = (id: string) => {
  uiStore.openConfirmDialog(
    t('spaceEditor.confirmDeleteWithPrompts'),
    async () => {
      // 走 store 动作：统一处理提示词迁移、当前空间切换与持久化
      // （此前内联实现漏了 currentSpaceId 重置，删除当前空间后列表空白）
      await promptStore.deleteSpace(id)
    },
    t('spaceTabs.deleteSpace')
  )
}

const cancelEdit = () => {
  showCreateForm.value = false
  editingSpace.value = null
  form.name = ''
  form.icon = '📁'
  form.color = '#3B82F6'
}

const saveSpace = async () => {
  const name = form.name.trim()
  if (!name) return

  if (editingSpace.value) {
    await promptStore.updateSpace(editingSpace.value.id, {
      name,
      icon: form.icon,
      color: form.color
    })
  } else {
    // 创建新空间
    await promptStore.createSpace({
      name,
      icon: form.icon,
      color: form.color
    })
  }

  cancelEdit()
}
</script>