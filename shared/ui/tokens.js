/**
 * 双端共享设计令牌（design.md Step 1：token 统一）
 *
 * 所有自定义色值的唯一来源：桌面端与扩展端的 tailwind.config.js 均从这里取色，
 * 修改色值只需改这一处，双端同步生效（此前两端 border 色值已发生漂移：
 * #E4E4E7/#27272A vs #E5E7EB/#374151，本文件即为修复）。
 *
 * 命名约定：
 * - primary / error 等为语义色，light/dark 为对应暗色模式变体
 * - surface 系列为填充与边框的中性色（hover-* 为悬停表面，soft-* 为弱化表面）
 */

export const colors = {
  primary: {
    DEFAULT: '#3B82F6',
    light: '#3B82F6',
    dark: '#60A5FA',
    hover: '#2563EB',
  },
  background: {
    DEFAULT: '#FFFFFF',
    light: '#FFFFFF',
    dark: '#1A1A2E',
  },
  foreground: {
    DEFAULT: '#1A1A2E',
    light: '#1A1A2E',
    dark: '#E4E4E7',
  },
  surface: {
    DEFAULT: '#E4E4E7',
    light: '#E4E4E7',
    dark: '#27272A',
    'hover-light': '#D4D4D8',
    'hover-dark': '#3A3A3E',
    'soft-light': '#F4F4F5',
    'soft-dark': '#3F3F46',
  },
  muted: {
    DEFAULT: '#71717A',
  },
  success: {
    DEFAULT: '#10B981',
  },
  warning: {
    DEFAULT: '#F59E0B',
  },
  error: {
    DEFAULT: '#EF4444',
    hover: '#DC2626',
  },
}
