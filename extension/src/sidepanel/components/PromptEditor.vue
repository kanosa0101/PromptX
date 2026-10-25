<template>
  <div class="editor-panel">
    <h3 class="text-lg font-bold mb-4">
      {{ prompt ? t('editor.editPrompt') : t('editor.newPrompt') }}
    </h3>

    <!-- 草稿恢复提示 -->
    <div
      v-if="draftBanner"
      class="mb-3 px-3 py-2 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2"
    >
      <span>{{ t('editor.draftRestored') }}</span>
      <button
        class="shrink-0 underline hover:no-underline"
        @click="discardDraft"
      >
        {{ t('common.discard') }}
      </button>
    </div>

    <div class="space-y-3">
      <div>
        <label class="block text-sm font-medium mb-1">{{ t('common.title') }}</label>
        <input
          v-model="form.title"
          type="text"
          :placeholder="t('editor.titlePlaceholderExt')"
          class="editor-input"
        >
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">{{ t('common.content') }}</label>
        <textarea
          v-model="form.content"
          :placeholder="t('editor.contentPlaceholderExt', { examples: '{{clipboard}}、{{date}}、{{time}}' })"
          class="editor-textarea"
        />
        <p class="text-xs text-gray-500 mt-1">
          {{ t('editor.contentHintExt', { examples: systemVarExamples }) }}
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">{{ t('common.tags') }}</label>
        <input
          v-model="tagsInput"
          type="text"
          :placeholder="t('editor.tagsPlaceholderExt')"
          class="editor-input"
        >
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">{{ t('editor.spaceLabelExt') }}</label>
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
        {{ t('common.cancel') }}
      </button>
      <button
        class="btn btn-primary flex-1"
        :disabled="!form.title || !form.content"
        @click="onSave"
      >
        {{ t('common.save') }}
      </button>
    </div>

    <button
      v-if="prompt"
      class="btn btn-secondary w-full mt-2 text-red-500"
      @click="onDelete"
    >
      {{ t('editor.deletePrompt') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '../stores/uiStore'
import { loadDraft, saveDraft, clearDraft, type EditorDraft } from '@shared/draft'
import type { Prompt, Space } from '@/types'

const { t } = useI18n()
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

// 内容提示的系统变量示例：字面双花括号必须放在 script 字符串里，
// 直接写进模板 mustache 会被 Vue 解析器在第一个 }} 处截断
const systemVarExamples = `{{clipboard}} (${t('editor.pageSelection')}), {{date}}, {{time}}, {{timestamp}}`

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
      t('confirmDialog.confirmDeletePrompt'),
      () => emit('delete', props.prompt!.id),
      t('confirmDialog.deletePromptTitle')
    )
  }
}
</script>