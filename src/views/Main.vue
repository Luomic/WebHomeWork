<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Paginator from 'primevue/paginator'
import Message from 'primevue/message'
import { Search, MapPin, SearchX } from 'lucide-vue-next'
import MarketCard from '@/components/MarketCard.vue'
import MarketDetail from '@/components/MarketDetail.vue'
import { toMarketItem, categories, browseState } from '@/data/market'
import { getRankedGoods, resolveAssetUrl, getFavorites, authState, isLoggedIn } from '@/api/client'

const router = useRouter()
const route = useRoute()
const favoritesOnly = computed(() => route.query.favorites === '1')
let loadVersion = 0
const pageEl = ref(null), gridEl = ref(null), selected = ref(null)
const goodsItems = ref([])
const feedLoading = ref(false), feedError = ref('')
const PAGE_SIZE = 20
const first = computed({
  get: () => browseState.first,
  set: value => { browseState.first = value },
})
const sorts = [{ label: '推荐排序', value: 'default' }, { label: '价格从低到高', value: 'price' }]
const filterCategories = computed(() => ['全部', ...new Set([
  ...categories.slice(1),
  ...goodsItems.value.map(item => item.category).filter(Boolean),
])])
const query = computed({
  get: () => browseState.query,
  set: value => { browseState.query = value },
})
// /api/goods/ranked 返回完整推荐序列；先保留服务端排名筛选，再切每页 20 条。
// GoodsList 没有等级、收藏量、有效举报量，前端不能从这些字段重算推荐分。
const filteredGoods = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  const list = goodsItems.value.filter(item =>
    item.status === 'approved' &&
    (browseState.category === '全部' || item.category === browseState.category) &&
    [item.title, item.description, item.category].filter(Boolean).join(' ').toLocaleLowerCase().includes(needle),
  )
  // 价格排序只作用于副本；切回推荐排序时恢复原始排名。
  if (browseState.sort === 'price') return [...list].sort((a, b) => a.price - b.price)
  return list
})
const totalRecords = computed(() => filteredGoods.value.length)
const visibleItems = computed(() => filteredGoods.value.slice(first.value, first.value + PAGE_SIZE).map(toMarketItem))
// 分页、分类或筛选条件变化时更换 key，确保 Transition 真正创建离场/入场节点。
// 只使用视图条件，不把商品对象本身序列化进 key，避免瀑布网格频繁重建。
const feedViewKey = computed(() => JSON.stringify([
  first.value,
  browseState.category,
  browseState.sort,
  query.value.trim().toLocaleLowerCase(),
]))
function resetScroll() {
  browseState.scroll = 0
  if (pageEl.value) pageEl.value.scrollTop = 0
}
function onPage(event) {
  first.value = event.first
  resetScroll()
}
// ranked 接口已按服务端推荐算法排序；这里仅规范图片 URL，不重算推荐顺序。
async function loadGoods() {
  const version = ++loadVersion
  feedLoading.value = true
  feedError.value = ''
  try {
    if (favoritesOnly.value && !isLoggedIn.value) {
      goodsItems.value = []; feedError.value = '请先登录后查看收藏。'; return
    }
    const goods = await (favoritesOnly.value ? getFavorites() : getRankedGoods())
    if (version !== loadVersion) return
    goodsItems.value = goods.map(item => ({
      ...item,
      images: Array.isArray(item.images) ? item.images.map(resolveAssetUrl) : [],
    }))
  } catch (error) {
    if (version !== loadVersion) return
    goodsItems.value = []
    feedError.value = error instanceof Error ? error.message : '商品列表加载失败。'
  } finally {
    if (version === loadVersion) feedLoading.value = false
  }
}
let observer, frame
function disconnectGridObserver() {
  observer?.disconnect()
  cancelAnimationFrame(frame)
}
function measureGrid(grid) {
  if (!grid) return
  const gap = parseFloat(getComputedStyle(grid).rowGap)
  grid.querySelectorAll('.feed-cell').forEach(cell => {
    const height = cell.firstElementChild?.getBoundingClientRect().height ?? 0
    cell.style.gridRowEnd = 'span ' + Math.ceil((height + gap) / (8 + gap))
  })
}
function measure() {
  // 打断上一帧
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => measureGrid(gridEl.value))
}
function prepareFeed(section) {
  // enter 时 DOM 已插入，但模板 ref 可能尚未更新；从入场节点直接测量，首帧即呈现正确瀑布布局。
  const grid = section.querySelector('.feed-grid')
  disconnectGridObserver()
  grid?.querySelectorAll('.market-card').forEach(el => observer?.observe(el))
  measureGrid(grid)
}
async function observeCards() {
  // 异步等待DOM更新
  await nextTick()
  disconnectGridObserver()
  gridEl.value?.querySelectorAll('.market-card').forEach(el => observer?.observe(el))
  measure()
}
function openMap(item) {
  selected.value = null
  router.push({ name: 'home-map', query: item ? { item: item.id } : { q: browseState.query, category: browseState.category } })
}
function saveScroll(event) { browseState.scroll = event.target.scrollTop }
function restoreScroll() {
  requestAnimationFrame(() => { if (pageEl.value) pageEl.value.scrollTop = browseState.scroll })
}
async function restoreFeed() {
  await observeCards()
  restoreScroll()
}
// 条件变化先复位分页，再由入场钩子绑定新网格，避免观察到离场中的旧卡片。
watch([query, () => browseState.category, () => browseState.sort], () => {
  first.value = 0
  selected.value = null
  resetScroll()
})
watch(first, () => { selected.value = null })
watch(totalRecords, total => {
  if (first.value >= total && total > 0) first.value = Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE
  if (!total) first.value = 0
}, { immediate: true })
const onGoodsUpdated = () => { void loadGoods() }
const onFavoritesUpdated = () => { if (favoritesOnly.value) void loadGoods() }
watch([favoritesOnly, isLoggedIn, () => authState.token], () => { first.value = 0; selected.value = null; void loadGoods() })
// 首次请求和发布刷新都会异步替换商品网格；数据变化后重新绑定卡片观察器，
// 避免节点刚渲染时错过瀑布流行高测量。
watch(goodsItems, () => { void observeCards() }, { flush: 'post' })
onMounted(async () => {
  observer = new ResizeObserver(measure)
  window.addEventListener('market:goods-updated', onGoodsUpdated)
  window.addEventListener('market:favorites-updated', onFavoritesUpdated)
  await Promise.all([restoreFeed(), loadGoods()])
})
onBeforeUnmount(() => {
  disconnectGridObserver()
  window.removeEventListener('market:goods-updated', onGoodsUpdated)
  window.removeEventListener('market:favorites-updated', onFavoritesUpdated)
  loadVersion++
})
</script>
<template>
  <main ref="pageEl" class="main-page" @scroll="saveScroll">
    <div class="feed-container">
      <header class="feed-heading">
        <div>
          <p class="page-context">校园商品交易</p>
          <h1>{{ favoritesOnly ? '我的收藏' : '逛市集' }}</h1>
        </div><span class="campus-name">
          <MapPin :size="15" aria-hidden="true" />朝晖校区
        </span>
      </header>
      <div class="feed-toolbar"><label class="search-field">
          <Search :size="18" aria-hidden="true" />
          <InputText v-model="query" aria-label="搜索商品" placeholder="搜索想找的商品" />
        </label><Button severity="secondary" outlined class="map-link" aria-label="前往地图" @click="openMap()">
          <MapPin :size="16" aria-hidden="true" /><span>前往地图</span>
        </Button></div>
      <div class="content-switch"><span class="section-label">商品列表</span><span class="total-note">{{ favoritesOnly ? '我的收藏' : '推荐' }} · 共 {{ totalRecords }} 件商品</span>
      </div>
      <div class="feed-filters">
        <div class="category-list" aria-label="商品分类">
          <Button v-for="name in filterCategories" :key="name" unstyled
            class="category-button" :class="{ active: browseState.category === name }"
            :aria-pressed="browseState.category === name" @click="browseState.category = name">
            {{ name }}
          </Button>
        </div>
        <Select v-model="browseState.sort" :options="sorts" optionLabel="label" optionValue="value" aria-label="商品排序"
          size="small" class="sort-select" />
      </div>
      <Transition name="feed-fade" mode="out-in" @before-leave="disconnectGridObserver"
        @enter="prepareFeed" @after-enter="restoreScroll">
        <section :key="feedViewKey" aria-label="商品列表">
          <div v-if="feedLoading" class="feed-state" role="status">正在加载商品…</div>
          <div v-else-if="feedError" class="feed-state" role="alert">
            <Message severity="error" :closable="false">{{ feedError }}</Message>
            <Button severity="secondary" outlined @click="loadGoods">重试</Button>
          </div>
          <div v-else ref="gridEl" class="feed-grid">
            <article v-for="item in visibleItems" :key="item.id" class="feed-cell">
              <MarketCard :item="item" @open="selected = $event" />
            </article>
          </div>
          <div v-if="!feedLoading && !feedError && !visibleItems.length" class="feed-empty" role="status">
            <SearchX :size="32" aria-hidden="true" />
            <h2>暂时没有匹配的商品</h2>
            <p>换个关键词，或者清除当前筛选。</p><Button label="清除筛选" severity="secondary"
              @click="query = ''; browseState.category = '全部'" />
          </div>
        </section>
      </Transition>
      <footer v-if="totalRecords && !feedLoading && !feedError" class="feed-footer">
        <span>显示 {{ first + 1 }}–{{ Math.min(first + PAGE_SIZE, totalRecords) }} / {{ totalRecords }} 件</span>
        <Paginator :first="first" :rows="PAGE_SIZE" :totalRecords="totalRecords"
          :pageLinkSize="3" template="PrevPageLink PageLinks NextPageLink" @page="onPage" />
      </footer>
    </div>
    <MarketDetail :item="selected" @close="selected = null" @map="openMap" />
  </main>
