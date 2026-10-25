<!--
  模板市场面板（桌面端 + 扩展端共用）
  浏览精选提示词模板：分类过滤 → 展开预览 → 一键导入当前空间。
  目录线上拉取（raw.githubusercontent），失败回退构建时内置副本。
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchCatalog, type MarketCatalog, type MarketTemplate } from '../../templateMarket'

const { t, locale } = useI18n()

const emit = defineEmits<{
  close: []
  import: [template: MarketTemplate]
}>()

const catalog = ref<MarketCatalog | null>(null)
const isLoading = ref(true)
const activeCategory = ref('all')
const expandedId = ref<string | null>(null)

const isEn = computed(() => locale.value === 'en')

const load = async () => {
  isLoading.value = true
  catalog.value = await fetchCatalog()
  isLoading.value = false
}

onMounted(load)

const categories = computed(() => catalog.value?.categories ?? [])

const visibleTemplates = computed(() => {
  if (activeCategory.value === 'all') {
    return categories.value.flatMap((c) => c.templates)
  }
  return categories.value.find((c) => c.id === activeCategory.value)?.templates ?? []
})

const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
}

const localizedTitle = (template: MarketTemplate) =>
  (isEn.value && template.titleEn) || template.title

const localizedDescription = (template: MarketTemplate) =>
  (isEn.value && template.descriptionEn) || template.description || ''

const categoryName = (category: { name: string; nameEn?: string }) =>
  (isEn.value && category.nameEn) || category.name
</script>

<template>
  <div class="p-4 bg-white dark:bg-background-dark text-foreground dark:text-foreground-dark overflow-y-auto max-h-[400px]">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <h3 class="text-base font-medium">
          {{ t('market.title') }}
        </h3>
        <span
          v-if="catalog"
          class="text-xs text-muted"
        >{{ t('market.updated', { date: catalog.updated }) }}</span>
      </div>
      <button
        class="p-1 rounded hover:bg-surface dark:hover:bg-surface-dark"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>

    <!-- 分类过滤 -->
    <div class="flex flex-wrap gap-1 mb-3">
      <button
        class="px-2.5 py-1 rounded-full text-xs transition-colors"
        :class="activeCategory === 'all'
          ? 'bg-primary text-white'
          : 'bg-surface dark:bg-surface-dark text-muted hover:text-foreground dark:hover:text-foreground-dark'"
        @click="activeCategory = 'all'"
      >
        {{ t('market.all') }}
      </button>
      <button
        v-for="category in categories"
        :key="category.id"
        class="px-2.5 py-1 rounded-full text-xs transition-colors"
        :class="activeCategory === category.id
          ? 'bg-primary text-white'
          : 'bg-surface dark:bg-surface-dark text-muted hover:text-foreground dark:hover:text-foreground-dark'"
        @click="activeCategory = category.id"
      >
        {{ categoryName(category) }}
      </button>
      <button
        class="px-2.5 py-1 rounded-full text-xs text-muted hover:text-foreground dark:hover:text-foreground-dark ml-auto"
        :disabled="isLoading"
        @click="load"
      >
        {{ t('market.refresh') }}
      </button>
    </div>

    <!-- 加载中 / 空 -->
    <div
      v-if="isLoading"
      class="py-8 text-center text-sm text-muted"
    >
      {{ t('market.loading') }}
    </div>
    <div
      v-else-if="visibleTemplates.length === 0"
      class="py-8 text-center text-sm text-muted"
    >
      {{ t('market.empty') }}
    </div>

    <!-- 模板列表 -->
    <div
      v-for="template in visibleTemplates"
      v-else
      :key="template.id"
      class="mb-2 rounded-lg border border-surface dark:border-surface-dark p-3"
    >
      <div
        class="flex items-center justify-between gap-2 cursor-pointer"
        @click="toggleExpand(template.id)"
      >
        <div class="min-w-0">
          <div class="text-sm font-medium truncate">
            {{ localizedTitle(template) }}
          </div>
          <div class="text-xs text-muted truncate mt-0.5">
            {{ localizedDescription(template) }}
          </div>
        </div>
        <span class="text-muted text-xs shrink-0">{{ expandedId === template.id ? '▲' : '▼' }}</span>
      </div>

      <!-- 展开预览 + 导入 -->
      <div v-if="expandedId === template.id">
        <pre class="mt-2 text-xs whitespace-pre-wrap break-words max-h-40 overflow-y-auto rounded p-2 bg-surface-soft-light dark:bg-surface-dark text-muted">{{ template.content }}</pre>
        <div class="flex items-center justify-between mt-2">
          <div class="flex gap-1">
            <span
              v-for="tag in template.tags"
              :key="tag"
              class="text-xs px-2 py-0.5 rounded bg-surface dark:bg-surface-dark text-muted"
            >{{ tag }}</span>
          </div>
          <button
            class="px-3 py-1 rounded text-xs bg-primary text-white hover:bg-primary-hover"
            @click="emit('import', template)"
          >
            {{ t('market.import') }}
          </button>
        </div>
      </div>
    </div>

    <div class="text-xs text-muted text-center mt-3 pt-2 border-t border-surface dark:border-surface-dark">
      {{ t('market.fallbackTip') }}
    </div>
  </div>
</template>
