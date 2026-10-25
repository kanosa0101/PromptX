/**
 * 扩展端 Side Panel i18n 单例
 *
 * 语言设置持久化在 chrome.storage 的 settings.language；main.ts 挂载前
 * 先读取一次（避免闪错语言），后续由设置面板切换时直接更新。
 */
import { createAppI18n, resolveLocale } from '@shared/i18n'

export const i18n = createAppI18n('system')

/** 组件外翻译 */
export const t = i18n.global.t

/** 切换语言 */
export function setLocale(setting: string) {
  i18n.global.locale.value = resolveLocale(setting)
}
