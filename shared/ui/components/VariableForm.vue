<!--
  变量填写表单（桌面端 + 扩展端共用，UI 合并 Step 2）
  纯展示组件：只接收已解析的自定义变量列表，填写后经 confirm 事件交回。
  样式自包含（原子类），不依赖两端的 .btn/.editor-input 等自定义类
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Variable } from '../../types'

const { t } = useI18n()

const props = defineProps<{
  /** 自定义变量列表（调用方负责从提示词内容解析并过滤 type==='custom'） */
  variables: Variable[]
}>()

const emit = defineEmits<{
  confirm: [values: Record<string, string>]
  cancel: []
}>()

const values = ref<Record<string, string>>({})

// 变量列表变化（切换提示词）时重置：预填 defaultValue
watch(
  () => props.variables,
  (variables) => {
    const next: Record<string, string> = {}
    for (const variable of variables) {
      if (variable.defaultValue) {
        next[variable.name] = variable.defaultValue
      }
    }
    values.value = next
  },
  { immediate: true },
)

const hasEmpty = computed(() =>
  props.variables.some((v) => !values.value[v.name]?.trim()),
)

const handleConfirm = () => {
  if (!hasEmpty.value) {
    emit('confirm', values.value)
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
    <div class="bg-white dark:bg-background-dark p-4 rounded-lg shadow-xl min-w-[280px] max-w-md w-full mx-2 text-foreground dark:text-foreground-dark">
      <h3 class="text-base font-medium mb-4">
        {{ t('variableForm.title') }}
      </h3>

      <div
        v-for="variable in variables"
        :key="variable.name"
        class="mb-3"
      >
        <label class="block text-sm font-medium mb-1">{{ variable.name }}</label>
        <input
          v-model="values[variable.name]"
          :placeholder="variable.defaultValue || t('variableForm.inputLabel', { name: variable.name })"
          type="text"
          class="w-full px-3 py-2 rounded border border-surface dark:border-surface-dark bg-transparent focus:outline-none focus:border-primary text-sm"
          @keydown.enter="handleConfirm"
        >
      </div>

      <p
        v-if="variables.length"
        class="text-xs text-muted mb-3"
      >
        {{ t('variableForm.hint') }}
      </p>

      <div class="flex justify-end gap-2">
        <button
          class="px-3 py-1.5 rounded text-sm bg-surface dark:bg-surface-dark text-foreground dark:text-foreground-dark hover:bg-surface-hover-light dark:hover:bg-surface-hover-dark"
          @click="emit('cancel')"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          class="px-3 py-1.5 rounded text-sm bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
          :disabled="hasEmpty"
          @click="handleConfirm"
        >
          {{ t('variableForm.confirmOutput') }}
        </button>
      </div>
    </div>
  </div>
</template>
