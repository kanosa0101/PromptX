import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

// 构建后处理插件
function copyManifestPlugin() {
  return {
    name: 'copy-manifest',
    writeBundle() {
      // 复制 manifest.json 到 dist
      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(__dirname, 'dist/manifest.json')
      )

      // 确保 icons 目录存在
      const iconsDir = resolve(__dirname, 'dist/icons')
      if (!existsSync(iconsDir)) {
        mkdirSync(iconsDir, { recursive: true })
      }

      // 复制图标文件 (如果存在)
      const srcIconsDir = resolve(__dirname, 'public/icons')
      if (existsSync(srcIconsDir)) {
        const sizes = ['16', '32', '48', '128']
        for (const size of sizes) {
          const srcPath = resolve(srcIconsDir, `icon${size}.png`)
          const destPath = resolve(iconsDir, `icon${size}.png`)
          if (existsSync(srcPath)) {
            copyFileSync(srcPath, destPath)
          }
        }
      }

      console.log('[PromptX] Manifest and icons copied to dist/')
    }
  }
}

export default defineConfig({
  plugins: [vue(), copyManifestPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../shared'),
      // 强制 vue/vue-i18n 解析到根 node_modules 的同一副本：
      // shared/ 代码从根解析、扩展自身代码原本解析到 extension/node_modules（peer 自动安装），
      // 不钉死会出现双 Vue 运行时（响应式系统/context 各自独立，i18n 插件会失效）
      'vue': resolve(__dirname, '../node_modules/vue'),
      'vue-i18n': resolve(__dirname, '../node_modules/vue-i18n')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background/index.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  server: {
    port: 5174
  }
})