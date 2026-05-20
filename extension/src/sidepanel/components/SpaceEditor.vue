<template>
  <div class="space-editor-panel p-4 bg-white dark:bg-[#1A1A2E]">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium text-[#1A1A2E] dark:text-[#E4E4E7]">空间管理</h3>
      <button
        class="p-1 rounded hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#1A1A2E] dark:text-[#E4E4E7]"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>

    <!-- 空间列表 -->
    <div class="space-list mb-4">
      <div
        v-for="space in spaces"
        :key="space.id"
        class="space-item flex items-center justify-between p-2 rounded border border-[#E4E4E7] dark:border-[#27272A] mb-2"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg">{{ space.icon }}</span>
          <span class="text-sm text-[#1A1A2E] dark:text-[#E4E4E7]">{{ space.name }}</span>
        </div>
        <div class="flex gap-1">
          <button
            class="px-2 py-1 text-xs rounded hover:bg-[#E4E4E7] dark:hover:bg-[#27272A] text-[#71717A]"
            @click="editSpace(space)"
          >
            编辑
          </button>
          <button
            v-if="space.id !== 'space_default'"
            class="px-2 py-1 text-xs rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
            @click="deleteSpace(space.id)"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 新建空间 -->
    <button
      class="w-full px-3 py-2 rounded text-sm bg-[#3B82F6] text-white hover:bg-[#2563EB]"
      @click="showCreateForm = true"
    >
      + 新建空间
    </button>

    <!-- 创建/编辑表单 -->
    <div v-if="showCreateForm || editingSpace" class="mt-4 p-3 bg-[#F4F4F5] dark:bg-[#27272A] rounded">
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-[#1A1A2E] dark:text-[#E4E4E7] mb-1">图标</label>
          <select v-model="form.icon" class="w-full px-2 py-1 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent">
            <option v-for="icon in iconOptions" :key="icon" :value="icon">{{ icon }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-[#1A1A2E] dark:text-[#E4E4E7] mb-1">名称</label>
          <input
            v-model="form.name"
            type="text"
            class="w-full px-2 py-1 rounded border border-[#E4E4E7] dark:border-[#27272A] text-sm bg-transparent"
            placeholder="空间名称"
          />
        </div>
        <div>
          <label class="block text-sm text-[#1A1A2E] dark:text-[#E4E4E7] mb-1">颜色</label>
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
          class="flex-1 px-2 py-1 text-sm rounded bg-[#E4E4E7] dark:bg-[#3A3A3E]"
          @click="cancelEdit"
        >
          取消
        </button>
        <button
          class="flex-1 px-2 py-1 text-sm rounded bg-[#3B82F6] text-white"
          :disabled="!form.name"
          @click="saveSpace"
        >
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { usePromptStore } from '@/sidepanel/stores/promptStore'
import type { Space } from '@/types'

const emit = defineEmits<{
  close: []
}>()

const promptStore = usePromptStore()

const spaces = computed(() => promptStore.spaces)

const showCreateForm = ref(false)
const editingSpace = ref<Space | null>(null)

const form = reactive({
  icon: '📁',
  name: '',
  color: '#3B82F6'
})

const iconOptions = ['📁', '💼', '🏠', '📚', '🎨', '🔧', '📝', '🚀']
const colorOptions = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6']

const editSpace = (space: Space) => {
  editingSpace.value = space
  form.icon = space.icon
  form.name = space.name
  form.color = space.color
  showCreateForm.value = false
}

const deleteSpace = async (id: string) => {
  if (confirm('确定删除此空间？其中的提示词将移至默认空间。')) {
    // 将提示词移至默认空间
    promptStore.prompts.forEach(p => {
      if (p.spaceId === id) {
        p.spaceId = 'space_default'
      }
    })
    // 删除空间
    const index = promptStore.spaces.findIndex(s => s.id === id)
    if (index !== -1) {
      promptStore.spaces.splice(index, 1)
    }
    await promptStore.saveData()
  }
}

const cancelEdit = () => {
  showCreateForm.value = false
  editingSpace.value = null
  form.name = ''
  form.icon = '📁'
  form.color = '#3B82F6'
}

const saveSpace = async () => {
  if (!form.name) return

  if (editingSpace.value) {
    // 更新空间
    const space = promptStore.spaces.find(s => s.id === editingSpace.value!.id)
    if (space) {
      space.name = form.name
      space.icon = form.icon
      space.color = form.color
      space.updatedAt = new Date().toISOString()
    }
  } else {
    // 创建新空间
    await promptStore.createSpace({
      name: form.name,
      icon: form.icon,
      color: form.color
    })
  }

  await promptStore.saveData()
  cancelEdit()
}
</script>