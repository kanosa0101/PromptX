<script setup lang="ts">
import SharedVariableForm from '@shared/ui/components/VariableForm.vue'
import type { Variable } from '@/types'

defineProps<{
  variables: Variable[]
}>()

const emit = defineEmits<{
  confirm: [values: Record<string, string>]
  cancel: []
}>()
</script>

<template>
  <SharedVariableForm
    :variables="variables"
    @confirm="(values) => emit('confirm', values)"
    @cancel="emit('cancel')"
  />
</template>
