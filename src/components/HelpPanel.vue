<script setup lang="ts">
import { useSettingsStore } from '@/stores/settingsStore'

const emit = defineEmits<{
  close: []
}>()

// 快捷键可自定义，帮助文案从设置读取（与状态栏一致）
const settingsStore = useSettingsStore()

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div class="help-panel p-4 bg-white dark:bg-background-dark overflow-y-auto max-h-[400px] text-foreground dark:text-foreground-dark">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium">
        使用说明
      </h3>
      <button
        class="icon-btn p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        @click="handleClose"
      >
        ✕
      </button>
    </div>

    <!-- 快捷键 -->
    <div class="mb-4">
      <h4 class="text-sm font-medium mb-2 text-primary">
        快捷键
      </h4>
      <div class="space-y-1 text-sm">
        <div class="flex justify-between">
          <span class="text-muted">唤醒/隐藏面板</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">{{ settingsStore.globalHotkey }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">新建提示词</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">Ctrl + N</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">打开设置</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">Ctrl + ,</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">切换空间</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">Tab</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">导航列表</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">↑ / ↓</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">选择并输出</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">Enter</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">关闭面板</span>
          <span class="font-mono bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">Esc</span>
        </div>
      </div>
    </div>

    <!-- 变量语法 -->
    <div class="mb-4">
      <h4 class="text-sm font-medium mb-2 text-primary">
        变量语法
      </h4>
      <p
        v-pre
        class="text-xs text-muted mb-2"
      >
        在提示词内容中使用 <code class="bg-surface dark:bg-surface-dark px-1 rounded">{{变量名}}</code> 格式
      </p>
      <div class="space-y-1 text-sm">
        <div class="flex justify-between items-center">
          <span class="text-muted">当前剪贴板内容</span>
          <code
            v-pre
            class="bg-surface dark:bg-surface-dark px-2 py-0.5 rounded text-xs"
          >{{clipboard}}</code>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-muted">当前日期</span>
          <code
            v-pre
            class="bg-surface dark:bg-surface-dark px-2 py-0.5 rounded text-xs"
          >{{date}}</code>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-muted">当前时间</span>
          <code
            v-pre
            class="bg-surface dark:bg-surface-dark px-2 py-0.5 rounded text-xs"
          >{{time}}</code>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-muted">时间戳</span>
          <code
            v-pre
            class="bg-surface dark:bg-surface-dark px-2 py-0.5 rounded text-xs"
          >{{timestamp}}</code>
        </div>
      </div>
      <p
        v-pre
        class="text-xs text-muted mt-2"
      >
        其他变量名会弹出表单让你填写，如 <code class="bg-surface dark:bg-surface-dark px-1 rounded">{{项目名}}</code>
      </p>
    </div>

    <!-- 使用流程 -->
    <div class="mb-4">
      <h4 class="text-sm font-medium mb-2 text-primary">
        基本流程
      </h4>
      <div class="space-y-2 text-sm">
        <div class="flex gap-2 items-start">
          <span class="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">1</span>
          <span class="text-muted">按 <code class="bg-surface dark:bg-surface-dark px-1 rounded">{{ settingsStore.globalHotkey }}</code> 呼出面板</span>
        </div>
        <div class="flex gap-2 items-start">
          <span class="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">2</span>
          <span class="text-muted">输入关键词搜索提示词</span>
        </div>
        <div class="flex gap-2 items-start">
          <span class="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">3</span>
          <span class="text-muted">按 <code class="bg-surface dark:bg-surface-dark px-1 rounded">Enter</code> 选择，内容自动复制到剪贴板</span>
        </div>
        <div class="flex gap-2 items-start">
          <span class="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">4</span>
          <span class="text-muted">面板自动隐藏，可直接粘贴使用</span>
        </div>
      </div>
    </div>

    <!-- 示例 -->
    <div class="mb-4">
      <h4 class="text-sm font-medium mb-2 text-primary">
        示例提示词
      </h4>
      <div class="bg-surface-soft-light dark:bg-surface-dark rounded p-3 text-sm">
        <p class="font-medium mb-1">
          代码解释
        </p>
        <p
          v-pre
          class="text-muted text-xs leading-relaxed"
        >
          请用简洁的语言解释以下代码的功能和逻辑：<br>
          <code class="bg-surface dark:bg-surface-hover-dark px-1 rounded mt-1 inline-block">{{clipboard}}</code>
        </p>
      </div>
      <div class="bg-surface-soft-light dark:bg-surface-dark rounded p-3 text-sm mt-2">
        <p class="font-medium mb-1">
          翻译助手
        </p>
        <p
          v-pre
          class="text-muted text-xs leading-relaxed"
        >
          将以下内容翻译成{{目标语言}}，保持原文语气：<br>
          <code class="bg-surface dark:bg-surface-hover-dark px-1 rounded mt-1 inline-block">{{clipboard}}</code>
        </p>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="text-xs text-muted text-center pt-2 border-t border-surface dark:border-surface-dark">
      点击其他区域可自动隐藏面板
    </div>
  </div>
</template>