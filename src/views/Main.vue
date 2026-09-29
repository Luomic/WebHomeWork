<script setup>
/*
 * 逛市集页（/home/main）：商品/种草的瀑布流信息流。
 *
 * 瀑布流实现（纯 CSS 网格 + JS 量高，不引库）：
 *   .feed-grid 的 grid-auto-rows 是 8px —— 每个格子高 8px，卡片通过
 *   gridRowEnd = span N 占 N 个格子。measure() 量出每张卡的真实高度，
 *   换算成"需要几个 8px"，于是矮卡占行少、高卡占行多，形成错落效果。
 *   图片加载完高度会变，所以用 ResizeObserver 盯着每张卡重算。
 *
 * 状态存放在 data/market.ts 的 browseState（模块级单例）：
 * 切去别的页面再回来，搜索词、分类、滚动位置都还在。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
// useRouter：在脚本里拿路由实例（模板里才是 $router）
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import { Search, MapPin, SearchX } from 'lucide-vue-next'
import MarketCard from '@/components/MarketCard.vue'
import MarketDetail from '@/components/MarketDetail.vue'
// 数据源 + 共享浏览状态（切换页面后搜索/滚动仍保留）
import { marketItems, categories, browseState } from '@/data/market'
const router = useRouter()
// 三个模板元素/状态：pageEl=滚动容器；gridEl=瀑布流网格；selected=详情弹窗的商品
const pageEl = ref(null), gridEl = ref(null), selected = ref(null)
// 标记"正在切类型"，滚动事件里用来区分（见 changeKind）
let switchingKind = false
// SelectButton / Select 的选项数据
const kinds = [{ label: '闲置', value: 'idle' }, { label: '种草', value: 'recommend' }]
const sorts = [{ label: '默认顺序', value: 'default' }, { label: '价格从低到高', value: 'price' }]
// 搜索词跟着"闲置/种草"分开记：切类型不会把另一类的关键词冲掉。
// get：读时按当前类型取对应字段；set：写时也写进对应字段——computed 的 get/set 用法
const query = computed({ get: () => browseState.kind === 'idle' ? browseState.idleQuery : browseState.recommendQuery, set: value => { if (browseState.kind === 'idle') browseState.idleQuery = value; else browseState.recommendQuery = value } })
// 过滤链：类型 → 分类（种草不分分类）→ 关键词（标题和地点都搜）；
// 闲置且选了价格排序时再排。sort() 会原地改数组，但这里排的是 filter 出来的新数组，安全。
const visibleItems = computed(() => {
  // toLocaleLowerCase：大小写不敏感搜索
  const needle = query.value.trim().toLocaleLowerCase()
  const list = marketItems.filter(item => item.kind === browseState.kind && (item.kind === 'recommend' || browseState.category === '全部' || item.category === browseState.category) && (item.title + item.place).toLocaleLowerCase().includes(needle))
  // sort 的比较函数：a.price - b.price，负数排前 → 升序
  return browseState.kind === 'idle' && browseState.sort === 'price' ? list.sort((a, b) => a.price - b.price) : list
})
let observer, frame   // ResizeObserver 实例 / rAF 的 id
// 瀑布流核心：量出每张卡的实际高度，换算成"占几个 8px 格子"写回 gridRowEnd。
// 用 requestAnimationFrame 合并一帧内的多次触发（图片连续加载完成时会连着调）。
function measure() {
  cancelAnimationFrame(frame)   // 取消上一次排队中的计算
  frame = requestAnimationFrame(() => {
    if (!gridEl.value) return
    // rowGap：从计算样式里读出行间距（CSS 改了这里自动跟上）
    const gap = parseFloat(getComputedStyle(gridEl.value).rowGap)
    // querySelectorAll：找网格里所有卡片单元；forEach 逐个量高
    gridEl.value.querySelectorAll('.feed-cell').forEach(cell => {
      // firstElementChild：单元里的 MarketCard 根元素；?. 防空
      const height = cell.firstElementChild?.getBoundingClientRect().height ?? 0
      // span N：跨 N 个 8px 行——Math.ceil 向上取整保证装得下
      cell.style.gridRowEnd = 'span ' + Math.ceil((height + gap) / (8 + gap))
    })
  })
}
// 等 DOM 更新后，让 ResizeObserver 盯住所有新卡片（图片加载完高度变了会自动重排）。
async function observeCards() { await nextTick(); observer?.disconnect(); gridEl.value?.querySelectorAll('.market-card').forEach(el => observer?.observe(el)); measure() }
// 跳去地图页：带选中商品 id，或带上当前搜索词和分类，让地图页延续这里的筛选。
// router.push 的 query 参数会出现在 URL ?item=xxx 里
function openMap(item) { selected.value = null; router.push({ name: 'home-map', query: item ? { item: item.id } : { q: browseState.idleQuery, category: browseState.category } }) }
// 切换闲置/种草：先把当前类的滚动位置存起来（回来时还原），再换类型。
// switchingKind 标记"这次滚动事件是切类引起的"，避免把 0 错存进 browseState。
function changeKind(kind) {
  if (!kind || kind === browseState.kind) return
  if (pageEl.value) browseState.scroll[browseState.kind] = pageEl.value.scrollTop
  switchingKind = true
  browseState.kind = kind
}
// 页面滚动时存位置（切类引起的那次跳过）；event.target = 滚动的容器
function saveScroll(event) { if (!switchingKind) browseState.scroll[browseState.kind] = event.target.scrollTop }
async function restoreFeed() {
  await observeCards()
  // 等行高写回后恢复位置，避免瀑布流尚未撑开时 scrollTop 被截断。
  requestAnimationFrame(() => { if (pageEl.value) pageEl.value.scrollTop = browseState.scroll[browseState.kind]; switchingKind = false })
}
// 可见列表一变（搜索/筛选）就重新挂观察器重排
watch(visibleItems, observeCards)
onMounted(async () => { switchingKind = true; observer = new ResizeObserver(measure); await restoreFeed() })
onBeforeUnmount(() => { observer?.disconnect(); cancelAnimationFrame(frame) })   // 清理防泄漏
</script>
<template>
  <!-- 页面滚动容器：ref 交给脚本存滚动位置；@scroll 每次滚动上报 -->
  <main ref="pageEl" class="main-page" @scroll="saveScroll">
    <div class="feed-container">
      <header class="feed-heading"><div><p class="page-context">校园闲置与附近的好地方</p><h1>逛市集</h1></div><span class="campus-name"><MapPin :size="15" aria-hidden="true" />朝晖校区</span></header>
      <!-- 工具行：搜索框（label 包裹=点图标也能聚焦）+ 地图入口按钮 -->
      <div class="feed-toolbar"><label class="search-field"><Search :size="18" aria-hidden="true" /><InputText v-model="query" :aria-label="browseState.kind === 'idle' ? '搜索闲置' : '搜索种草'" :placeholder="browseState.kind === 'idle' ? '搜索想找的闲置' : '搜索附近值得去的地方'" /></label><Button v-if="browseState.kind === 'idle'" severity="secondary" outlined class="map-link" aria-label="地图找商品" @click="openMap()"><MapPin :size="16" aria-hidden="true" /><span>地图找商品</span></Button></div>
      <!-- 闲置/种草切换：SelectButton 是一组互斥按钮；:allowEmpty="false" 不允许全不选 -->
      <div class="content-switch"><SelectButton :modelValue="browseState.kind" :options="kinds" optionLabel="label" optionValue="value" :allowEmpty="false" aria-label="浏览闲置或种草" @update:modelValue="changeKind" /><span class="sample-note">示例内容 · 未接入真实数据</span></div>
      <!-- 闲置专属：分类按钮列 + 排序下拉；种草时换成提示文字 -->
      <div v-if="browseState.kind === 'idle'" class="feed-filters"><div class="category-list" aria-label="商品分类"><Button v-for="name in categories" :key="name" unstyled class="category-button" :class="{ active: browseState.category === name }" :aria-pressed="browseState.category === name" @click="browseState.category = name">{{ name }}</Button></div><Select v-model="browseState.sort" :options="sorts" optionLabel="label" optionValue="value" aria-label="商品排序" size="small" class="sort-select" /></div>
      <p v-else class="recommend-note">记录值得去的地方。种草不参与商品地图和交易筛选。</p>
      <!-- :key=browseState.kind：切类型时整个列表区做淡入淡出；
           @after-enter：进场动画结束后再恢复滚动位置（此时布局已稳定） -->
      <Transition name="feed-fade" mode="out-in" @after-enter="restoreFeed">
        <section :key="browseState.kind" :aria-label="browseState.kind === 'idle' ? '闲置商品' : '附近种草'">
          <!-- 瀑布流网格：每张卡包一层 .feed-cell，measure() 负责给 cell 写跨行数；
               @open：卡片点击事件 → 把商品存进 selected 打开详情 -->
          <div ref="gridEl" class="feed-grid"><article v-for="item in visibleItems" :key="item.id" class="feed-cell"><MarketCard :item="item" @open="selected = $event" /></article></div>
          <!-- 空状态：role="status" 让读屏播报"没有结果" -->
          <div v-if="!visibleItems.length" class="feed-empty" role="status"><SearchX :size="32" aria-hidden="true" /><h2>暂时没有匹配的内容</h2><p>换个关键词，或者清除当前筛选。</p><Button label="清除筛选" severity="secondary" @click="query = ''; browseState.category = '全部'" /></div>
        </section>
      </Transition>
      <footer class="feed-footer">{{ visibleItems.length }} 条示例内容 · 已全部展示</footer>
    </div>
    <!-- 详情弹窗：item 传 null 即关闭；@map：详情里点"在地图查看" → 跳地图页 -->
    <MarketDetail :item="selected" @close="selected = null" @map="openMap" />
  </main>
</template>
<style scoped>
.main-page{flex:1;min-height:0;min-width:0;overflow:auto;background:var(--app-bg);color:var(--app-text);font:14px/1.5 system-ui,sans-serif;scrollbar-gutter:stable}.feed-container{max-width:1320px;margin:0 auto;padding:28px clamp(16px,3vw,40px) 24px}.feed-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;gap:16px}.feed-heading h1{font-size:24px;font-weight:650;margin:4px 0 0;letter-spacing:-.5px}.page-context{margin:0;color:var(--app-muted);font-size:12px}.campus-name{display:flex;gap:5px;align-items:center;font-size:12px;color:var(--app-muted)}.feed-toolbar{display:flex;gap:12px;margin-bottom:24px}.search-field{position:relative;flex:1;min-width:0}.search-field>svg{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--app-muted);z-index:1;pointer-events:none}.search-field :deep(input){width:100%;padding-left:40px}.map-link{white-space:nowrap}.content-switch{display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:1px solid var(--app-border);gap:10px}.sample-note{font-size:11px;color:var(--app-muted)}.feed-filters{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:18px 0 22px}.category-list{display:flex;gap:22px;overflow-x:auto;min-width:0}.category-button{border:0;border-bottom:2px solid transparent;padding:6px 0;background:none;color:var(--app-muted);font:inherit;white-space:nowrap;cursor:pointer;transition:color .16s,border-color .16s}.category-button.active{color:var(--app-text);border-color:var(--app-text)}.category-button:focus-visible{outline:2px solid var(--app-text);outline-offset:2px}.sort-select{min-width:132px}.recommend-note{font-size:12px;color:var(--app-muted);margin:20px 0}.feed-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:8px;gap:20px;align-items:start}.feed-cell{min-width:0}.feed-empty{padding:64px 20px;display:flex;flex-direction:column;align-items:center;text-align:center;color:var(--app-muted);gap:12px}.feed-empty h2{font-size:17px;margin:0;color:var(--app-text)}.feed-empty p{margin:0 0 8px}.feed-footer{text-align:center;margin-top:36px;font-size:11px;color:var(--app-muted)}.feed-fade-enter-active,.feed-fade-leave-active{transition:opacity .16s ease,transform .16s ease}.feed-fade-enter-from{opacity:0;transform:translateY(5px)}.feed-fade-leave-to{opacity:0}@media(max-width:1200px){.feed-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:740px){.feed-container{padding:22px 16px}.feed-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.feed-heading{margin-bottom:18px}.feed-heading h1{font-size:22px}.map-link span{display:none}.feed-toolbar{margin-bottom:18px}.sample-note{font-size:10px}.feed-filters{flex-wrap:wrap;gap:10px}.category-list{flex:1;gap:18px}.sort-select{min-width:115px;max-width:140px}}@media(max-width:340px){.feed-grid{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.feed-fade-enter-active,.feed-fade-leave-active,.category-button{transition:none}.feed-fade-enter-from{transform:none}}
</style>
