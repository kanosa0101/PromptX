/**
 * vue-i18n 实例工厂（双端共用）
 *
 * 各端 main.ts 调用 createAppI18n(语言设置) 创建实例并 app.use()；
 * 语言切换时直接改 i18n.global.locale.value（各端设置面板负责调用）。
 */
import { createI18n } from 'vue-i18n'
import { messages, resolveLocale, type Locale } from './locales'

export function createAppI18n(localeSetting: string) {
  return createI18n({
    legacy: false,
    locale: resolveLocale(localeSetting) as Locale,
    fallbackLocale: 'zh-CN',
    messages,
  })
}

export { resolveLocale }
export type { Locale }
