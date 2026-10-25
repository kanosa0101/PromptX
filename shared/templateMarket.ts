/**
 * 模板市场（双端共用）
 *
 * 目录数据单源存放在仓库根 templates.json，经 raw.githubusercontent 分发——
 * 更新目录只需提交仓库，无需发版。客户端优先拉取线上目录，失败（离线/被墙/
 * 结构损坏）时回退到构建时打包的内置副本。
 */
import bundled from '../templates.json'

export interface MarketTemplate {
  id: string
  title: string
  titleEn?: string
  description?: string
  descriptionEn?: string
  content: string
  tags: string[]
}

export interface MarketCategory {
  id: string
  name: string
  nameEn?: string
  templates: MarketTemplate[]
}

export interface MarketCatalog {
  version: number
  updated: string
  categories: MarketCategory[]
}

export const MARKET_URL =
  'https://raw.githubusercontent.com/kanosa0101/PromptX/main/templates.json'

export const BUNDLED_CATALOG = bundled as MarketCatalog

/** 极简结构校验：字段齐全才采用，否则回退内置 */
function isValidCatalog(data: unknown): data is MarketCatalog {
  const catalog = data as MarketCatalog
  return (
    !!catalog &&
    Array.isArray(catalog.categories) &&
    catalog.categories.every(
      (category) =>
        typeof category.id === 'string' &&
        typeof category.name === 'string' &&
        Array.isArray(category.templates) &&
        category.templates.every(
          (template) =>
            typeof template.id === 'string' &&
            typeof template.title === 'string' &&
            typeof template.content === 'string',
        ),
    )
  )
}

/** 拉取目录：线上优先，任何失败回退内置副本 */
export async function fetchCatalog(signal?: AbortSignal): Promise<MarketCatalog> {
  try {
    const response = await fetch(MARKET_URL, { signal })
    if (!response.ok) return BUNDLED_CATALOG
    const data: unknown = await response.json()
    return isValidCatalog(data) ? data : BUNDLED_CATALOG
  } catch {
    return BUNDLED_CATALOG
  }
}
