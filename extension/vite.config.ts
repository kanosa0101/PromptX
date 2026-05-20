import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, writeFileSync } from 'fs'

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
      '@': resolve(__dirname, 'src')
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