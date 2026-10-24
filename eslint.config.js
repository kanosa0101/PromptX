import js from '@eslint/js'
import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'

export default [
  // ignores 需置于最前，避免对产物流报错（extension 的 dist/node_modules 同理）
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src-tauri/**',
      'extension/dist/**',
      'extension/node_modules/**',
      // CommonJS 图标生成脚本，不参与 lint
      'extension/generate-icons.cjs',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  // eslint-plugin-vue v9 的 flat config 命名：flat/recommended 即 vue3-recommended
  ...vue.configs['flat/recommended'],
  {
    // 扩展源码使用 chrome.* API，为其声明全局
    files: ['extension/src/**/*.{ts,vue}'],
    languageOptions: {
      globals: {
        chrome: 'readonly',
      },
    },
  },
  {
    // .vue 文件：模板用 vue-eslint-parser，<script lang="ts"> 用 TS 解析器
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: ts.parser },
    },
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]
