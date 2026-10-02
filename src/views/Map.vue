<script setup>
/*
 * 附近商品地图页（/home/map，可从市集页"地图找商品"带搜索词跳过来）。
 *
 * 布局：左侧商品列表面板 + 右侧高德地图。手机端（≤760px）列表变成底部抽屉，
 * sheetState 控制 peek（露个头）/ half（半屏）/ full（全屏）三档。
 *
 * 地图交互：
 *   - 商品标记按"屏幕坐标聚类"：相邻太近的标记合并成一个"N 件"气泡，
 *     点击展开同组商品，避免同一交接点的商品互相压住；
 *   - 拖动/缩放后出现"搜索此区域"按钮，用当前视野矩形过滤列表；
 *   - "定位"按钮走 locateAmap（浏览器定位，详见 composables/amap.ts），
 *     拿到位置后按直线距离排序商品。
 *
 * 竞态：generation 标记"地图实例的生命周期"（start 重开时 +1），
 * locationSequence 标记"第几次点定位"，迟到的旧回调靠比对它们丢弃。
 */
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
// useRoute：读当前路由信息（query 参数等）
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Message from 'primevue/message'
import { Search, MapPin, LocateFixed, RefreshCw, ChevronUp, ChevronDown, ImageOff, ListFilter, X } from 'lucide-vue-next'
import MarketDetail from '@/components/MarketDetail.vue'
import { toMarketItem, categories, campus, browseState, distanceMeters, priceLabel } from '@/data/market'
import { getRankedGoods, resolveAssetUrl } from '@/api/client'
import { amapPlugins, mapStyle, locateAmap } from '@/composables/amap'
const route = useRoute()
const items = ref([])
const loadingGoods = ref(false)
const goodsError = ref('')
const isDark = inject('isDark', ref(false))
// mapEl=地图容器；listEl=商品列表滚动容器
const mapEl = ref(null), listEl = ref(null)
// 初始搜索词：从地图入口带着 item 来 → 置空；带着 q 来 → 用它；否则用市集页存下的
const query = ref(route.query.item ? '' : typeof route.query.q === 'string' ? route.query.q : browseState.query)
// 初始分类：同理（route.query.category 是 URL ?category=xxx 传来的）
const category = ref(route.query.item ? '全部' : categories.includes(route.query.category) ? route.query.category : browseState.category)
// URL 带了具体商品 id 就预选中它
const selectedId = ref(typeof route.query.item === 'string' ? route.query.item : null)
// detail=详情弹窗商品；ready=地图就绪；loading/error=加载状态；locationNotice=定位提示条
const detail = ref(null), ready = ref(false), loading = ref(false), error = ref(''), locationNotice = ref('')
const failedImages = ref(new Set())
// userPosition=我的坐标；locating=定位中；radius=距离筛选值
const userPosition = ref(null), locating = ref(false), radius = ref('all')
// areaDirty=视野变了提示"搜索此区域"；searchBounds=当前视野矩形；groupIds=聚合组内商品 id
const areaDirty = ref(false), searchBounds = ref(null), groupIds = ref([])
// 手机端底部抽屉：peek 露个头 / half 半屏 / full 全屏
const sheetState = ref('half')
const radiusOptions = [{ label: '不限距离', value: 'all' }, { label: '我附近 1 公里', value: '1000' }, { label: '我附近 3 公里', value: '3000' }]
// SDK 实例们（非响应式，普通 let 即可）；markers=商品标记数组；userMarker=我的位置标记
let sdk, map, markers = [], userMarker, locationAbort
// 两把竞态号（见文件头注释）+ 底图超时计时器
let generation = 0, locationSequence = 0, mapTimer
let disposed = false
// 列表的完整过滤链：分类 → 关键词 → 距离（需先定位）→ 视野范围（需点过"搜索此区域"），
// 最后有定位时按距离从近到远排。距离算的是直线，不是步行路线。
const matchingItems = computed(() => items.value.map(item => ({
  ...item,
  distance: userPosition.value && item.position ? distanceMeters(userPosition.value, item.position) : null,
}))
  .filter(item => {
    const needle = query.value.trim().toLocaleLowerCase()
    const matchesQuery = [item.title, item.description, item.category].join(' ').toLocaleLowerCase().includes(needle)
    const matchesRadius = radius.value === 'all' || (item.distance !== null && item.distance <= Number(radius.value))
    const bounds = searchBounds.value
    const matchesBounds = !bounds || (item.position && item.position[0] >= bounds[0] && item.position[0] <= bounds[2] && item.position[1] >= bounds[1] && item.position[1] <= bounds[3])
    return (category.value === '全部' || item.category === category.value) && matchesQuery && matchesRadius && matchesBounds
  })
  .sort((a, b) => userPosition.value ? (a.distance ?? Infinity) - (b.distance ?? Infinity) : 0))
