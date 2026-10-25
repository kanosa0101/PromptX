<template>
  <div class="editor-panel">
    <h3 class="text-lg font-bold mb-4">
      {{ prompt ? '编辑提示词' : '新建提示词' }}
    </h3>

    <!-- 草稿恢复提示 -->
    <div
      v-if="draftBanner"
      class="mb-3 px-3 py-2 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2"
    >
      <span>已恢复未保存的草稿</span>
      <button
        class="shrink-0 underline hover:no-underline"
        @click="discardDraft"
      >
        丢弃
      </button>
    </div>

    <div class="space-y-3">
      <div>
        <label class="block text-sm font-medium mb-1">标题</label>
        <input
          v-model="form.title"
          type="text"
          placeholder="提示词标题..."
          class="editor-input"
        >
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">内容</label>
        <textarea
          v-model="form.content"
          placeholder="提示词内容，可使用 {{clipboard}}、{{date}}、{{time}} 等变量..."
          class="editor-textarea"
        />
        <p
          v-pre
          class="text-xs text-gray-500 mt-1"
        >
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
        >
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">空间</label>
        <select
          v-model="form.spaceId"
          class="editor-input"
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
    </div>

    <div class="flex gap-2 mt-4">
      <button
        class="btn btn-secondary flex-1"
        @click="$emit('cancel')"
      >
        取消
      </button>
      <button
        class="btn btn-primary flex-1"
        :disabled="!form.title || !form.content"
        @click="onSave"
      >
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
import { reactive, ref, watch, nextTick } from 'vue'
import { useUiStore } from '../stores/uiStore'
import { loadDraft, saveDraft, clearDraft, type EditorDraft } from '@shared/draft'
import type { Prompt, Space } from '@/types'

const uiStore = useUiStore()

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

// ===== 草稿（意外关闭后再次打开同一提示词时恢复） =====
const draftId = props.prompt?.id || 'new'
const draftBanner = ref<EditorDraft | null>(null)

// 恢复草稿；内容全空的草稿视为无意义，直接清掉不打扰
const draft = loadDraft(draftId)
if (draft && (draft.title.trim() !== '' || draft.content.trim() !== '')) {
  form.title = draft.title
  form.content = draft.content
  if (draft.spaceId) {
    form.spaceId = draft.spaceId
  }
  tagsInput.value = draft.tags.join(', ')
  draftBanner.value = draft
} else if (draft) {
  clearDraft(draftId)
}

// 草稿自动保存：字段变化即写入 localStorage（组件每次打开重新挂载，无初始赋值干扰）
watch([() => form.title, () => form.content, () => form.spaceId, tagsInput], () => {
  saveDraft(draftId, {
    title: form.title,
    content: form.content,
    tags: tagsInput.value.split(',').map((t) => t.trim()).filter((t) => t.length > 0),
    spaceId: form.spaceId
  })
})

// 丢弃草稿：恢复原始值并清除。表单重置会触发自动保存，
// 需等它执行完（nextTick 后 watcher 已 flush）再清除，否则清除会被覆盖
const discardDraft = async () => {
  form.title = props.prompt?.title || ''
  form.content = props.prompt?.content || ''
  form.spaceId = props.prompt?.spaceId || props.spaces[0]?.id || 'space_default'
  tagsInput.value = props.prompt?.tags.join(', ') || ''
  await nextTick()
  clearDraft(draftId)
  draftBanner.value = null
}

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
  if (props.prompt) {
    uiStore.openConfirmDialog(
      '确定删除此提示词？',
      () => emit('delete', props.prompt!.id),
      '删除提示词'
    )
  }
}
</script>