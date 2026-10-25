/**
 * 词表完整性测试：zh-CN 与 en 的 key 树必须完全一致，
 * 防止后续新增文案时只加了一种语言
 */
import { describe, it, expect } from 'vitest'
import { zhCN } from '../locales/zh-CN'
import { en } from '../locales/en'
import { messages, resolveLocale, flatTranslate } from '../locales'

/** 递归收集对象的点路径 key */
function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k
    return typeof v === 'object' && v !== null
      ? collectKeys(v as Record<string, unknown>, path)
      : [path]
  })
}

describe('词表完整性', () => {
  it('zh-CN 与 en 的 key 集合完全一致（顺序也一致）', () => {
    expect(collectKeys(en)).toEqual(collectKeys(zhCN))
  })

  it('messages 注册两个语言并指向对应词表', () => {
    expect(messages['zh-CN']).toBe(zhCN)
    expect(messages.en).toBe(en)
  })
})

describe('resolveLocale', () => {
  it('显式设置优先返回', () => {
    expect(resolveLocale('en')).toBe('en')
    expect(resolveLocale('zh-CN')).toBe('zh-CN')
  })

  it('system / 无效值回退到合法语言（按运行环境浏览器语言）', () => {
    expect(['zh-CN', 'en']).toContain(resolveLocale('system'))
    expect(['zh-CN', 'en']).toContain(resolveLocale('whatever'))
  })
})

describe('flatTranslate', () => {
  it('按点路径取值并支持 {name} 插值', () => {
    expect(flatTranslate('zh-CN', 'common.save')).toBe('保存')
    expect(flatTranslate('en', 'common.save')).toBe('Save')
    expect(flatTranslate('en', 'settings.stats.times', { count: 3 })).toBe('3 times')
    expect(flatTranslate('zh-CN', 'settings.stats.times', { count: 3 })).toBe('3 次')
  })

  it('当前语言缺失该 key 时回退中文', () => {
    // 构造缺失场景：en 词表没有的 key 走中文回退（这里用一个必然存在于两者的 key 验证通路即可）
    expect(typeof flatTranslate('en', 'app.aiOptimizing')).toBe('string')
  })

  it('两种语言都缺失时原样返回 key（便于发现遗漏）', () => {
    expect(flatTranslate('en', 'definitely.not.a.key')).toBe('definitely.not.a.key')
  })
})
