<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import { usePromptStore } from '@/stores/promptStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { useAiOptimizer } from '@/composables/useAiOptimizer'
import type { Prompt } from '@/types'
import SearchBar from '@/components/SearchBar.vue'
import SpaceTabs from '@/components/SpaceTabs.vue'
import ResultList from '@/components/ResultList.vue'
import StatusBar from '@/components/StatusBar.vue'
import VariableForm from '@/components/VariableForm.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import PromptEditor from '@/components/PromptEditor.vue'
import HelpPanel from '@/components/HelpPanel.vue'
import SpaceEditor from '@/components/SpaceEditor.vue'
import ConfirmDialog from '@shared/components/ConfirmDialog.vue'
import OptimizePreviewPanel from '@shared/ui/components/OptimizePreviewPanel.vue'
import TemplateMarketPanel from '@shared/ui/components/TemplateMarketPanel.vue'
import type { MarketTemplate } from '@shared/templateMarket'
import { clearDraft } from '@shared/draft'
import { check as checkForAppUpdate } from '@tauri-apps/plugin-updater'
import { isTauri } from '@/utils/isTauri'

const { t } = useI18n()
const promptStore = usePromptStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()

// AI 快捷优化事件编排（全局快捷键截取选中文本后由 Rust 通过事件推送到前端）
const aiOptimizer = useAiOptimizer()

// 保存提示词并关闭编辑器
const handleSavePrompt = async (prompt: Prompt) => {
  try {
    await promptStore.savePrompt(prompt)
    // 重新加载数据确保同步
    await promptStore.loadPrompts()
    // 保存成功后清除编辑器草稿（失败时保留，再次打开可恢复）
    clearDraft(prompt.id?.trim() || 'new')
    uiStore.closePromptEditor()
  } catch (error) {
    console.error('Failed to save prompt:', error)
    // 保持编辑器打开并提示，避免失败看起来像“保存按钮没反应”
    uiStore.showSystemNotice(t('settings.saveFailed', { error: error instanceof Error ? error.message : String(error) }))
  }
}

// 模板库导入：以当前空间为目标创建提示词
const handleMarketImport = async (template: MarketTemplate) => {
  try {
    await promptStore.createPrompt({
      title: template.title,
      content: template.content,
      tags: template.tags,
      spaceId: promptStore.currentSpaceId,
    })
    uiStore.closeTemplateMarket()
    uiStore.showAiNotice(t('market.imported', { title: template.title }))
    window.setTimeout(() => uiStore.clearAiNotice(), 3000)
  } catch (error) {
    uiStore.showSystemNotice(t('settings.saveFailed', { error: error instanceof Error ? error.message : String(error) }))
  }
}

// AI 优化预览：确认应用（选区模式贴回原位 / 剪贴板模式写回剪贴板）
const handlePreviewApply = async () => {
  const preview = uiStore.optimizePreviewData
  if (!preview || preview.streaming) return
  try {
    if (isTauri()) {
      if (preview.mode === 'clipboard') {
        await invoke('clipboard_optimize_apply_result', { text: preview.text })
      } else {
        await invoke('optimize_apply_result', { text: preview.text })
      }
    } else {
      await navigator.clipboard.writeText(preview.text)
    }
    uiStore.showAiNotice(t('optimizer.donePasted'))
    window.setTimeout(() => uiStore.clearAiNotice(), 3000)
  } catch (error) {
    uiStore.showAiError(t('settings.saveFailed', { error: error instanceof Error ? error.message : String(error) }))
  } finally {
    uiStore.closeOptimizePreview()
  }
}

// AI 优化预览：取消（结束会话并恢复原剪贴板）
const handlePreviewCancel = () => {
  const preview = uiStore.optimizePreviewData
  uiStore.closeOptimizePreview()
  if (isTauri()) {
    invoke(preview?.mode === 'clipboard' ? 'clipboard_optimize_cancel' : 'optimize_cancel').catch(() => {})
  }
}

// AI 优化预览：重新生成
const handlePreviewRegenerate = async () => {
  await aiOptimizer.regenerate()
}

// 智能候选：使用剪贴板内容优化
const handleUseFallback = async () => {
  await aiOptimizer.useFallbackOptimize()
}

// 智能候选：重新获取选区
const handleRetryCapture = async () => {
  await aiOptimizer.retryCapture()
}

// 提示通知：从错误中打开设置
const openSettingsFromAiError = () => {
  uiStore.clearAiError()
  uiStore.showSettingsPanel()
}

