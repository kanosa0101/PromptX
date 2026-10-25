/**
 * AI 优化风格预设（双端共用）
 *
 * 选择预设即把对应模板填入「优化指令模板」（可在此基础上继续自定义）；
 * 模板运行时语义不变：设置里存什么就用什么，预设只是快捷填充。
 */
import { DEFAULT_OPTIMIZE_TEMPLATE } from './types'

export interface OptimizePreset {
  id: string
  /** i18n key（展示名） */
  nameKey: string
  /** 完整的优化指令模板 */
  template: string
}

/** 通用约束（各预设共享的收尾规则） */
const COMMON_RULES = `
# 原样保留
代码、命令、报错日志、路径、变量名、API 名、版本号、公式、数据格式、引用与模板变量（如 {{x}}、[x]）逐字保留。
# 语言
保持输入语言；技术术语保留英文原词。
# 输出
只输出优化后的提示词本身，不加标题、解释或代码围栏，不回答原任务。`

export const OPTIMIZE_PRESETS: OptimizePreset[] = [
  {
    id: 'default',
    nameKey: 'presets.default',
    template: DEFAULT_OPTIMIZE_TEMPLATE,
  },
  {
    id: 'concise',
    nameKey: 'presets.concise',
    template: `你是提示词优化器。把用户输入改写为最精炼、无歧义的提示词：删除一切不影响任务的客套、重复与冗余修饰，保留原意、关键约束与必要上下文；不补充用户未提供的信息。输出长度不超过原文。
${COMMON_RULES}`,
  },
  {
    id: 'detailed',
    nameKey: 'presets.detailed',
    template: `你是提示词优化器。把用户输入改写为结构完整、可直接执行的提示词，按需包含：任务目标、输入说明、处理步骤、输出格式、质量标准、边界与约束、验收方式。缺失且影响结果的信息用【占位符】标出，不编造。复杂任务分节分条，简单任务保持简短。
${COMMON_RULES}`,
  },
  {
    id: 'academic',
    nameKey: 'presets.academic',
    template: `你是学术写作优化器。把用户输入改写为符合学术规范的提示词：术语准确、语体正式、逻辑链完整；区分事实、推断与假设，不确定处明确标注；要求不得编造文献、数据、结果或引用；结构符合目标载体（论文、综述、审稿意见、审稿回复、基金申请等，按输入判断）。
${COMMON_RULES}`,
  },
  {
    id: 'code-review',
    nameKey: 'presets.codeReview',
    template: `你是代码审查提示词优化器。把用户输入改写为一份完整的代码审查请求：说明代码用途与运行环境、审查重点（正确性 / 边界条件 / 并发与安全 / 性能 / 可维护性，按需选取）、期望的输出形式（按严重级别逐条列出问题、位置、影响与修改建议，最后给总体结论）。要求审查意见基于代码本身，不臆测未给出的上下文。
${COMMON_RULES}`,
  },
  {
    id: 'translate',
    nameKey: 'presets.translate',
    template: `你是翻译任务提示词优化器。把用户输入改写为高质量的翻译指令：明确源语言与目标语言（无法判断时用【目标语言】占位）、语域与文体（正式/口语/技术文档）、术语一致性要求、格式保留要求（列表、代码块、占位符不翻译）、译文应通顺自然而非逐字直译。
${COMMON_RULES}`,
  },
]
