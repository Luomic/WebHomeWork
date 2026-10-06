<script setup>
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
const mapEl = ref(null), listEl = ref(null)
const query = ref(route.query.item ? '' : typeof route.query.q === 'string' ? route.query.q : browseState.query)
const category = ref(route.query.item ? '全部' : categories.includes(route.query.category) ? route.query.category : browseState.category)
const selectedId = ref(typeof route.query.item === 'string' ? route.query.item : null)
const detail = ref(null), ready = ref(false), loading = ref(false), error = ref(''), locationNotice = ref('')
const userPosition = ref(null), locating = ref(false), radius = ref('all')
const areaDirty = ref(false), searchBounds = ref(null), groupIds = ref([])
const sheetState = ref('half')
const radiusOptions = [{ label: '不限距离', value: 'all' }, { label: '我附近 1 公里', value: '1000' }, { label: '我附近 3 公里', value: '3000' }]
let sdk, map, markers = [], userMarker, locationAbort
let generation = 0, locationSequence = 0, mapTimer
let disposed = false
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
const visibleItems = computed(() => groupIds.value.length ? matchingItems.value.filter(item => groupIds.value.includes(item.id)) : matchingItems.value)
const selected = computed(() => visibleItems.value.find(item => item.id === selectedId.value))
function distanceLabel(item) {
  if (!item.position) return '接口未提供坐标'
  const value = item.distance
  return value === null ? '定位后获取距离' : (value < 1000 ? Math.round(value) + ' m' : (value / 1000).toFixed(1) + ' km') + ' · 直线距离'
}
async function selectItem(item, pan = true) {
  selectedId.value = item.id
  if (sheetState.value === 'peek') sheetState.value = 'half'   // 抽屉露头时抬到半屏
  if (pan && map && ready.value && item.position) {
    map.panTo(item.position)
    if (window.matchMedia('(max-width: 760px)').matches) map.panBy(0, -(mapEl.value?.clientHeight ?? 0) * .18)
  }
  await nextTick()   // 等列表重新渲染
  const row = listEl.value?.querySelector('[data-id="' + item.id + '"]')
  if (row && listEl.value) listEl.value.scrollTop = Math.max(0, row.offsetTop - listEl.value.offsetTop - 8)
}
function renderMarkers() {
  if (!map || !ready.value) return
  map.remove(markers); markers = []   // 清掉旧标记重画
  const groups = []
  for (const item of matchingItems.value) {
    if (!item.position) continue
    const pixel = map.lngLatToContainer(item.position)
    const x = pixel.getX(), y = pixel.getY()
    const group = groups.find(g => Math.abs(g.x - x) < 60 && Math.abs(g.y - y) < 40)
    if (group) group.items.push(item)
    else groups.push({ x, y, items: [item] })
  }
  for (const group of groups) {
    const first = group.items[0]
    const content = document.createElement('button')
    content.type = 'button'; content.className = 'market-price-pin'
    content.classList.toggle('is-selected', group.items.some(item => item.id === selectedId.value))
    content.textContent = group.items.length > 1 ? group.items.length + ' 件' : priceLabel(first.price)
    content.setAttribute('aria-label', group.items.length > 1 ? '查看这个地点附近的 ' + group.items.length + ' 件商品' : '查看' + first.title)
    content.addEventListener('click', () => {
      if (group.items.length > 1) { groupIds.value = group.items.map(item => item.id); sheetState.value = 'full'; selectedId.value = null }
      else { groupIds.value = []; selectItem(first, false) }
    })
    markers.push(new sdk.Marker({ position: first.position, content, anchor: 'bottom-center', zIndex: group.items.some(item => item.id === selectedId.value) ? 150 : 100 }))
  }
  map.add(markers)   // 批量上标记
}
function searchArea() {
  if (!map) return
  const bounds = map.getBounds(), sw = bounds.getSouthWest(), ne = bounds.getNorthEast()
  searchBounds.value = [sw.getLng(), sw.getLat(), ne.getLng(), ne.getLat()]; groupIds.value = []; areaDirty.value = false
}
function resetFilters() { query.value = ''; category.value = '全部'; radius.value = 'all'; searchBounds.value = null; groupIds.value = []; areaDirty.value = false; if (ready.value) map.setZoomAndCenter(16, campus) }
function backToCampus() { searchBounds.value = null; groupIds.value = []; areaDirty.value = false; if (ready.value) map.setZoomAndCenter(16, campus) }
function toggleSheet() { sheetState.value = sheetState.value === 'peek' ? 'half' : sheetState.value === 'half' ? 'full' : 'peek' }
function cleanup() { ++generation; ++locationSequence; locationAbort?.abort(); locationAbort = null; clearTimeout(mapTimer); locating.value = false; map?.destroy(); map = null; markers = []; userMarker = null }
async function start() {
  cleanup(); const token = generation; loading.value = true; ready.value = false; error.value = ''
  await nextTick()
  try {
    sdk = await amapPlugins(['AMap.Geolocation', 'AMap.Scale', 'AMap.ToolBar'])
    if (disposed || token !== generation || !mapEl.value) return
    const initial = items.value.find(item => item.id === selectedId.value)
    map = new sdk.Map(mapEl.value, { center: initial?.position ?? campus, zoom: 16, zooms: [3, 20], mapStyle: mapStyle(isDark.value), resizeEnable: true, animateEnable: !window.matchMedia('(prefers-reduced-motion: reduce)').matches })
    map.addControl(new sdk.Scale({ position: 'LB' }))            // 左下角比例尺
    map.addControl(new sdk.ToolBar({ position: 'RT', offset: [16, 66] }))   // 右上角缩放工具条
    map.on('complete', () => { if (token !== generation || disposed || ready.value) return; clearTimeout(mapTimer); loading.value = false; ready.value = true; error.value = ''; renderMarkers(); if (initial) selectItem(initial) })
    map.on('zoomend', () => { if (ready.value) { renderMarkers(); areaDirty.value = true } })
    map.on('dragend', () => { if (ready.value) areaDirty.value = true })
    map.on('resize', renderMarkers)
    mapTimer = setTimeout(() => { if (token === generation && !ready.value) { loading.value = false; error.value = '底图加载超时，仍可浏览左侧商品列表。' } }, 15000)
  } catch (cause) { if (!disposed && token === generation) { loading.value = false; error.value = cause instanceof Error ? cause.message : '地图加载失败。' } }
}
async function locate() {
  if (!sdk || !map || locating.value) return
  const sequence = ++locationSequence, controller = new AbortController()
  locationAbort?.abort(); locationAbort = controller; locating.value = true
  try {
    const result = await locateAmap(sdk, controller.signal, message => { if (!disposed && sequence === locationSequence) locationNotice.value = message })
    if (disposed || sequence !== locationSequence) return
    userPosition.value = result.position
    userMarker?.setMap(null); userMarker = new sdk.Marker({ position: userPosition.value, title: '我的位置', zIndex: 200 }); map.add(userMarker)
    searchBounds.value = null; groupIds.value = []; map.panTo(userPosition.value)
    locationNotice.value = (result.accuracy ? `已取得位置，精度约 ${Math.round(result.accuracy)} 米。` : '已取得位置，请核对地图标记。') + '距离按直线计算，当前商品标记使用本地示例坐标。'
  } catch (cause) {
    if (!disposed && sequence === locationSequence) locationNotice.value = cause instanceof Error ? cause.message : '定位失败，你仍可按校区查看商品。'
  } finally { if (!disposed && sequence === locationSequence) { locating.value = false; locationAbort = null } }
}
watch([query, category], () => {
  browseState.query = query.value
  browseState.category = category.value
  browseState.first = 0
  browseState.scroll = 0
  groupIds.value = []
})
watch(matchingItems, () => { if (!matchingItems.value.some(item => item.id === selectedId.value)) selectedId.value = null; renderMarkers() })
watch(selectedId, renderMarkers)   // 选中变化也要重画（换选中样式/zIndex）
watch(isDark, dark => map?.setMapStyle(mapStyle(dark)))
async function loadGoods() {
  loadingGoods.value = true
  goodsError.value = ''
  try {
    const firstPage = await getRankedGoods(1)
    const goods = [...(firstPage.goods ?? [])]
    for (let page = 2; page <= firstPage.totalpage; page++) {
      const result = await getRankedGoods(page)
      goods.push(...(result.goods ?? []))
    }
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
  <section class="map-page" :style="{ '--sheet-offset': sheetState === 'peek' ? '78px' : sheetState === 'half' ? 'max(45%, 230px)' : 'calc(100% - 70px)' }">
    <aside class="map-panel" :class="'sheet-' + sheetState">
      <Button unstyled class="sheet-toggle" :aria-expanded="sheetState !== 'peek'" aria-controls="map-panel-content" :aria-label="sheetState === 'full' ? '收起商品列表' : '展开商品列表'" @click="toggleSheet"><span class="sheet-grip"></span><span>{{ visibleItems.length }} 件商品</span><component :is="sheetState === 'full' ? ChevronDown : ChevronUp" :size="18" aria-hidden="true" /></Button>
      <div id="map-panel-content" class="panel-content">
        <div class="panel-heading"><div><h1>附近商品</h1><p>来找找附近的好物吧！</p></div><MapPin :size="20" aria-hidden="true" /></div>
        <label class="map-search"><Search :size="17" aria-hidden="true" /><InputText v-model="query" aria-label="搜索附近商品" placeholder="搜索想找的商品" fluid /></label>
        <div class="map-filters"><Select v-model="category" :options="categories" aria-label="商品分类" size="small" /><Select v-model="radius" :options="radiusOptions" optionLabel="label" optionValue="value" aria-label="距离范围，需要先定位" size="small" :disabled="!userPosition" /></div>
        <div class="list-heading"><span>{{ visibleItems.length }} 件{{ groupIds.length ? '同组' : '' }}商品</span><Button v-if="groupIds.length || searchBounds" label="清除范围" text size="small" severity="secondary" @click="groupIds = []; searchBounds = null" /><small v-else>推荐</small></div>
        <div ref="listEl" class="item-list">
          <article v-for="item in visibleItems" :key="item.id" :data-id="item.id" class="result-item" :class="{ active: selectedId === item.id }">
            <Button unstyled class="result-button" :aria-pressed="selectedId === item.id" @click="selectItem(item)">
              <img v-if="item.image" :src="item.image" :alt="item.title" :style="{ objectPosition: item.imagePosition }" loading="lazy" decoding="async">
              <span v-else class="result-missing"><ImageOff :size="22" aria-hidden="true" /></span>
              <span class="result-copy"><strong>{{ item.title }}</strong><b>{{ priceLabel(item.price) }}</b><small>{{ item.place || '点击查看交易地点' }}</small><small>{{ distanceLabel(item) }}</small></span>
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
    <div class="map-stage"><div ref="mapEl" class="amap-box" aria-label="附近商品的高德地图"></div>
      <div v-if="loading || error" class="map-state" role="status"><MapPin :size="32" aria-hidden="true" /><h2>{{ loading ? '正在加载地图' : '地图暂不可用' }}</h2><p>{{ loading ? '商品列表可以先浏览。' : error }}</p><Button v-if="error" severity="secondary" @click="start"><RefreshCw :size="16" aria-hidden="true" />重试地图</Button></div>
      <div v-if="ready" class="map-actions"><Button severity="secondary" size="small" aria-label="回到朝晖校区" @click="backToCampus"><MapPin :size="16" aria-hidden="true" /><span>校区</span></Button><Button severity="secondary" size="small" :loading="locating" aria-label="定位我的位置" @click="locate"><LocateFixed :size="16" aria-hidden="true" /><span>定位</span></Button></div>
      <Transition name="map-control"><Button v-if="areaDirty && ready" class="area-search" severity="secondary" @click="searchArea"><Search :size="15" aria-hidden="true" />搜索此区域</Button></Transition>
      <Message v-if="locationNotice" class="location-message" severity="secondary" size="small" closable @close="locationNotice = ''">{{ locationNotice }}</Message>
    </div>
    <MarketDetail :item="detail" :showMap="false" @close="detail = null" />
  </section>
</template>
<style scoped>
.map-page{display:flex;flex:1;min-height:0;min-width:0;position:relative;overflow:hidden;background:var(--app-bg);color:var(--app-text);font:14px/1.5 system-ui,sans-serif}.map-panel{width:340px;flex:none;display:flex;flex-direction:column;min-height:0;background:var(--app-surface);border-right:1px solid var(--app-border);z-index:2}.panel-content{display:flex;flex-direction:column;flex:1;min-height:0;padding:24px 18px 12px}.panel-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.panel-heading h1{font-size:21px;font-weight:650;margin:0}.panel-heading p{font-size:11px;color:var(--app-muted);margin:5px 0 0}.panel-heading>svg{color:var(--app-muted)}.map-search{position:relative}.map-search>svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--app-muted);z-index:1}.map-search :deep(input){padding-left:36px}.map-filters{display:grid;grid-template-columns:1fr 1.3fr;gap:8px;margin:12px 0 6px}.map-filters :deep(.p-select){min-width:0}.list-heading{display:flex;align-items:center;justify-content:space-between;min-height:46px;font-size:12px}.list-heading small{font-size:10px;color:var(--app-muted)}.item-list{overflow:auto;min-height:0;flex:1;scrollbar-gutter:stable}.result-item{border-bottom:1px solid var(--app-border);border-radius:8px;transition:background .18s}.result-item.active{background:var(--app-hover)}.result-button{display:flex;gap:12px;width:100%;text-align:left;padding:14px 8px;background:none;border:0;color:var(--app-text);font:inherit;cursor:pointer}.result-button:focus-visible{outline:2px solid var(--app-text);outline-offset:-2px;border-radius:8px}.result-button>img,.result-missing{width:72px;height:84px;flex:none;border:1px solid var(--app-border);border-radius:8px;object-fit:cover;background:var(--app-hover)}.result-missing{display:grid;place-items:center;color:var(--app-muted)}.result-copy{min-width:0}.result-copy strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:13px;line-height:1.5;font-weight:500}.result-copy b{display:block;font-size:18px;font-variant-numeric:tabular-nums;margin:5px 0}.result-copy small{display:block;font-size:10px;color:var(--app-muted);margin-top:2px}.result-actions{display:flex;justify-content:space-between;gap:8px;padding:0 8px 12px}.data-note{font-size:10px;line-height:1.7;color:var(--app-muted);margin:10px 0 0}.map-list-empty{padding:30px 8px;display:flex;flex-direction:column;align-items:center;color:var(--app-muted);font-size:12px}.map-stage{position:relative;flex:1;min-width:0;overflow:hidden;background:var(--app-map-bg)}.amap-box{position:absolute;inset:0}.map-state{position:absolute;inset:0;background:var(--app-surface);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:28px;color:var(--app-muted)}.map-state h2{font-size:18px;margin:14px 0 6px;color:var(--app-text);font-weight:500}.map-state p{font-size:12px;max-width:320px;margin:0 0 20px}.map-actions{position:absolute;top:16px;right:16px;display:flex;gap:8px}.area-search{position:absolute;top:16px;left:16px}.location-message{position:absolute;top:68px;left:16px;right:70px;max-width:440px;z-index:1}.map-sample-label{position:absolute;right:12px;bottom:10px;padding:4px 7px;background:var(--app-field);color:var(--app-muted);font-size:10px;border-radius:4px;border:1px solid var(--app-border);pointer-events:none}.sheet-toggle{display:none}.map-control-enter-active,.map-control-leave-active,.result-reveal-enter-active,.result-reveal-leave-active{transition:opacity .16s ease,transform .16s ease}.map-control-enter-from,.map-control-leave-to,.result-reveal-enter-from,.result-reveal-leave-to{opacity:0;transform:translateY(4px)}@media(max-width:1000px){.map-panel{width:300px}.panel-content{padding:20px 14px 12px}.result-button>img,.result-missing{width:62px;height:76px}}@media(max-width:760px){.map-stage{position:absolute;inset:0}.map-panel{position:absolute;bottom:0;left:0;right:0;width:100%;border:1px solid var(--app-border);border-bottom:0;border-radius:18px 18px 0 0;transition:height .22s ease;box-shadow:0 -4px 20px var(--app-shadow);overflow:hidden}.map-panel.sheet-peek{height:78px}.map-panel.sheet-half{height:45%;min-height:230px}.map-panel.sheet-full{height:calc(100% - 70px)}.sheet-toggle{display:flex;align-items:center;justify-content:space-between;position:relative;flex:none;width:100%;height:50px;padding:18px 18px 6px;background:none;color:var(--app-text);border:0;font:inherit;font-size:12px;cursor:pointer;touch-action:pan-x}.sheet-grip{position:absolute;top:7px;left:calc(50% - 18px);width:36px;height:3px;background:var(--app-border);border-radius:2px}.sheet-peek .panel-content{visibility:hidden}.panel-content{padding:6px 16px 12px}.panel-heading{display:none}.map-filters{margin-top:8px}.map-actions{top:12px;right:12px}.area-search{top:62px;left:12px;font-size:12px}.location-message{top:108px;left:12px;right:12px;font-size:11px}.map-state{justify-content:flex-start;padding-top:50px}.map-sample-label{top:15px;left:12px;right:auto;bottom:auto;font-size:9px;max-width:42%}.data-note{display:none}.result-button>img,.result-missing{width:64px;height:72px}.map-stage :deep(.amap-logo){bottom:82px!important}.map-stage :deep(.amap-copyright){bottom:78px!important}.map-stage :deep(.amap-scalecontrol){bottom:110px!important}}@media(prefers-reduced-motion:reduce){.map-panel,.result-item,.map-control-enter-active,.map-control-leave-active,.result-reveal-enter-active,.result-reveal-leave-active{transition:none}.map-control-enter-from,.map-control-leave-to,.result-reveal-enter-from,.result-reveal-leave-to{transform:none}}
</style>

<style scoped>
@media(max-width:760px){
  .map-stage :deep(.amap-logo){bottom:calc(var(--sheet-offset) + 6px)!important}
  .map-stage :deep(.amap-copyright){bottom:calc(var(--sheet-offset) + 2px)!important}
  .map-stage :deep(.amap-scalecontrol){bottom:calc(var(--sheet-offset) + 32px)!important}
}
</style>