// 提示通知：重新生成
const handleRegenerate = async () => {
  uiStore.clearAiNotice()
  uiStore.clearAiError()
  await aiOptimizer.regenerate()
}

// 提示通知：恢复原剪贴板
const handleRestoreOriginalClipboard = async () => {
  await aiOptimizer.restoreOriginalClipboard()
}

// 处理键盘事件
const handleKeyDown = async (e: KeyboardEvent) => {
  // 如果在弹窗状态，不处理导航键；Escape 逐层关闭（否则是键盘陷阱）
  if (uiStore.showSettings || uiStore.showPromptEditor || uiStore.showVariableForm || uiStore.showHelp || uiStore.showTemplateMarket || uiStore.showSpaceEditor || uiStore.showConfirmDialog) {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (uiStore.showConfirmDialog) {
        uiStore.closeConfirmDialog()
      } else if (uiStore.showVariableForm) {
        uiStore.closeVariableForm()
      } else if (uiStore.showPromptEditor) {
        uiStore.closePromptEditor()
      } else if (uiStore.showSpaceEditor) {
        uiStore.closeSpaceEditor()
      } else if (uiStore.showSettings) {
        uiStore.hideSettings()
      } else if (uiStore.showHelp) {
        uiStore.closeHelp()
      } else if (uiStore.showTemplateMarket) {
        uiStore.closeTemplateMarket()
      }
    }
    return
  }

  // 上下键导航
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    promptStore.moveSelection(1)
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    promptStore.moveSelection(-1)
    return
  }

  // Enter 选择并输出
  if (e.key === 'Enter') {
    e.preventDefault()
    const selected = promptStore.selectedPrompt
    if (selected) {
      promptStore.selectAndOutput(selected)
    }
    return
  }

  // Tab 切换空间
  if (e.key === 'Tab') {
    e.preventDefault()
    if (e.shiftKey) {
      promptStore.prevSpace()
    } else {
      promptStore.nextSpace()
    }
    return
  }

  // Escape 隐藏窗口
  if (e.key === 'Escape') {
    e.preventDefault()
    if (isTauri()) {
      await invoke('hide_window')
    }
    return
  }

  // Ctrl/Cmd + N: 新建提示词
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault()
    uiStore.openPromptEditor()
    return
  }
  // Ctrl/Cmd + E: 编辑选中项
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault()
    const selected = promptStore.selectedPrompt
    if (selected) {
      uiStore.openPromptEditor(selected)
    }
    return
  }
  // Ctrl/Cmd + D: 删除选中项
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault()
    const selected = promptStore.selectedPrompt
    if (selected) {
      uiStore.openConfirmDialog(
        t('confirmDialog.confirmDeletePrompt'),
        () => {
          promptStore.deletePrompt(selected.id)
        },
        t('confirmDialog.deletePromptTitle')
      )
    }
    return
  }
  // Ctrl/Cmd + ,: 打开设置
  if ((e.ctrlKey || e.metaKey) && e.key === ',') {
    e.preventDefault()
    uiStore.toggleSettings()
    return
  }
}

// 系统主题变化监听
const handleSystemThemeChange = () => {
  if (settingsStore.theme === 'system') {
    settingsStore.applyTheme()
  }
}

// 检查全局快捷键注册状态（启动时提示冲突，例如被其他程序占用）
const checkHotkeyStatus = async () => {
  if (!isTauri()) return
  try {
    const status = await invoke<{ name: string; hotkey: string; ok: boolean }[]>('get_hotkey_status')
    const failed = status.filter((s) => !s.ok)
    if (failed.length > 0) {
      uiStore.showSystemNotice(
        failed.map((s) => t('settings.hotkey.registerFailedStartup', { name: s.name, hotkey: s.hotkey })).join('；')
      )
    } else {
      uiStore.clearSystemNotice()
    }
  } catch {
    // 查询失败不打扰用户
  }
}

// 启动时后台检查应用更新（失败静默；有新版本时提示，安装由用户在设置中确认）
const checkAppUpdate = async () => {
  if (!isTauri()) return
  try {
    const update = await checkForAppUpdate()
    // 快捷键冲突提示优先级更高，有通知时不覆盖
    if (update && !uiStore.systemNotice) {
      uiStore.showSystemNotice(t('settings.updater.startupNotice', { version: update.version }))
    }
  } catch {
    // 离线等场景检查失败不打扰用户
  }
}

