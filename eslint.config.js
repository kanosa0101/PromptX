import js from '@eslint/js'
import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'

export default [
  // ignores 需置于最前，避免对 dist/node_modules 产物流报错
  { ignores: ['dist/**', 'node_modules/**', 'src-tauri/**', 'extension/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  // eslint-plugin-vue v9 的 flat config 命名：flat/recommended 即 vue3-recommended
  ...vue.configs['flat/recommended'],
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
