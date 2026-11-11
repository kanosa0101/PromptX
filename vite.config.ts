/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  plugins: [vue()],
  define: {
    // vue-i18n 启用 JIT（AST 解释器）模式：运行时编译消息不再走 new Function（eval）。
    // CSP 环境（Tauri Webview / MV3 扩展默认禁止 unsafe-eval）必需，
    // 否则首次 t() 调用即抛 EvalError 导致整页白屏（桌面端 v2.0.2、扩展端 v2.0.7 均由此起）
    __INTLIFY_JIT_COMPILATION__: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'shared'),
    },
  },
  clearScreen: false,
  server: {
    port: 51730,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
})
