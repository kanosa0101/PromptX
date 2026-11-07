/**
 * 检测当前是否运行在 Tauri 桌面端环境
 * - 在 Tauri Webview 中，window.__TAURI_INTERNALS__ 或 window.__TAURI__ 会被自动注入。
 * - 在纯浏览器端（如 npm run dev 并在浏览器中打开 http://localhost:51730），返回 false，走纯前端 Mock/LocalStorage 路径。
 * - 在 Vitest 测试环境下，默认返回 true，确保原有的 Tauri invoke 契约测试正常执行。
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  if (import.meta.env?.MODE === 'test' || process.env.NODE_ENV === 'test') {
    return true
  }
  return Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
    (window as unknown as { __TAURI__?: unknown }).__TAURI__
  )
}
