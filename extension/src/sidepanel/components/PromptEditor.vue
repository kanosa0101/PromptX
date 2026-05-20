<template>
  <div class="editor-panel">
    <h3 class="text-lg font-bold mb-4">
      {{ prompt ? '编辑提示词' : '新建提示词' }}
    </h3>

    <div class="space-y-3">
      <div>
        <label class="block text-sm font-medium mb-1">标题</label>
        <input
          v-model="form.title"
          type="text"
          placeholder="提示词标题..."
          class="editor-input"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">内容</label>
        <textarea
          v-model="form.content"
          placeholder="提示词内容，可使用 {{clipboard}}、{{date}}、{{time}} 等变量..."
          class="editor-textarea"
        />
        <p class="text-xs text-gray-500 mt-1">
          支持 {{clipboard}} (页面选区)、{{date}}、{{time}}、{{timestamp}} 等系统变量
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">标签</label>
        <input
          v-model="tagsInput"
          type="text"
          placeholder="标签 (逗号分隔)..."
          class="editor-input"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">空间</label>
        <select v-model="form.spaceId" class="editor-input">
          <option v-for="space in spaces" :key="space.id" :value="space.id">
            {{ space.icon }} {{ space.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="flex gap-2 mt-4">
      <button class="btn btn-secondary flex-1" @click="$emit('cancel')">
        取消
      </button>
      <button class="btn btn-primary flex-1" @click="onSave" :disabled="!form.title || !form.content">
        保存
      </button>
    </div>

    <button
      v-if="prompt"
      class="btn btn-secondary w-full mt-2 text-red-500"
      @click="onDelete"
    >
      删除提示词
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import type { Prompt, Space } from '@/types'

const props = defineProps<{
  prompt?: Prompt | null
  spaces: Space[]
}>()

const emit = defineEmits<{
  save: [data: { title: string; content: string; tags: string[]; spaceId: string }]
  delete: [id: string]
  cancel: []
}>()

const form = reactive({
  title: props.prompt?.title || '',
  content: props.prompt?.content || '',
  spaceId: props.prompt?.spaceId || props.spaces[0]?.id || 'space_default'
})

const tagsInput = ref(props.prompt?.tags.join(', ') || '')

const onSave = () => {
  const tags = tagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  emit('save', {
    title: form.title,
    content: form.content,
    tags,
    spaceId: form.spaceId
  })
}

const onDelete = () => {
  if (props.prompt && confirm('确定删除此提示词？')) {
    emit('delete', props.prompt.id)
  }
}
</script>