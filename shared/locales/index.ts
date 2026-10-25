/**
 * 词表入口：双端共用消息源 + 组件外翻译助手
 *
 * - Vue 组件内：经 shared/i18n.ts 的 vue-i18n 实例使用 t()（响应式、支持 <i18n-t>）
 * - 组件外（store / background SW / 测试）：用 flatTranslate()，不依赖 vue-i18n
 */
import { zhCN } from './zh-CN'
import { en } from './en'

export type Locale = 'zh-CN' | 'en'
export type LocaleSetting = Locale | 'system'

export const messages = {
  'zh-CN': zhCN,
  en,
} as const

export const FALLBACK_LOCALE: Locale = 'zh-CN'

/** 'system' → 按 navigator.language 解析；无效值回退 zh-CN */
export function resolveLocale(setting: string): Locale {
  if (setting === 'zh-CN' || setting === 'en') return setting
  const nav = typeof navigator !== 'undefined' ? navigator.language : ''
  return nav.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

/** 按点路径取嵌套词表的叶子字符串 */
function lookup(dict: unknown, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[part]
    }
    return undefined
  }, dict)
  return typeof value === 'string' ? value : undefined
}

/** {name} 占位符插值（值中的花括号是字面量，安全） */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

/**
 * 组件外翻译：按 key 查词表并插值。
 * 当前语言缺失该 key 时回退 zh-CN，再缺失则原样返回 key（便于发现遗漏）
 */
export function flatTranslate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const text =
    lookup(messages[locale], key) ?? lookup(messages[FALLBACK_LOCALE], key) ?? key
  return interpolate(text, params)
}