// 顶部列表显示哪批商品：点开某个聚合气泡后只显示该组的，否则显示全部匹配项。
const visibleItems = computed(() => groupIds.value.length ? matchingItems.value.filter(item => groupIds.value.includes(item.id)) : matchingItems.value)
// 当前选中的商品对象（按 id 从可见列表找）
const selected = computed(() => visibleItems.value.find(item => item.id === selectedId.value))
// 距离文案：null=没定位过；米<1000 显示 m，否则显示 km（toFixed(1) 保留 1 位小数）
function distanceLabel(item) {
  if (!item.position) return '接口未提供坐标'
  const value = item.distance
  return value === null ? '示例交接点' : (value < 1000 ? Math.round(value) + ' m' : (value / 1000).toFixed(1) + ' km') + ' · 直线距离'
}
// 选中某个商品：地图平移过去 + 列表滚到对应行
async function selectItem(item, pan = true) {
  selectedId.value = item.id
  if (sheetState.value === 'peek') sheetState.value = 'half'   // 抽屉露头时抬到半屏
  if (pan && map && ready.value && item.position) {
    map.panTo(item.position)
    // 手机底部列表会覆盖地图下部，把选中点留在面板上方。
    if (window.matchMedia('(max-width: 760px)').matches) map.panBy(0, -(mapEl.value?.clientHeight ?? 0) * .18)
  }
  await nextTick()   // 等列表重新渲染
  // querySelector 用属性选择器找 data-id 对应的行；scrollTop 把它滚进视野
  const row = listEl.value?.querySelector('[data-id="' + item.id + '"]')
  if (row && listEl.value) listEl.value.scrollTop = Math.max(0, row.offsetTop - listEl.value.offsetTop - 8)
}
function renderMarkers() {
  if (!map || !ready.value) return
  map.remove(markers); markers = []   // 清掉旧标记重画
  // 相邻屏幕坐标合并为一组；同一交接点多件商品不会互相覆盖。
  // 注意聚的是"屏幕像素"距离（lngLatToContainer），所以缩放级别变化要重算（zoomend 里调了这里）。
  const groups = []
  for (const item of matchingItems.value) {
    // 商品接口没有坐标字段；只有明确附带本地示例坐标的项目才绘制标记。
    if (!item.position) continue
    // 经纬度 → 容器像素坐标
    const pixel = map.lngLatToContainer(item.position)
    const x = pixel.getX(), y = pixel.getY()
    // 找 60×40 像素内已有的组；找到就并入，否则新开一组
    const group = groups.find(g => Math.abs(g.x - x) < 60 && Math.abs(g.y - y) < 40)
    if (group) group.items.push(item)
    else groups.push({ x, y, items: [item] })
  }
  for (const group of groups) {
    const first = group.items[0]
    // 自定义标记内容：直接造一个 <button> 元素给 Marker（样式见全局 .market-price-pin）
    const content = document.createElement('button')
    content.type = 'button'; content.className = 'market-price-pin'
    content.classList.toggle('is-selected', group.items.some(item => item.id === selectedId.value))
    // 多件 → 显示"N 件"；单件 → 显示价格
    content.textContent = group.items.length > 1 ? group.items.length + ' 件' : priceLabel(first.price)
    content.setAttribute('aria-label', group.items.length > 1 ? '查看这个地点附近的 ' + group.items.length + ' 件商品' : '查看' + first.title)
    content.addEventListener('click', () => {
      if (group.items.length > 1) { groupIds.value = group.items.map(item => item.id); sheetState.value = 'full'; selectedId.value = null }
      else { groupIds.value = []; selectItem(first, false) }
    })
    // zIndex：选中的标记叠在最上面
    markers.push(new sdk.Marker({ position: first.position, content, anchor: 'bottom-center', zIndex: group.items.some(item => item.id === selectedId.value) ? 150 : 100 }))
  }
  map.add(markers)   // 批量上标记
}
// 记录当前视野的经纬度矩形，交给 matchingItems 的过滤链。
function searchArea() {
  if (!map) return
  // getBounds：视野的西南角/东北角 → [西经, 南纬, 东经, 北纬]
  const bounds = map.getBounds(), sw = bounds.getSouthWest(), ne = bounds.getNorthEast()
  searchBounds.value = [sw.getLng(), sw.getLat(), ne.getLng(), ne.getLat()]; groupIds.value = []; areaDirty.value = false
}
// 重置全部筛选并回校区
function resetFilters() { query.value = ''; category.value = '全部'; radius.value = 'all'; searchBounds.value = null; groupIds.value = []; areaDirty.value = false; if (ready.value) map.setZoomAndCenter(16, campus) }
function backToCampus() { searchBounds.value = null; groupIds.value = []; areaDirty.value = false; if (ready.value) map.setZoomAndCenter(16, campus) }
// 抽屉三档循环切换：peek → half → full → peek
function toggleSheet() { sheetState.value = sheetState.value === 'peek' ? 'half' : sheetState.value === 'half' ? 'full' : 'peek' }
// 离开页面 / 重开地图时的总清理：作废回调、中止定位、销毁地图实例。
function cleanup() { ++generation; ++locationSequence; locationAbort?.abort(); locationAbort = null; clearTimeout(mapTimer); locating.value = false; map?.destroy(); map = null; markers = []; userMarker = null }
// 初始化地图。底图加载完成（complete 事件）前 loading 一直开着，15 秒还没好
// 就降级：不再挡着页面，列表照常能看。
async function start() {
  cleanup(); const token = generation; loading.value = true; ready.value = false; error.value = ''
  await nextTick()
  try {
    sdk = await amapPlugins(['AMap.Geolocation', 'AMap.Scale', 'AMap.ToolBar'])
    if (disposed || token !== generation || !mapEl.value) return
    // 如果是带 item id 进来的，初始视野直接对准它
    const initial = items.value.find(item => item.id === selectedId.value)
    map = new sdk.Map(mapEl.value, { center: initial?.position ?? campus, zoom: 16, zooms: [3, 20], mapStyle: mapStyle(isDark.value), resizeEnable: true, animateEnable: !window.matchMedia('(prefers-reduced-motion: reduce)').matches })
    map.addControl(new sdk.Scale({ position: 'LB' }))            // 左下角比例尺
    map.addControl(new sdk.ToolBar({ position: 'RT', offset: [16, 66] }))   // 右上角缩放工具条
    // complete：底图瓦片全部就绪 → 解除 loading、画标记、滚动到初始商品
    map.on('complete', () => { if (token !== generation || disposed || ready.value) return; clearTimeout(mapTimer); loading.value = false; ready.value = true; error.value = ''; renderMarkers(); if (initial) selectItem(initial) })
    // 缩放结束：像素聚类要重算 + 显示"搜索此区域"提示
    map.on('zoomend', () => { if (ready.value) { renderMarkers(); areaDirty.value = true } })
    // 拖动结束：视野变了
    map.on('dragend', () => { if (ready.value) areaDirty.value = true })
    map.on('resize', renderMarkers)
    mapTimer = setTimeout(() => { if (token === generation && !ready.value) { loading.value = false; error.value = '底图加载超时，仍可浏览左侧商品列表。' } }, 15000)
  } catch (cause) { if (!disposed && token === generation) { loading.value = false; error.value = cause instanceof Error ? cause.message : '地图加载失败。' } }
}
// 定位按钮：拿到坐标后放一个"我的位置"标记并平移过去；
// locationSequence 保证用户连点时只有最后一次的结果生效。
async function locate() {
  if (!sdk || !map || locating.value) return
  const sequence = ++locationSequence, controller = new AbortController()
  locationAbort?.abort(); locationAbort = controller; locating.value = true
  try {
    const result = await locateAmap(sdk, controller.signal, message => { if (!disposed && sequence === locationSequence) locationNotice.value = message })
    if (disposed || sequence !== locationSequence) return
    userPosition.value = result.position
    // 换"我的位置"标记：先摘旧再立新；zIndex 200 压过商品标记
    userMarker?.setMap(null); userMarker = new sdk.Marker({ position: userPosition.value, title: '我的位置', zIndex: 200 }); map.add(userMarker)
    searchBounds.value = null; groupIds.value = []; map.panTo(userPosition.value)
    locationNotice.value = (result.accuracy ? `已取得位置，精度约 ${Math.round(result.accuracy)} 米。` : '已取得位置，请核对地图标记。') + '距离按直线计算，当前商品标记使用本地示例坐标。'
  } catch (cause) {
    if (!disposed && sequence === locationSequence) locationNotice.value = cause instanceof Error ? cause.message : '定位失败，你仍可按校区查看商品。'
  } finally { if (!disposed && sequence === locationSequence) { locating.value = false; locationAbort = null } }
}
// 搜索词/分类变化：同步回全局浏览状态（回市集页还记得）+ 清聚合组
watch([query, category], () => {
  browseState.query = query.value
  browseState.category = category.value
  browseState.first = 0
  browseState.scroll = 0
  groupIds.value = []
})
// 匹配结果变了：若选中的被过滤掉了就取消选中，并重画标记
watch(matchingItems, () => { if (!matchingItems.value.some(item => item.id === selectedId.value)) selectedId.value = null; renderMarkers() })
watch(selectedId, renderMarkers)   // 选中变化也要重画（换选中样式/zIndex）
watch(isDark, dark => map?.setMapStyle(mapStyle(dark)))
async function loadGoods() {
  loadingGoods.value = true
  goodsError.value = ''
  try {
    const goods = await getRankedGoods()
    items.value = goods.map(item => toMarketItem({
      ...item,
      images: Array.isArray(item.images) ? item.images.map(resolveAssetUrl) : [],
    }))
    renderMarkers()
  } catch (error) {
    goodsError.value = error instanceof Error ? error.message : '商品列表加载失败。'
  } finally {
    loadingGoods.value = false
  }
}
const onGoodsUpdated = () => { void loadGoods() }
onMounted(() => {
  window.addEventListener('market:goods-updated', onGoodsUpdated)
  void loadGoods()
  void start()
})
onBeforeUnmount(() => { disposed = true; window.removeEventListener('market:goods-updated', onGoodsUpdated); cleanup() })
</script>
<template>
  <!-- :style 挂 CSS 变量 --sheet-offset：抽屉三档对应不同的偏移量，
       下方的版权/比例尺位置和列表抽屉都引用它 -->
  <section class="map-page" :style="{ '--sheet-offset': sheetState === 'peek' ? '78px' : sheetState === 'half' ? 'max(45%, 230px)' : 'calc(100% - 70px)' }">
    <!-- 商品列表面板（手机端变底部抽屉）：动态类 sheet-peek/half/full 控制位置 -->
    <aside class="map-panel" :class="'sheet-' + sheetState">
      <!-- 抽屉把手按钮：aria-expanded 告诉读屏当前展开状态 -->
      <Button unstyled class="sheet-toggle" :aria-expanded="sheetState !== 'peek'" aria-controls="map-panel-content" :aria-label="sheetState === 'full' ? '收起商品列表' : '展开商品列表'" @click="toggleSheet"><span class="sheet-grip"></span><span>{{ visibleItems.length }} 件商品</span><component :is="sheetState === 'full' ? ChevronDown : ChevronUp" :size="18" aria-hidden="true" /></Button>
      <div id="map-panel-content" class="panel-content">
        <div class="panel-heading"><div><h1>附近商品</h1><p>服务端商品 · 位置以接口字段为准</p></div><MapPin :size="20" aria-hidden="true" /></div>
        <label class="map-search"><Search :size="17" aria-hidden="true" /><InputText v-model="query" aria-label="搜索附近商品" placeholder="搜索想找的商品" fluid /></label>
        <!-- 分类下拉 + 距离下拉（没定位过时禁用） -->
        <div class="map-filters"><Select v-model="category" :options="categories" aria-label="商品分类" size="small" /><Select v-model="radius" :options="radiusOptions" optionLabel="label" optionValue="value" aria-label="距离范围，需要先定位" size="small" :disabled="!userPosition" /></div>
        <div class="list-heading"><span>{{ visibleItems.length }} 件{{ groupIds.length ? '同组' : '' }}商品</span><Button v-if="groupIds.length || searchBounds" label="清除范围" text size="small" severity="secondary" @click="groupIds = []; searchBounds = null" /><small v-else>服务端推荐</small></div>
        <!-- 商品列表：data-id 是自定义属性（data-* 合法），脚本用它定位行 -->
        <div ref="listEl" class="item-list">
          <article v-for="item in visibleItems" :key="item.id" :data-id="item.id" class="result-item" :class="{ active: selectedId === item.id }">
            <Button unstyled class="result-button" :aria-pressed="selectedId === item.id" @click="selectItem(item)">
              <img v-if="item.image && !failedImages.has(item.id)" :src="item.image" :alt="item.title" :style="{ objectPosition: item.imagePosition }" loading="lazy" decoding="async" @error="failedImages.add(item.id)">
              <span v-else class="result-missing"><ImageOff :size="22" aria-hidden="true" /></span>
              <span class="result-copy"><strong>{{ item.title }}</strong><b>{{ priceLabel(item.price) }}</b><small>{{ item.place || '未提供交易地点' }}</small><small>{{ distanceLabel(item) }}</small></span>
            </Button>
            <Transition name="result-reveal"><div v-if="selectedId === item.id" class="result-actions"><Button label="查看商品详情" size="small" severity="secondary" @click="detail = item" /><Button text severity="secondary" size="small" aria-label="取消选中" @click="selectedId = null"><X :size="15" aria-hidden="true" /></Button></div></Transition>
          </article>
          <div v-if="!visibleItems.length" class="map-list-empty" role="status"><ListFilter :size="26" aria-hidden="true" /><p>这个范围没有匹配商品</p><Button label="重置筛选" severity="secondary" size="small" @click="resetFilters" /></div>
        </div>
        <p v-if="loadingGoods" class="data-note">正在加载服务端商品…</p>
        <p v-else-if="goodsError" class="data-note">{{ goodsError }} <Button text size="small" label="重试" @click="loadGoods" /></p>
        <p v-else class="data-note">商品接口暂未定义坐标字段，只有带有位置展示数据的商品会显示地图标记。</p>
      </div>
    </aside>
    <!-- 地图区 -->
    <div class="map-stage"><div ref="mapEl" class="amap-box" aria-label="附近商品的高德地图"></div>
      <!-- 加载中/失败覆盖层 -->
      <div v-if="loading || error" class="map-state" role="status"><MapPin :size="32" aria-hidden="true" /><h2>{{ loading ? '正在加载地图' : '地图暂不可用' }}</h2><p>{{ loading ? '商品列表可以先浏览。' : error }}</p><Button v-if="error" severity="secondary" @click="start"><RefreshCw :size="16" aria-hidden="true" />重试地图</Button></div>
      <!-- 左下角快捷按钮组：回校区 / 定位 -->
      <div v-if="ready" class="map-actions"><Button severity="secondary" size="small" aria-label="回到朝晖校区" @click="backToCampus"><MapPin :size="16" aria-hidden="true" /><span>校区</span></Button><Button severity="secondary" size="small" :loading="locating" aria-label="定位我的位置" @click="locate"><LocateFixed :size="16" aria-hidden="true" /><span>定位</span></Button></div>
      <!-- 拖动/缩放后才出现的"搜索此区域"按钮（Transition 淡入淡出） -->
      <Transition name="map-control"><Button v-if="areaDirty && ready" class="area-search" severity="secondary" @click="searchArea"><Search :size="15" aria-hidden="true" />搜索此区域</Button></Transition>
      <!-- closable：带关闭按钮；@close 关掉提示条 -->
      <Message v-if="locationNotice" class="location-message" severity="secondary" size="small" closable @close="locationNotice = ''">{{ locationNotice }}</Message>
    </div>
    <!-- 详情弹窗：showMap=false——已经在地图页了，不需要"在地图查看"按钮 -->
    <MarketDetail :item="detail" :showMap="false" @close="detail = null" />
  </section>