</template>
<style scoped>
.main-page {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  background: var(--app-bg);
  color: var(--app-text);
  font: 14px/1.5 system-ui, sans-serif;
  scrollbar-gutter: stable
}

.feed-container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 28px clamp(16px, 3vw, 40px) 24px
}

.feed-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
  gap: 16px
}

.feed-heading h1 {
  font-size: 24px;
  font-weight: 650;
  margin: 4px 0 0;
  letter-spacing: -.5px
}

.page-context {
  margin: 0;
  color: var(--app-muted);
  font-size: 12px
}

.campus-name {
  display: flex;
  gap: 5px;
  align-items: center;
  font-size: 12px;
  color: var(--app-muted)
}

.feed-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px
}

.search-field {
  position: relative;
  flex: 1;
  min-width: 0
}

.search-field>svg {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--app-muted);
  z-index: 1;
  pointer-events: none
}

.search-field :deep(input) {
  width: 100%;
  padding-left: 40px
}

.map-link {
  white-space: nowrap
}

.content-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--app-border);
  gap: 10px
}

.total-note {
  font-size: 11px;
  color: var(--app-muted)
}

.feed-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 18px 0 22px
}

.category-list {
  display: flex;
  gap: 22px;
  overflow-x: auto;
  min-width: 0
}

