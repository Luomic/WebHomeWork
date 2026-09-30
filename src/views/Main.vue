<script setup>
/*
 * 逛市集页（/home/main）：校园商品的瀑布流信息流。
 *
 * 瀑布流使用 CSS 网格配合 JS 测量卡片高度，图片加载完成后由
 * ResizeObserver 触发重排。浏览状态放在 data/market.ts，切页回来仍保留。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { Search, MapPin, SearchX } from 'lucide-vue-next'
import MarketCard from '@/components/MarketCard.vue'
import MarketDetail from '@/components/MarketDetail.vue'
import { marketItems, categories, browseState } from '@/data/market'

const router = useRouter()
const pageEl = ref(null), gridEl = ref(null), selected = ref(null)
const sorts = [{ label: '默认顺序', value: 'default' }, { label: '价格从低到高', value: 'price' }]
const query = computed({
  get: () => browseState.query,
  set: value => { browseState.query = value },
})
const visibleItems = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  const list = marketItems.filter(item =>
    (browseState.category === '全部' || item.category === browseState.category) &&
    (item.title + item.place).toLocaleLowerCase().includes(needle),
  )
  return browseState.sort === 'price' ? list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)) : list
})
let observer, frame
function measure() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    if (!gridEl.value) return
    const gap = parseFloat(getComputedStyle(gridEl.value).rowGap)
    gridEl.value.querySelectorAll('.feed-cell').forEach(cell => {
      const height = cell.firstElementChild?.getBoundingClientRect().height ?? 0
      cell.style.gridRowEnd = 'span ' + Math.ceil((height + gap) / (8 + gap))
    })
  })
}
async function observeCards() {
  await nextTick()
  observer?.disconnect()
  gridEl.value?.querySelectorAll('.market-card').forEach(el => observer?.observe(el))
  measure()
}
function openMap(item) {
  selected.value = null
  router.push({ name: 'home-map', query: item ? { item: item.id } : { q: browseState.query, category: browseState.category } })
}
function saveScroll(event) { browseState.scroll = event.target.scrollTop }
async function restoreFeed() {
  await observeCards()
  requestAnimationFrame(() => { if (pageEl.value) pageEl.value.scrollTop = browseState.scroll })
}
watch(visibleItems, observeCards)
onMounted(async () => { observer = new ResizeObserver(measure); await restoreFeed() })
onBeforeUnmount(() => { observer?.disconnect(); cancelAnimationFrame(frame) })
</script>
<template>
  <main ref="pageEl" class="main-page" @scroll="saveScroll">
    <div class="feed-container">
      <header class="feed-heading"><div><p class="page-context">校园商品交易</p><h1>逛市集</h1></div><span class="campus-name"><MapPin :size="15" aria-hidden="true" />朝晖校区</span></header>
      <div class="feed-toolbar"><label class="search-field"><Search :size="18" aria-hidden="true" /><InputText v-model="query" aria-label="搜索商品" placeholder="搜索想找的商品" /></label><Button severity="secondary" outlined class="map-link" aria-label="地图找商品" @click="openMap()"><MapPin :size="16" aria-hidden="true" /><span>地图找商品</span></Button></div>
      <div class="content-switch"><span class="section-label">商品列表</span><span class="sample-note">示例内容 · 未接入真实数据</span></div>
      <div class="feed-filters"><div class="category-list" aria-label="商品分类"><Button v-for="name in categories" :key="name" unstyled class="category-button" :class="{ active: browseState.category === name }" :aria-pressed="browseState.category === name" @click="browseState.category = name">{{ name }}</Button></div><Select v-model="browseState.sort" :options="sorts" optionLabel="label" optionValue="value" aria-label="商品排序" size="small" class="sort-select" /></div>
      <Transition name="feed-fade" mode="out-in" @after-enter="restoreFeed">
        <section key="products" aria-label="商品列表">
          <div ref="gridEl" class="feed-grid"><article v-for="item in visibleItems" :key="item.id" class="feed-cell"><MarketCard :item="item" @open="selected = $event" /></article></div>
          <div v-if="!visibleItems.length" class="feed-empty" role="status"><SearchX :size="32" aria-hidden="true" /><h2>暂时没有匹配的商品</h2><p>换个关键词，或者清除当前筛选。</p><Button label="清除筛选" severity="secondary" @click="query = ''; browseState.category = '全部'" /></div>
        </section>
      </Transition>
      <footer class="feed-footer">{{ visibleItems.length }} 件示例商品 · 已全部展示</footer>
    </div>
    <MarketDetail :item="selected" @close="selected = null" @map="openMap" />
  </main>
</template>
<style scoped>
.main-page{flex:1;min-height:0;min-width:0;overflow:auto;background:var(--app-bg);color:var(--app-text);font:14px/1.5 system-ui,sans-serif;scrollbar-gutter:stable}.feed-container{max-width:1320px;margin:0 auto;padding:28px clamp(16px,3vw,40px) 24px}.feed-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;gap:16px}.feed-heading h1{font-size:24px;font-weight:650;margin:4px 0 0;letter-spacing:-.5px}.page-context{margin:0;color:var(--app-muted);font-size:12px}.campus-name{display:flex;gap:5px;align-items:center;font-size:12px;color:var(--app-muted)}.feed-toolbar{display:flex;gap:12px;margin-bottom:24px}.search-field{position:relative;flex:1;min-width:0}.search-field>svg{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--app-muted);z-index:1;pointer-events:none}.search-field :deep(input){width:100%;padding-left:40px}.map-link{white-space:nowrap}.content-switch{display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:1px solid var(--app-border);gap:10px}.sample-note{font-size:11px;color:var(--app-muted)}.feed-filters{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:18px 0 22px}.category-list{display:flex;gap:22px;overflow-x:auto;min-width:0}.category-button{border:0;border-bottom:2px solid transparent;padding:6px 0;background:none;color:var(--app-muted);font:inherit;white-space:nowrap;cursor:pointer;transition:color .16s,border-color .16s}.category-button.active{color:var(--app-text);border-color:var(--app-text)}.category-button:focus-visible{outline:2px solid var(--app-text);outline-offset:2px}.sort-select{min-width:132px}.section-label{font-size:13px;font-weight:550}.feed-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:8px;gap:20px;align-items:start}.feed-cell{min-width:0}.feed-empty{padding:64px 20px;display:flex;flex-direction:column;align-items:center;text-align:center;color:var(--app-muted);gap:12px}.feed-empty h2{font-size:17px;margin:0;color:var(--app-text)}.feed-empty p{margin:0 0 8px}.feed-footer{text-align:center;margin-top:36px;font-size:11px;color:var(--app-muted)}.feed-fade-enter-active,.feed-fade-leave-active{transition:opacity .16s ease,transform .16s ease}.feed-fade-enter-from{opacity:0;transform:translateY(5px)}.feed-fade-leave-to{opacity:0}@media(max-width:1200px){.feed-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:740px){.feed-container{padding:22px 16px}.feed-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.feed-heading{margin-bottom:18px}.feed-heading h1{font-size:22px}.map-link span{display:none}.feed-toolbar{margin-bottom:18px}.sample-note{font-size:10px}.feed-filters{flex-wrap:wrap;gap:10px}.category-list{flex:1;gap:18px}.sort-select{min-width:115px;max-width:140px}}@media(max-width:340px){.feed-grid{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.feed-fade-enter-active,.feed-fade-leave-active,.category-button{transition:none}.feed-fade-enter-from{transform:none}}
</style>