</template>
<style scoped>
.map-page{display:flex;flex:1;min-height:0;min-width:0;position:relative;overflow:hidden;background:var(--app-bg);color:var(--app-text);font:14px/1.5 system-ui,sans-serif}.map-panel{width:340px;flex:none;display:flex;flex-direction:column;min-height:0;background:var(--app-surface);border-right:1px solid var(--app-border);z-index:2}.panel-content{display:flex;flex-direction:column;flex:1;min-height:0;padding:24px 18px 12px}.panel-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.panel-heading h1{font-size:21px;font-weight:650;margin:0}.panel-heading p{font-size:11px;color:var(--app-muted);margin:5px 0 0}.panel-heading>svg{color:var(--app-muted)}.map-search{position:relative}.map-search>svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--app-muted);z-index:1}.map-search :deep(input){padding-left:36px}.map-filters{display:grid;grid-template-columns:1fr 1.3fr;gap:8px;margin:12px 0 6px}.map-filters :deep(.p-select){min-width:0}.list-heading{display:flex;align-items:center;justify-content:space-between;min-height:46px;font-size:12px}.list-heading small{font-size:10px;color:var(--app-muted)}.item-list{overflow:auto;min-height:0;flex:1;scrollbar-gutter:stable}.result-item{border-bottom:1px solid var(--app-border);border-radius:8px;transition:background .18s}.result-item.active{background:var(--app-hover)}.result-button{display:flex;gap:12px;width:100%;text-align:left;padding:14px 8px;background:none;border:0;color:var(--app-text);font:inherit;cursor:pointer}.result-button:focus-visible{outline:2px solid var(--app-text);outline-offset:-2px;border-radius:8px}.result-button>img,.result-missing{width:72px;height:84px;flex:none;border:1px solid var(--app-border);border-radius:8px;object-fit:cover;background:var(--app-hover)}.result-missing{display:grid;place-items:center;color:var(--app-muted)}.result-copy{min-width:0}.result-copy strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:13px;line-height:1.5;font-weight:500}.result-copy b{display:block;font-size:18px;font-variant-numeric:tabular-nums;margin:5px 0}.result-copy small{display:block;font-size:10px;color:var(--app-muted);margin-top:2px}.result-actions{display:flex;justify-content:space-between;gap:8px;padding:0 8px 12px}.data-note{font-size:10px;line-height:1.7;color:var(--app-muted);margin:10px 0 0}.map-list-empty{padding:30px 8px;display:flex;flex-direction:column;align-items:center;color:var(--app-muted);font-size:12px}.map-stage{position:relative;flex:1;min-width:0;overflow:hidden;background:var(--app-map-bg)}.amap-box{position:absolute;inset:0}.map-state{position:absolute;inset:0;background:var(--app-surface);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:28px;color:var(--app-muted)}.map-state h2{font-size:18px;margin:14px 0 6px;color:var(--app-text);font-weight:500}.map-state p{font-size:12px;max-width:320px;margin:0 0 20px}.map-actions{position:absolute;top:16px;right:16px;display:flex;gap:8px}.area-search{position:absolute;top:16px;left:16px}.location-message{position:absolute;top:68px;left:16px;right:70px;max-width:440px;z-index:1}.map-sample-label{position:absolute;right:12px;bottom:10px;padding:4px 7px;background:var(--app-field);color:var(--app-muted);font-size:10px;border-radius:4px;border:1px solid var(--app-border);pointer-events:none}.sheet-toggle{display:none}.map-control-enter-active,.map-control-leave-active,.result-reveal-enter-active,.result-reveal-leave-active{transition:opacity .16s ease,transform .16s ease}.map-control-enter-from,.map-control-leave-to,.result-reveal-enter-from,.result-reveal-leave-to{opacity:0;transform:translateY(4px)}@media(max-width:1000px){.map-panel{width:300px}.panel-content{padding:20px 14px 12px}.result-button>img,.result-missing{width:62px;height:76px}}@media(max-width:760px){.map-stage{position:absolute;inset:0}.map-panel{position:absolute;bottom:0;left:0;right:0;width:100%;border:1px solid var(--app-border);border-bottom:0;border-radius:18px 18px 0 0;transition:height .22s ease;box-shadow:0 -4px 20px var(--app-shadow);overflow:hidden}.map-panel.sheet-peek{height:78px}.map-panel.sheet-half{height:45%;min-height:230px}.map-panel.sheet-full{height:calc(100% - 70px)}.sheet-toggle{display:flex;align-items:center;justify-content:space-between;position:relative;flex:none;width:100%;height:50px;padding:18px 18px 6px;background:none;color:var(--app-text);border:0;font:inherit;font-size:12px;cursor:pointer;touch-action:pan-x}.sheet-grip{position:absolute;top:7px;left:calc(50% - 18px);width:36px;height:3px;background:var(--app-border);border-radius:2px}.sheet-peek .panel-content{visibility:hidden}.panel-content{padding:6px 16px 12px}.panel-heading{display:none}.map-filters{margin-top:8px}.map-actions{top:12px;right:12px}.area-search{top:62px;left:12px;font-size:12px}.location-message{top:108px;left:12px;right:12px;font-size:11px}.map-state{justify-content:flex-start;padding-top:50px}.map-sample-label{top:15px;left:12px;right:auto;bottom:auto;font-size:9px;max-width:42%}.data-note{display:none}.result-button>img,.result-missing{width:64px;height:72px}.map-stage :deep(.amap-logo){bottom:82px!important}.map-stage :deep(.amap-copyright){bottom:78px!important}.map-stage :deep(.amap-scalecontrol){bottom:110px!important}}@media(prefers-reduced-motion:reduce){.map-panel,.result-item,.map-control-enter-active,.map-control-leave-active,.result-reveal-enter-active,.result-reveal-leave-active{transition:none}.map-control-enter-from,.map-control-leave-to,.result-reveal-enter-from,.result-reveal-leave-to{transform:none}}
</style>

<style scoped>
/* 地图版权与比例尺跟随结果面板上沿，不能被底部列表遮住。 */
@media(max-width:760px){
  .map-stage :deep(.amap-logo){bottom:calc(var(--sheet-offset) + 6px)!important}
  .map-stage :deep(.amap-copyright){bottom:calc(var(--sheet-offset) + 2px)!important}
  .map-stage :deep(.amap-scalecontrol){bottom:calc(var(--sheet-offset) + 32px)!important}
}
</style>
