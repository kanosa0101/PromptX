<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Prompt } from '@/types'

defineOptions({ name: 'VariableForm' })

const props = defineProps<{
  prompt: Prompt | null
}>()

const emit = defineEmits<{
  confirm: [values: Record<string, string>]
  cancel: []
}>()

// 自定义变量列表
const customVariables = computed(() =>
  props.prompt?.variables.filter((v) => v.type === 'custom') || []
)

// 变量值
const values = ref<Record<string, string>>({})

// 初始化默认值
watch(() => props.prompt, (prompt) => {
  if (prompt) {
    values.value = {}
    prompt.variables.forEach((v) => {
      if (v.defaultValue) {
        values.value[v.name] = v.defaultValue
      }
    })
  }
}, { immediate: true })

// 检查是否有空的自定义变量
const hasEmptyVariable = computed(() =>
  customVariables.value.some((v) => !values.value[v.name]?.trim())
)

// 确认
const handleConfirm = () => {
  emit('confirm', values.value)
}

// 取消
const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <div v-if="prompt" class="variable-form p-4 bg-background-light dark:bg-background-dark">
    <h3 class="text-base font-medium mb-4">填写变量值</h3>

    <!-- 变量输入 -->
    <div v-for="variable in customVariables" :key="variable.name" class="variable-input mb-4">
      <label class="block text-sm font-medium mb-2">
        {{ variable.name }}
      </label>
      <input
        v-model="values[variable.name]"
        :placeholder="variable.defaultValue"
        type="text"
        class="w-full px-3 py-2 rounded border border-border-light dark:border-border-dark bg-transparent focus:outline-none focus:border-primary"
      />
    </div>

    <!-- 系统变量提示 -->
    <div class="text-xs text-muted mb-4">
      系统变量将自动填充:
      <span class="text-primary">
        {{ prompt.variables.filter(v => v.type === 'system').map(v => v.name).join(', ') }}
      </span>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-end gap-2">
      <button class="btn btn-secondary" @click="handleCancel">
        取消
      </button>
      <button class="btn btn-primary" :disabled="hasEmptyVariable" @click="handleConfirm">
        确认输出
      </button>
    </div>
  </div>
</template>