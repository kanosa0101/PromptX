<script setup lang="ts">
import { computed } from 'vue'
import SharedVariableForm from '@shared/ui/components/VariableForm.vue'
import type { Prompt } from '@/types'

defineOptions({ name: 'VariableForm' })

const props = defineProps<{
  prompt: Prompt | null
}>()

const emit = defineEmits<{
  confirm: [values: Record<string, string>]
  cancel: []
}>()

// 自定义变量列表（展示与填写逻辑在共享组件）
const customVariables = computed(() =>
  props.prompt?.variables.filter((v) => v.type === 'custom') || []
)
</script>

<template>
  <div
    v-if="prompt"
    class="contents"
  >
    <SharedVariableForm
      :variables="customVariables"
      @confirm="(values) => emit('confirm', values)"
      @cancel="emit('cancel')"
    />
  </div>
</template>
