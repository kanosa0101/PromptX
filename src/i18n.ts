/**
 * 桌面端 i18n 单例
 *
 * 语言设置持久化在后端 settings.language；启动先按系统语言创建（避免闪白），
 * loadSettings 完成后由 settingsStore 调 setLocale 同步真实设置。
 */
import { createAppI18n, resolveLocale } from '@shared/i18n'

export const i18n = createAppI18n('system')

/** 组件外翻译（store/组合式函数中直接 import 使用） */
export const t = i18n.global.t

/** 切换语言（settingsStore 在加载与变更时调用） */
export function setLocale(setting: string) {
  i18n.global.locale.value = resolveLocale(setting)
}