// 初始化应用并注册键盘监听
onMounted(async () => {
  if (isTauri()) {
    invoke('ai_debug_log', { message: '[FE] onMounted start' }).catch(() => {})
  }
  await promptStore.loadPrompts()
  await settingsStore.loadSettings()
  await checkHotkeyStatus()
  await aiOptimizer.start()
  // 后台检查更新（不阻塞界面初始化）
  checkAppUpdate()
  window.addEventListener('keydown', handleKeyDown)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleSystemThemeChange)
  if (isTauri()) {
    invoke('ai_debug_log', {
      message: `[FE] onMounted done. prompts: ${promptStore.prompts.length}, spaces: ${promptStore.spaces.length}, space: ${promptStore.currentSpaceId}, filtered: ${promptStore.filteredPrompts.length}, uiState: ${JSON.stringify({
        settings: uiStore.showSettings,
        promptEditor: uiStore.showPromptEditor,
        varForm: uiStore.showVariableForm,
        help: uiStore.showHelp,
        market: uiStore.showTemplateMarket,
        spaceEditor: uiStore.showSpaceEditor,
      })}`
    }).catch(() => {})
  }
})

onUnmounted(() => {
  aiOptimizer.stop()
  window.removeEventListener('keydown', handleKeyDown)
  window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handleSystemThemeChange)
})
</script>

