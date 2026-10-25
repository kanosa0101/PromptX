<template>
  <div class="promptx-container">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <input
        ref="searchInputRef"
        v-model="localQuery"
        type="text"
        placeholder="搜索提示词 (支持拼音)..."
        class="search-input"
        @input="onSearchInput"
      >
      <div class="flex gap-2 mt-2">
        <button
          class="btn btn-secondary text-xs"
          @click="openEditor"
        >
          + 新建
        </button>
        <button
          class="btn btn-secondary text-xs"
          @click="openSpaceEditor"
        >
          + 空间
        </button>
        <button
          class="btn btn-secondary text-xs"
          @click="refreshSelection"
        >
          🔄 刷新选区
        </button>
        <button
          class="btn btn-secondary text-xs ml-auto"
          title="使用说明"
          @click="openHelpPanel"
        >
          ❓ 帮助
        </button>
        <button
          class="btn btn-secondary text-xs"
          title="设置（AI 配置）"
          @click="openSettingsPanel"
        >
          ⚙ 设置
        </button>
      </div>
    </div>

    <!-- 命名空间标签（可拖拽排序） -->
    <div class="space-tabs">
      <button
        v-for="(space, index) in spaces"
        :key="space.id"
        :class="['space-tab', {
          active: space.id === currentSpaceId,
          'opacity-40': dragIndex === index,
          'ring-2 ring-blue-400': dragOverIndex === index && dragIndex !== index
        }]"
        draggable="true"
        title="拖拽调整空间顺序"
        @click="selectSpace(space.id)"
        @dragstart="onDragStart(index, $event)"
        @dragover="onDragOver(index, $event)"
        @drop="onDrop(index)"
        @dragend="resetDragState"
      >
        {{ space.icon }} {{ space.name }}
      </button>
    </div>

    <!-- 选中文本提示 -->
    <div
      v-if="pageSelection"
      class="p-2 mx-2 bg-blue-50 dark:bg-blue-900/30 rounded text-sm"
    >
      <span class="text-gray-500">当前选区:</span>
      <span class="text-blue-600 dark:text-blue-300 ml-1">{{ truncate(pageSelection, 50) }}</span>
    </div>

    <!-- 结果列表 -->
    <div class="result-list">
      <template v-if="isLoading">
        <div class="loading">
          <div class="spinner" />
        </div>
      </template>
      <template v-else-if="filteredPrompts.length === 0">
        <div class="empty-state">
          <p>暂无匹配结果</p>
          <p class="text-xs mt-2">
            按 Ctrl+N 创建新提示词
          </p>
        </div>
      </template>
      <template v-else>
        <div
          v-for="(prompt, index) in filteredPrompts"
          :key="prompt.id"
          :class="['prompt-item', { selected: index === selectedIndex }]"
          @click="selectPrompt(index)"
        >
          <!-- 内容经 highlightMatches 转义（shared/search.ts，有 XSS 测试覆盖） -->
          <!-- eslint-disable vue/no-v-html -->
          <div
            class="prompt-title"
            v-html="highlightMatches(prompt.title, prompt.matches?.filter(m => m.key === 'title'))"
          />
          <div
            class="prompt-content"
            v-html="highlightMatches(truncate(prompt.content, 60), prompt.matches?.filter(m => m.key === 'content'))"
          />
          <!-- eslint-enable vue/no-v-html -->
          <div class="flex items-center justify-between gap-2">
            <div class="prompt-tags min-w-0">
              <span
                v-for="tag in prompt.tags"
                :key="tag"
                class="tag"
              >
                {{ tag }}
              </span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                class="text-sm leading-none transition-colors"
                :class="prompt.favorite
                  ? 'text-amber-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-amber-400'"
                :aria-label="prompt.favorite ? '取消收藏' : '收藏'"
                :title="prompt.favorite ? '取消收藏' : '收藏（列表优先展示）'"
                @click.stop="toggleFavorite(prompt)"
              >
                {{ prompt.favorite ? '★' : '☆' }}
              </button>
              <span
                class="text-xs text-gray-400 dark:text-gray-500"
                :title="'创建于 ' + prompt.createdAt"
              >
                {{ formatDate(prompt.createdAt) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 状态栏 -->
    <div class="status-bar">
      <span>↑↓ 选择 | Enter 输出 | Tab 切换空间 | Esc 关闭</span>
    </div>

    <!-- 输出状态提示 -->
    <div
      v-if="outputStatus === 'success'"
      class="output-success"
    >
      ✅ 已输出到页面
    </div>
    <div
      v-if="outputStatus === 'clipboard'"
      class="output-clipboard"
    >
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

    <!-- 空间编辑器 -->
    <SpaceEditor
      v-if="showSpaceEditor"
      @close="onSpaceEditorClose"
    />

    <!-- 设置面板 -->
    <SettingsPanel
      v-if="showSettings"
      @close="onSettingsClose"
    />

    <!-- 使用说明 -->
    <HelpPanel
      v-if="showHelp"
      @close="onHelpClose"
    />

    <!-- 确认对话框 -->
    <ConfirmDialog
      v-if="showConfirmDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { usePromptStore } from './stores/promptStore'
import { useUiStore } from './stores/uiStore'
import { useKeyboardNavigation } from './composables/useKeyboardNavigation'
import { STORAGE_KEY, loadAppData } from '@/lib/storage'
import { applyTheme } from '@/lib/theme'
import { highlightMatches, truncate } from './composables/useSearch'
import { clearDraft } from '@shared/draft'
import type { Prompt } from '@/types'
import VariableForm from './components/VariableForm.vue'
import PromptEditor from './components/PromptEditor.vue'
import SpaceEditor from './components/SpaceEditor.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import HelpPanel from './components/HelpPanel.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'

const promptStore = usePromptStore()
const uiStore = useUiStore()

const searchInputRef = ref<HTMLInputElement>()
const outputStatus = ref<'success' | 'clipboard' | null>(null)

// 搜索输入：本地值防抖后推入 store（与桌面端行为一致，避免每键全量搜索）
const SEARCH_DEBOUNCE_MS = 300
const localQuery = ref('')
let searchDebounceTimer: number | undefined

const onSearchInput = () => {
  window.clearTimeout(searchDebounceTimer)
  searchDebounceTimer = window.setTimeout(() => {
    promptStore.setSearchQuery(localQuery.value)
  }, SEARCH_DEBOUNCE_MS)
}

// store 中的查询被外部清空（Esc 重置搜索）时同步回输入框，避免两者失协
watch(
  () => promptStore.searchQuery,
  (q) => {
    if (q !== localQuery.value) {
      window.clearTimeout(searchDebounceTimer)
      localQuery.value = q
    }
  }
)

// ===== 空间拖拽排序 =====
// 拖起某个标签放到另一个标签上即交换顺序，order 字段随后持久化
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const resetDragState = () => {
  dragIndex.value = null
  dragOverIndex.value = null
}

const onDragStart = (index: number, e: DragEvent) => {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    // 部分浏览器要求设置数据后拖拽才会真正开始
    e.dataTransfer.setData('text/plain', String(index))
  }
}

const onDragOver = (index: number, e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

const onDrop = (index: number) => {
  const from = dragIndex.value
  if (from !== null && from !== index) {
    const ids = promptStore.spaces.map((s) => s.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(index, 0, moved)
    promptStore.reorderSpaces(ids)
  }
  resetDragState()
}

// 收藏/取消收藏（收藏项在列表中置顶展示）
const toggleFavorite = (prompt: Prompt) => {
  promptStore.updatePrompt(prompt.id, { favorite: !prompt.favorite })
}

// 从 store 获取数据
const spaces = computed(() => promptStore.spaces)
const currentSpaceId = computed(() => promptStore.currentSpaceId)
const pageSelection = computed(() => promptStore.pageSelection)
const isLoading = computed(() => promptStore.isLoading)
const filteredPrompts = computed(() => promptStore.filteredPrompts)
const selectedIndex = computed(() => promptStore.selectedIndex)

// 格式化创建日期（YYYY-MM-DD）
const formatDate = (iso: string) => (iso ? iso.slice(0, 10) : '')

// UI 状态
const showVariableForm = computed(() => uiStore.showVariableForm)
const customVariables = computed(() => uiStore.currentVariables)
const showEditor = computed(() => uiStore.showEditor)
const editingPrompt = computed(() => uiStore.editingPrompt)
const showSpaceEditor = computed(() => uiStore.showSpaceEditor)
const showSettings = computed(() => uiStore.showSettings)
const showHelp = computed(() => uiStore.showHelp)
const showConfirmDialog = computed(() => uiStore.showConfirmDialog)

// 键盘导航
useKeyboardNavigation()

// 空间选择
const selectSpace = (spaceId: string) => {
  promptStore.setCurrentSpace(spaceId)
}

// 提示词选择
const selectPrompt = (index: number) => {
  promptStore.setSelectedIndex(index)
}

// 刷新选区
const refreshSelection = async () => {
  await promptStore.refreshSelection()
}

// 打开编辑器
const openEditor = () => {
  uiStore.openEditor()
}

// 打开空间编辑器
const openSpaceEditor = () => {
  uiStore.openSpaceEditor()
}

// 打开设置面板（AI 配置、主题、导入导出）
const openSettingsPanel = () => {
  uiStore.openSettings()
}

// 打开使用说明
const openHelpPanel = () => {
  uiStore.openHelp()
}

// 关闭使用说明
const onHelpClose = () => {
  uiStore.closeHelp()
}

// 编辑器保存
const onEditorSave = async (promptData: { title: string; content: string; tags: string[]; spaceId: string }) => {
  if (editingPrompt.value) {
    await promptStore.updatePrompt(editingPrompt.value.id, promptData)
    // 保存成功后清除编辑器草稿（失败抛错时保留，再次打开可恢复）
    clearDraft(editingPrompt.value.id)
  } else {
    await promptStore.createPrompt(promptData)
    clearDraft('new')
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

// 空间编辑器关闭（创建/编辑/删除由组件内部完成）
const onSpaceEditorClose = () => {
  uiStore.closeSpaceEditor()
}

// 设置面板关闭
const onSettingsClose = () => {
  uiStore.closeSettings()
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

// 初始化
const onStorageChanged = (changes: Record<string, unknown>, area: string) => {
  if (area === 'local' && changes[STORAGE_KEY]) {
    promptStore.refreshFromStorage()
  }
}

onMounted(async () => {
  // 打开侧边栏时立即应用已保存的主题（否则每次重开都是亮色）
  await applyStoredTheme()
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', applyStoredTheme)

  await promptStore.loadData()
  searchInputRef.value?.focus()
  // 其他上下文（如 background 写入 AI 优化历史）改动存储时刷新列表
  chrome.storage.onChanged.addListener(onStorageChanged)
})

onUnmounted(() => {
  window.clearTimeout(searchDebounceTimer)
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .removeEventListener('change', applyStoredTheme)
  chrome.storage.onChanged.removeListener(onStorageChanged)
})

// 读取存储中的主题设置并应用（system 模式跟随系统当前值）
const applyStoredTheme = async () => {
  const data = await loadAppData()
  applyTheme(data.settings?.theme || 'system')
}
</script>

<style scoped>
.promptx-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>