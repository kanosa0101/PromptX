/**
 * shared/variable.ts 单元测试：变量解析与替换（双端共用实现）
 */
import { describe, it, expect } from 'vitest'
import { parseVariables, replaceVariables } from '../variable'

describe('parseVariables', () => {
  it('解析中文变量名', () => {
    const result = parseVariables('请将文本翻译为{{目标语言}}')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('目标语言')
    expect(result[0].type).toBe('custom')
  })

  it('识别系统变量', () => {
    const result = parseVariables('内容：{{clipboard}}')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('clipboard')
    expect(result[0].type).toBe('system')
  })

  it('识别全部四种系统变量', () => {
    const result = parseVariables('{{clipboard}} {{date}} {{time}} {{timestamp}}')
    expect(result).toHaveLength(4)
    expect(result.every((v) => v.type === 'system')).toBe(true)
  })

  it('同名变量去重', () => {
    const result = parseVariables('{{目标语言}}和{{目标语言}}')
    expect(result).toHaveLength(1)
  })

  it('无变量返回空数组', () => {
    expect(parseVariables('没有变量的纯文本')).toEqual([])
  })

  it('跳过空变量名 {{}}', () => {
    expect(parseVariables('text{{}}more')).toEqual([])
  })
})

describe('replaceVariables', () => {
  it('替换单个变量', () => {
    expect(replaceVariables('Hello {{name}}', { name: 'World' })).toBe('Hello World')
  })

  it('替换多个变量与中文变量名', () => {
    expect(replaceVariables('翻译为{{目标语言}}，语气{{语气}}', {
      目标语言: '英语',
      语气: '正式',
    })).toBe('翻译为英语，语气正式')
  })

  it('未提供值的变量保持原样', () => {
    expect(replaceVariables('{{a}}{{b}}', { a: 'X' })).toBe('X{{b}}')
  })

  it('无变量文本原样返回', () => {
    expect(replaceVariables('no vars', {})).toBe('no vars')
  })
})
