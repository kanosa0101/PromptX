<template>
  <div class="promptx-container">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        placeholder="搜索提示词 (支持拼音)..."
        class="search-input"
        @input="onSearchInput"
      />
      <div class="flex gap-2 mt-2">
        <button class="btn btn-secondary text-xs" @click="openEditor">
          + 新建
        </button>
        <button class="btn btn-secondary text-xs" @click="refreshSelection">
          🔄 刷新选区
        </button>
      </div>
    </div>

    <!-- 命名空间标签 -->
    <div class="space-tabs">
      <button
        v-for="space in spaces"
        :key="space.id"
        :class="['space-tab', { active: space.id === currentSpaceId }]"
        @click="selectSpace(space.id)"
      >
        {{ space.icon }} {{ space.name }}
      </button>
    </div>

    <!-- 选中文本提示 -->
    <div v-if="pageSelection" class="p-2 mx-2 bg-blue-50 dark:bg-blue-900/30 rounded text-sm">
      <span class="text-gray-500">当前选区:</span>
      <span class="text-blue-600 dark:text-blue-300 ml-1">{{ truncate(pageSelection, 50) }}</span>
    </div>

    <!-- 结果列表 -->
    <div class="result-list">
      <template v-if="isLoading">
        <div class="loading">
          <div class="spinner"></div>
        </div>
      </template>
      <template v-else-if="filteredPrompts.length === 0">
        <div class="empty-state">
          <p>暂无匹配结果</p>
          <p class="text-xs mt-2">按 Ctrl+N 创建新提示词</p>
        </div>
      </template>
      <template v-else>
        <div
          v-for="(prompt, index) in filteredPrompts"
          :key="prompt.id"
          :class="['prompt-item', { selected: index === selectedIndex }]"
          @click="selectPrompt(index)"
        >
          <div class="prompt-title">
            {{ prompt.title }}
          </div>
          <div class="prompt-content">
            {{ truncate(prompt.content, 60) }}
          </div>
          <div class="prompt-tags">
            <span v-for="tag in prompt.tags" :key="tag" class="tag">
              {{ tag }}
            </span>
          </div>
        </div>
      </template>
    </div>

    <!-- 状态栏 -->
    <div class="status-bar">
      <span>↑↓ 选择 | Enter 输出 | Tab 切换空间 | Esc 关闭</span>
    </div>

    <!-- 输出状态提示 -->
    <div v-if="outputStatus === 'success'" class="output-success">
      ✅ 已输出到页面
    </div>
    <div v-if="outputStatus === 'clipboard'" class="output-clipboard">
      📋 已复制到剪贴板，请按 Ctrl+V 粘贴
    </div>

    <!-- 变量表单 -->
    <VariableForm
      v-if="showVariableForm"
      :variables="customVariables"
      @confirm="onVariableConfirm"
      @cancel="onVariableCancel"
    />

    <!-- 提示词编辑器 -->
    <PromptEditor
      v-if="showEditor"
      :prompt="editingPrompt"
      :spaces="spaces"
      @save="onEditorSave"
      @delete="onEditorDelete"
      @cancel="onEditorCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePromptStore } from './stores/promptStore'
import { useUiStore } from './stores/uiStore'
import { useKeyboardNavigation } from './composables/useKeyboardNavigation'
import VariableForm from './components/VariableForm.vue'
import PromptEditor from './components/PromptEditor.vue'

const promptStore = usePromptStore()
const uiStore = useUiStore()

const searchInputRef = ref<HTMLInputElement>()
const searchQuery = ref('')
const outputStatus = ref<'success' | 'clipboard' | null>(null)

// 从 store 获取数据
const spaces = computed(() => promptStore.spaces)
const prompts = computed(() => promptStore.prompts)
const currentSpaceId = computed(() => promptStore.currentSpaceId)
const pageSelection = computed(() => promptStore.pageSelection)
const isLoading = computed(() => promptStore.isLoading)
const filteredPrompts = computed(() => promptStore.filteredPrompts)
const selectedIndex = computed(() => promptStore.selectedIndex)

// UI 状态
const showVariableForm = computed(() => uiStore.showVariableForm)
const customVariables = computed(() => uiStore.currentVariables)
const showEditor = computed(() => uiStore.showEditor)
const editingPrompt = computed(() => uiStore.editingPrompt)

// 键盘导航（新版本，直接与 store 同步）
useKeyboardNavigation()

// 搜索处理
const onSearchInput = () => {
  promptStore.setSearchQuery(searchQuery.value)
}

// 空间选择
const selectSpace = (spaceId: string) => {
  promptStore.setCurrentSpace(spaceId)
}

// 提示词选择
const selectPrompt = (index: number) => {
  promptStore.setSelectedIndex(index)
}

// 选择并输出
const selectAndOutput = async (index: number) => {
  const prompt = filteredPrompts.value[index]
  if (!prompt) return

  promptStore.setSelectedIndex(index)
  await promptStore.selectAndOutput(prompt)

  // 显示输出状态
  outputStatus.value = promptStore.lastOutputMethod
  setTimeout(() => {
    outputStatus.value = null
  }, 2000)
}

// 刷新选区
const refreshSelection = async () => {
  await promptStore.refreshSelection()
}

// 打开编辑器
const openEditor = () => {
  uiStore.openEditor()
}

// 编辑器保存
const onEditorSave = async (promptData: any) => {
  if (editingPrompt.value) {
    await promptStore.updatePrompt(editingPrompt.value.id, promptData)
  } else {
    await promptStore.createPrompt(promptData)
  }
  uiStore.closeEditor()
}

// 编辑器取消
const onEditorCancel = () => {
  uiStore.closeEditor()
}

// 编辑器删除
const onEditorDelete = async (id: string) => {
  await promptStore.deletePrompt(id)
  uiStore.closeEditor()
}

// 变量确认
const onVariableConfirm = async (values: Record<string, string>) => {
  const prompt = uiStore.currentPrompt
  if (prompt) {
    await promptStore.outputPrompt(prompt, values)
    outputStatus.value = promptStore.lastOutputMethod
    setTimeout(() => {
      outputStatus.value = null
    }, 2000)
  }
  uiStore.closeVariableForm()
}

// 变量取消
const onVariableCancel = () => {
  uiStore.closeVariableForm()
}

// 截断文本
const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// 初始化
onMounted(async () => {
  await promptStore.loadData()
  searchInputRef.value?.focus()
})
</script>

<style scoped>
.promptx-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>