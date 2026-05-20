<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Prompt } from '@/types'
import { usePromptStore } from '@/stores/promptStore'

const props = defineProps<{
  prompt?: Prompt | null
}>()

const emit = defineEmits<{
  save: [prompt: Prompt]
  close: []
}>()

const promptStore = usePromptStore()

// 表单状态
const title = ref('')
const content = ref('')
const tagsInput = ref('')
const tags = ref<string[]>([])
const spaceId = ref('space_default')

// 可用空间列表
const spaces = computed(() => promptStore.spaces)

// 初始化表单
watch(() => props.prompt, (prompt) => {
  if (prompt) {
    title.value = prompt.title
    content.value = prompt.content
    tags.value = prompt.tags
    spaceId.value = prompt.spaceId
  } else {
    title.value = ''
    content.value = ''
    tags.value = []
    spaceId.value = promptStore.currentSpaceId
  }
}, { immediate: true })

// 解析出的变量
const parsedVariables = computed(() => {
  const regex = /\{\{(\w+)\}\}/g
  const variables: string[] = []
  let match
  while ((match = regex.exec(content.value)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }
  return variables
})

// 格式化变量显示
const formattedVariables = computed(() => {
  return parsedVariables.value.map(v => '{{' + v + '}}').join(' ')
})

// 标签操作
const addTag = () => {
  if (tagsInput.value.trim() && !tags.value.includes(tagsInput.value.trim())) {
    tags.value.push(tagsInput.value.trim())
    tagsInput.value = ''
  }
}
const removeTag = (index: number) => {
  tags.value.splice(index, 1)
}

// 保存
const handleSave = async () => {
  if (!title.value.trim()) {
    return
  }

  const promptData: Prompt = {
    id: props.prompt?.id || '',
    title: title.value,
    content: content.value,
    tags: tags.value,
    spaceId: spaceId.value,
    variables: parsedVariables.value.map((name) => ({
      name,
      type: ['clipboard', 'date', 'time', 'timestamp'].includes(name) ? 'system' : 'custom',
    })),
    usageCount: props.prompt?.usageCount || 0,
    lastUsedAt: props.prompt?.lastUsedAt || null,
    createdAt: props.prompt?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  emit('save', promptData)
}

// 关闭
const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div class="prompt-editor p-4 bg-background-light dark:bg-background-dark">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium">
        {{ prompt ? '编辑提示词' : '新建提示词' }}
      </h3>
      <button class="icon-btn" @click="handleClose">✕</button>
    </div>

    <!-- 标题 -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">标题</label>
      <input
        v-model="title"
        type="text"
        placeholder="提示词标题"
        class="w-full px-3 py-2 rounded border border-border bg-transparent focus:outline-none focus:border-primary"
      />
    </div>

    <!-- 内容 -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">内容</label>
      <textarea
        v-model="content"
        placeholder="提示词内容，支持 {{变量名}} 语法"
        rows="4"
        class="w-full px-3 py-2 rounded border border-border bg-transparent focus:outline-none focus:border-primary resize-none"
      />
      <!-- 变量提示 -->
      <div v-if="parsedVariables.length > 0" class="text-xs text-muted mt-2">
        已识别变量:
        <span class="text-primary">
          {{ formattedVariables }}
        </span>
      </div>
    </div>

    <!-- 标签 -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">标签</label>
      <div class="flex gap-1 mb-2">
        <span
          v-for="(tag, index) in tags"
          :key="tag"
          class="tag text-xs px-2 py-1 rounded bg-border cursor-pointer"
          @click="removeTag(index)"
        >
          {{ tag }} ✕
        </span>
      </div>
      <input
        v-model="tagsInput"
        type="text"
        placeholder="输入标签后按 Enter 添加"
        class="w-full px-3 py-2 rounded border border-border bg-transparent focus:outline-none focus:border-primary"
        @keyup.enter="addTag"
      />
    </div>

    <!-- 空间选择 -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">所属空间</label>
      <select
        v-model="spaceId"
        class="w-full px-3 py-2 rounded border border-border bg-transparent focus:outline-none focus:border-primary"
      >
        <option v-for="space in spaces" :key="space.id" :value="space.id">
          {{ space.icon }} {{ space.name }}
        </option>
      </select>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-end gap-2">
      <button class="btn btn-secondary" @click="handleClose">
        取消
      </button>
      <button class="btn btn-primary" :disabled="!title.trim()" @click="handleSave">
        {{ prompt ? '保存' : '创建' }}
      </button>
    </div>
  </div>
</template>