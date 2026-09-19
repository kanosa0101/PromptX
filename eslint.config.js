import js from '@eslint/js'
import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['vue3-recommended'],
  {
    ignores: ['dist/**', 'node_modules/**', 'src-tauri/**', 'extension/**'],
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]