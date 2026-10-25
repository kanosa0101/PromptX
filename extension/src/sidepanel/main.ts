import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/sidepanel.css'
import { i18n, setLocale } from './i18n'
import { loadAppData } from '@/lib/storage'

// 先读取已存语言再挂载，避免打开瞬间显示错语言
// （构建目标不支持顶层 await，用 bootstrap 函数）
async function bootstrap(): Promise<void> {
  const data = await loadAppData().catch(() => null)
  setLocale(data?.settings?.language || 'system')

  const app = createApp(App)
  app.use(createPinia())
  app.use(i18n)
  app.mount('#app')
}

void bootstrap()
