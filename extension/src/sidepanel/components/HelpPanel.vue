<template>
  <div class="help-panel p-4 bg-white dark:bg-background-dark">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-medium text-foreground dark:text-foreground-dark">
        使用说明
      </h3>
      <button
        class="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark text-foreground dark:text-foreground-dark"
        aria-label="关闭使用说明"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>

    <!-- 快捷键 -->
    <section class="mb-4">
      <h4 class="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
        快捷键
      </h4>
      <div class="space-y-1.5">
        <div
          v-for="item in shortcuts"
          :key="item.keys"
          class="flex items-start justify-between gap-3 text-sm"
        >
          <span class="text-gray-500 dark:text-gray-400">{{ item.desc }}</span>
          <kbd
            class="shrink-0 px-1.5 py-0.5 rounded border border-surface dark:border-surface-dark bg-gray-50 dark:bg-surface-dark text-xs text-foreground dark:text-foreground-dark"
          >{{ item.keys }}</kbd>
        </div>
      </div>
      <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">
        打开/优化快捷键可在 chrome://extensions/shortcuts 修改
      </p>
    </section>

    <!-- 输出方式 -->
    <section class="mb-4 border-t border-surface dark:border-surface-dark pt-3">
      <h4 class="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
        输出方式
      </h4>
      <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
        选中提示词后按 Enter：优先直接插入页面当前焦点位置（input / textarea /
        富文本 / iframe）；插入失败时复制到剪贴板并提示，手动 Ctrl+V 粘贴即可。
      </p>
    </section>

    <!-- AI 优化 -->
    <section class="mb-4 border-t border-surface dark:border-surface-dark pt-3">
      <h4 class="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
        AI 优化
      </h4>
      <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
        在页面选中一段文字后按 <kbd class="px-1 rounded border border-surface dark:border-surface-dark text-xs">Alt+Shift+O</kbd>：
        调用 AI 润色并原位替换，结果自动存入「AI 优化」空间（上限 200 条）。
        需先在设置中配置 API Key；不可编辑区域会回退为复制优化结果。
      </p>
    </section>

    <!-- 数据说明 -->
    <section class="border-t border-surface dark:border-surface-dark pt-3">
      <h4 class="text-sm font-medium text-foreground dark:text-foreground-dark mb-2">
        数据说明
      </h4>
      <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
        提示词保存在本浏览器的本地存储中，不上传、不与桌面端互通；
        可在设置面板导出 JSON 备份或从桌面端导入。
      </p>
    </section>

    <footer class="mt-4 pt-3 border-t border-surface dark:border-surface-dark text-xs text-gray-400 dark:text-gray-500">
      PromptX 扩展 v{{ appVersion }}
    </footer>
  </div>
</template>

<script setup lang="ts">
defineEmits<{ close: [] }>()

const appVersion = chrome.runtime.getManifest().version

const shortcuts = [
  { keys: 'Alt+Space', desc: '打开 Side Panel' },
  { keys: 'Ctrl+Shift+P', desc: '打开 Side Panel（备用）' },
  { keys: '↑ / ↓', desc: '上下选择提示词' },
  { keys: 'Enter', desc: '输出选中提示词' },
  { keys: 'Tab / Shift+Tab', desc: '切换空间' },
  { keys: 'Ctrl+N', desc: '新建提示词' },
  { keys: 'Esc', desc: '清空搜索 / 关闭弹层' },
]
</script>

<style scoped>
.help-panel {
  min-height: 100%;
}
</style>
