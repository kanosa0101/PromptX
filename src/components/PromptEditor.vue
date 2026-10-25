<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { Prompt, Variable } from '@/types'
import { usePromptStore } from '@/stores/promptStore'
import { parseVariables } from '@shared/variable'
import { loadDraft, saveDraft, clearDraft, type EditorDraft } from '@shared/draft'

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

// 草稿：按提示词 ID 隔离（新建共用 'new'）
const draftId = computed(() => props.prompt?.id || 'new')
const draftBanner = ref<EditorDraft | null>(null)

// 可用空间列表
const spaces = computed(() => promptStore.spaces)

// 表单初始化：编辑现有 / 新建（拷贝数组，避免编辑中途改动 store 内对象）
const initFormValues = () => {
  if (props.prompt) {
    title.value = props.prompt.title
    content.value = props.prompt.content
    tags.value = [...props.prompt.tags]
    spaceId.value = props.prompt.spaceId
  } else {
    title.value = ''
    content.value = ''
    tags.value = []
    spaceId.value = promptStore.currentSpaceId
  }
}

// 初始化表单
watch(() => props.prompt, () => {
  initFormValues()
  // 恢复未保存草稿（意外关闭后再次打开同一提示词时）。
  // 内容全空的草稿视为无意义，直接清掉不提示
  const draft = loadDraft(draftId.value)
  if (draft && (draft.title.trim() !== '' || draft.content.trim() !== '')) {
    title.value = draft.title
    content.value = draft.content
    tags.value = [...draft.tags]
    if (draft.spaceId) {
      spaceId.value = draft.spaceId
    }
    draftBanner.value = draft
  } else {
    if (draft) {
      clearDraft(draftId.value)
    }
    draftBanner.value = null
  }
}, { immediate: true })

// 草稿自动保存：任意字段变化即写入 localStorage（廉价写，无需防抖）。
// 初始赋值发生在上方 immediate watch 内，先于本 watcher 注册，不会产生"空草稿"
const persistDraft = () => {
  saveDraft(draftId.value, {
    title: title.value,
    content: content.value,
    tags: tags.value,
    spaceId: spaceId.value,
  })
}
watch([title, content, spaceId], persistDraft)
watch(tags, persistDraft, { deep: true })

// 丢弃草稿：恢复原始值并清除。表单重置会触发上面的自动保存，
// 需等它执行完（nextTick 后 watcher 已 flush）再清除，否则清除会被覆盖
const discardDraft = async () => {
  initFormValues()
  await nextTick()
  clearDraft(draftId.value)
  draftBanner.value = null
}

// 草稿保存时间（MM-DD HH:mm）
const formatDraftTime = (ts: number) => {
  if (!ts) return '早前'
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 解析出的变量（复用 shared/variable.ts，与保存到后端的解析保持同一实现）
const parsedVariables = computed<Variable[]>(() => parseVariables(content.value))

// 格式化变量显示
const formattedVariables = computed(() => {
  return parsedVariables.value.map(v => `{{${v.name}}}`).join(' ')
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
    variables: parsedVariables.value,
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
      <button
        class="icon-btn"
        @click="handleClose"
      >
        ✕
      </button>
    </div>

    <!-- 草稿恢复提示 -->
    <div
      v-if="draftBanner"
      class="mb-4 px-3 py-2 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2"
    >
      <span>已恢复 {{ formatDraftTime(draftBanner.savedAt) }} 的未保存草稿</span>
      <button
        class="shrink-0 underline hover:no-underline"
        @click="discardDraft"
      >
        丢弃
      </button>
    </div>

    <!-- 标题 -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">标题</label>
      <input
        v-model="title"
        type="text"
        placeholder="提示词标题"
        class="w-full px-3 py-2 rounded border border-border bg-transparent focus:outline-none focus:border-primary"
      >
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
      <div
        v-if="parsedVariables.length > 0"
        class="text-xs text-muted mt-2"
      >
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
      >
    </div>

    <!-- 空间选择 -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">所属空间</label>
      <select
        v-model="spaceId"
        class="w-full px-3 py-2 rounded border border-border bg-transparent focus:outline-none focus:border-primary"
      >
        <option
          v-for="space in spaces"
          :key="space.id"
          :value="space.id"
        >
          {{ space.icon }} {{ space.name }}
        </option>
      </select>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-end gap-2">
      <button
        class="btn btn-secondary"
        @click="handleClose"
      >
        取消
      </button>
      <button
        class="btn btn-primary"
        :disabled="!title.trim()"
        @click="handleSave"
      >
        {{ prompt ? '保存' : '创建' }}
      </button>
    </div>
  </div>
</template>