<template>
  <!-- 拖拽区域（不可见） -->
  <div
    data-tauri-drag-region
    class="fixed top-0 left-0 right-0 h-8 z-50"
  />

  <div
    class="app-container min-h-screen bg-white dark:bg-background-dark text-foreground dark:text-foreground-dark"
  >
    <!-- 系统通知横幅（快捷键冲突等，需手动关闭） -->
    <div
      v-if="uiStore.systemNotice"
      class="animate-fade-in fixed top-8 left-2 right-2 z-50 flex items-start justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs shadow-lg"
    >
      <span class="leading-snug">{{ uiStore.systemNotice }}</span>
      <button
        class="shrink-0 opacity-70 hover:opacity-100"
        @click="uiStore.clearSystemNotice"
      >
        ✕
      </button>
    </div>

    <!-- 智能剪贴板候选横幅（未截取到选区但剪贴板有现有内容） -->
    <div
      v-if="uiStore.aiFallbackData"
      class="animate-fade-in fixed top-8 left-2 right-2 z-50 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs shadow-xl flex flex-col gap-2"
    >
      <div class="flex items-center justify-between font-medium">
        <span class="flex items-center gap-1.5">
          <span>💡</span>
          <span>{{ t('optimizer.fallbackNotice', { count: uiStore.aiFallbackData.text.length }) }}</span>
        </span>
        <button
          class="opacity-70 hover:opacity-100 p-0.5"
          @click="uiStore.clearAiFallback"
        >
          ✕
        </button>
      </div>
      <div class="max-h-16 overflow-y-auto px-2 py-1 rounded bg-amber-100/60 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-mono text-[11px] truncate">
        {{ uiStore.aiFallbackData.text }}
      </div>
      <div class="flex justify-end gap-2 pt-1">
        <button
          class="px-2.5 py-1 rounded border border-amber-400 dark:border-amber-700 hover:bg-amber-200/50 dark:hover:bg-amber-900/50"
          @click="handleRetryCapture"
        >
          {{ t('optimizer.retryCapture') }}
        </button>
        <button
          class="px-3 py-1 rounded bg-primary text-white hover:bg-primary-hover font-medium shadow-sm"
          @click="handleUseFallback"
        >
          {{ t('optimizer.useClipboardOptimize') }}
        </button>
      </div>
    </div>

    <!-- AI 优化错误横幅 -->
    <div
      v-if="uiStore.aiError"
      class="animate-fade-in fixed top-8 left-2 right-2 z-50 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs shadow-lg"
    >
      <div class="flex items-center gap-1.5 min-w-0 flex-1">
        <span class="shrink-0">⚠️</span>
        <span class="leading-snug break-words">{{ uiStore.aiError }}</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          class="px-2 py-0.5 rounded border border-red-400 dark:border-red-700 bg-red-100/60 dark:bg-red-900/40 hover:bg-red-200/60 dark:hover:bg-red-800/60 text-red-800 dark:text-red-200 font-medium"
          @click="openSettingsFromAiError"
        >
          {{ t('optimizer.openSettings') }}
        </button>
        <button
          v-if="uiStore.lastOptimization?.originalText"
          class="px-2 py-0.5 rounded border border-red-400 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900 text-red-800 dark:text-red-200 font-medium"
          @click="handleRegenerate"
        >
          {{ t('optimizer.retry') }}
        </button>
        <button
          class="shrink-0 opacity-70 hover:opacity-100 px-1"
          @click="uiStore.clearAiError"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- AI 优化成功提示 -->
    <div
      v-if="uiStore.aiNotice"
      class="animate-fade-in fixed top-8 left-2 right-2 z-50 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 text-xs shadow-lg"
    >
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <span class="shrink-0">✓</span>
        <span class="truncate leading-snug">{{ uiStore.aiNotice }}</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          v-if="uiStore.lastOptimization?.originalText"
          class="px-2 py-0.5 rounded border border-green-400 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900 text-green-800 dark:text-green-200 font-medium"
          @click="handleRegenerate"
        >
          {{ t('optimizer.regenerate') }}
        </button>
        <button
          v-if="uiStore.lastOptimization?.originalClipboard && uiStore.lastOptimization.originalClipboard !== uiStore.lastOptimization.optimizedText"
          class="px-2 py-0.5 rounded border border-green-400 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900 text-green-800 dark:text-green-200"
          :title="t('optimizer.restoreClipboardHint')"
          @click="handleRestoreOriginalClipboard"
        >
          {{ t('optimizer.restoreClipboard') }}
        </button>
        <button
          class="shrink-0 opacity-70 hover:opacity-100 px-1"
          @click="uiStore.clearAiNotice"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- AI 优化进行中（用户中途唤起窗口时可见，可取消） -->
    <div
      v-if="uiStore.aiOptimizing"
      class="animate-fade-in fixed bottom-2 left-2 right-2 z-50 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs shadow-lg"
    >
      <div class="leading-snug min-w-0 flex-1">
        <div>{{ t('app.aiOptimizing') }}</div>
        <div
          v-if="uiStore.aiStreamText"
          class="text-xs opacity-70 truncate"
        >
          {{ uiStore.aiStreamText }}
        </div>
      </div>
      <button
        class="shrink-0 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
        @click="aiOptimizer.cancelOptimize()"
      >
        {{ t('app.cancelOptimize') }}
      </button>
    </div>

    <!-- 主界面 -->
    <div v-if="!uiStore.showSettings && !uiStore.showPromptEditor && !(uiStore.showVariableForm && uiStore.currentPrompt) && !uiStore.showHelp && !uiStore.showTemplateMarket && !uiStore.showSpaceEditor">
      <SearchBar />
      <SpaceTabs />
      <ResultList />
      <StatusBar />
    </div>

    <!-- 空间编辑器 -->
    <SpaceEditor
      v-if="uiStore.showSpaceEditor"
      :space="uiStore.editingSpace"
      @close="uiStore.closeSpaceEditor"
    />

    <!-- 帮助面板 -->
    <HelpPanel
      v-if="uiStore.showHelp"
      @close="uiStore.closeHelp"
    />

    <!-- 模板库面板 -->
    <TemplateMarketPanel
      v-if="uiStore.showTemplateMarket"
      @close="uiStore.closeTemplateMarket"
      @import="handleMarketImport"
    />

    <!-- 变量表单 -->
    <VariableForm
      v-if="uiStore.showVariableForm"
      :prompt="uiStore.currentPrompt"
      @confirm="promptStore.outputWithVariables"
      @cancel="uiStore.closeVariableForm"
    />

    <!-- 设置面板 -->
    <SettingsPanel
      v-if="uiStore.showSettings"
      @close="uiStore.hideSettings"
    />

    <!-- 提示词编辑器 -->
    <PromptEditor
      v-if="uiStore.showPromptEditor"
      :prompt="uiStore.editingPrompt"
      @save="handleSavePrompt"
      @close="uiStore.closePromptEditor"
    />

    <!-- AI 优化结果预览（optimizePreview 开启时） -->
    <OptimizePreviewPanel
      v-if="uiStore.optimizePreviewData"
      :text="uiStore.optimizePreviewData.text"
      :streaming="uiStore.optimizePreviewData.streaming"
      :mode="uiStore.optimizePreviewData.mode"
      @apply="handlePreviewApply"
      @cancel="handlePreviewCancel"
      @regenerate="handlePreviewRegenerate"
    />

    <!-- 确认对话框 -->
    <ConfirmDialog
      v-if="uiStore.showConfirmDialog"
      :title="uiStore.confirmDialogTitle"
      :message="uiStore.confirmDialogMessage"
      @confirm="uiStore.confirmAction"
      @cancel="uiStore.closeConfirmDialog"
    />
  </div>
</template>

<style scoped>
.app-container {
  user-select: none;
}
</style>
