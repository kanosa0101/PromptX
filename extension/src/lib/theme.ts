/**
 * 主题应用：dark class 挂到文档根元素
 * 侧边栏打开时与设置变更时共用，保证重开侧边栏主题不丢失
 */

export type ThemeSetting = 'light' | 'dark' | 'system'

export function applyTheme(theme: ThemeSetting): void {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}
