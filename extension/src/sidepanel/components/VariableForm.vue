<template>
  <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
    <div class="bg-background-light dark:bg-background-dark p-4 rounded-lg shadow-lg max-w-md w-full">
      <h3 class="text-lg font-bold mb-4 text-foreground-light dark:text-foreground-dark">
        填写变量值
      </h3>

      <div class="space-y-3">
        <div v-for="variable in variables" :key="variable.name" class="variable-input">
          <label class="block text-sm font-medium mb-1">
            {{ variable.name }}
          </label>
          <input
            v-model="values[variable.name]"
            :placeholder="variable.defaultValue || `输入 ${variable.name} 的值`"
            type="text"
            class="editor-input"
            @keydown.enter="onConfirm"
          />
        </div>
      </div>

      <div class="flex gap-2 mt-4">
        <button class="btn btn-secondary flex-1" @click="$emit('cancel')">
          取消
        </button>
        <button class="btn btn-primary flex-1" @click="onConfirm">
          确认输出
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { Variable } from '@/types'

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

const onConfirm = () => {
  emit('confirm', { ...values })
}
</script>