.category-button {
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 6px 0;
  background: none;
  color: var(--app-muted);
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
  transition: color .16s, border-color .16s
}

.category-button.active {
  color: var(--app-text);
  border-color: var(--app-text)
}

.category-button:focus-visible {
  outline: 2px solid var(--app-text);
  outline-offset: 2px
}

.sort-select {
  min-width: 132px
}

.section-label {
  font-size: 13px;
  font-weight: 550
}

.feed-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 8px;
  gap: 20px;
  align-items: start
}

.feed-cell {
  min-width: 0
}

.feed-empty {
  padding: 64px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--app-muted);
  gap: 12px
}

.feed-state {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  color: var(--app-muted)
}

.feed-empty h2 {
  font-size: 17px;
  margin: 0;
  color: var(--app-text)
}

.feed-empty p {
  margin: 0 0 8px
}

.feed-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-top: 32px;
  font-size: 11px;
  color: var(--app-muted)
}

.feed-footer :deep(.p-paginator) {
  padding: 0;
  background: transparent;
  border: 0;
}

.feed-footer :deep(.p-paginator-page),
.feed-footer :deep(.p-paginator-prev),
.feed-footer :deep(.p-paginator-next) {
  min-width: 2rem;
  height: 2rem;
}

.feed-fade-enter-active,
.feed-fade-leave-active {
  transition: opacity .24s ease, transform .24s ease
}

.feed-fade-enter-from {
  opacity: 0;
  transform: translateY(10px)
}

.feed-fade-leave-to {
  opacity: 0
}

@media(max-width:1200px) {
  .feed-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr))
  }
}

@media(max-width:740px) {
  .feed-container {
    padding: 22px 16px
  }

  .feed-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px
  }

  .feed-heading {
    margin-bottom: 18px
  }

  .feed-heading h1 {
    font-size: 22px
  }

  .map-link span {
    display: none
  }

  .feed-toolbar {
    margin-bottom: 18px
  }

  .total-note {
    font-size: 10px
  }

  .feed-filters {
    flex-wrap: wrap;
    gap: 10px
  }

  .category-list {
    flex: 1;
    gap: 18px
  }

  .sort-select {
    min-width: 115px;
    max-width: 140px
  }
}

@media(max-width:340px) {
  .feed-grid {
    grid-template-columns: 1fr
  }
}

@media(prefers-reduced-motion:reduce) {

  .feed-fade-enter-active,
  .feed-fade-leave-active,
  .category-button {
    transition: none
  }

  .feed-fade-enter-from {
    transform: none
  }
}
</style>
