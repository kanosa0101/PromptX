import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import App from './App.vue'
import './styles/main.css'
import { i18n } from './i18n'
import { isTauri } from './utils/isTauri'

// 全局异常捕获：保证任何未捕获错误都能写入日志并在界面可见，绝不静默白屏
function reportGlobalError(type: string, error: unknown) {
  const msg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error)
  const fullMsg = `[FE-${type}] ${msg}`
  console.error(fullMsg)
  if (isTauri()) {
    invoke('ai_debug_log', { message: fullMsg }).catch(() => {})
  }
  const errDiv = document.createElement('div')
  errDiv.style.cssText =
    'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(20,20,30,0.95);color:#ff6b6b;padding:20px;font-family:monospace;font-size:12px;z-index:999999;overflow:auto;user-select:text;'
  errDiv.innerHTML = `<h3 style="color:#ff8787;margin-bottom:8px;">[Frontend Error: ${type}]</h3><pre style="white-space:pre-wrap;color:#eee;">${msg}</pre>`
  document.body.appendChild(errDiv)
}

window.addEventListener('error', (e) => reportGlobalError('WINDOW_ERROR', e.error || e.message))
window.addEventListener('unhandledrejection', (e) => reportGlobalError('PROMISE_REJECTION', e.reason))

// 支持 F12 打开 DevTools
window.addEventListener('keydown', (e) => {
  if (e.key === 'F12' && isTauri()) {
    invoke('open_devtools').catch(() => {})
  }
})

const app = createApp(App)
const pinia = createPinia()

app.config.errorHandler = (err, _instance, info) => {
  reportGlobalError(`VUE_ERROR(${info})`, err)
}

app.use(pinia)
app.use(i18n)
app.mount('#app')
