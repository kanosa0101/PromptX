<template>
  <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
    <div class="bg-background-light dark:bg-background-dark p-4 rounded-lg shadow-lg max-w-md w-full">
      <h3 class="text-lg font-bold mb-4 text-foreground-light dark:text-foreground-dark">
        {{ t('variableForm.title') }}
      </h3>

      <div class="space-y-3">
        <div
          v-for="variable in variables"
          :key="variable.name"
          class="variable-input"
        >
          <label class="block text-sm font-medium mb-1">
            {{ variable.name }}
          </label>
          <input
            v-model="values[variable.name]"
            :placeholder="variable.defaultValue || t('variableForm.inputLabel', { name: variable.name })"
            type="text"
            class="editor-input"
            @keydown.enter="onConfirm"
          >
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
          :disabled="hasEmptyVariable"
          @click="onConfirm"
        >
          {{ t('variableForm.confirmOutput') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Variable } from '@/types'

const { t } = useI18n()

const props = defineProps<{
  variables: Variable[]
}>()

const emit = defineEmits<{
  confirm: [values: Record<string, string>]
  cancel: []
}>()

const values = reactive<Record<string, string>>({})

// 初始化默认值
for (const v of props.variables) {
  values[v.name] = v.defaultValue || ''
}

// 检查是否有空的自定义变量
const hasEmptyVariable = computed(() =>
  props.variables.some((v) => !values[v.name]?.trim())
)

const onConfirm = () => {
  emit('confirm', { ...values })
}
</script>