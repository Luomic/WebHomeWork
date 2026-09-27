<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const key = import.meta.env.VITE_AMAP_KEY ?? ''
const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_CODE ?? ''
const campus = [120.165741, 30.293231]
// 示例坐标固定在校区附近，不随用户定位移动，避免把示例误认为真实附近商品。
const items = [
  { id: 1, title: '九成新台灯', price: 25, category: '生活', place: '图书馆附近', position: [120.1672, 30.2941], x: 57, y: 33, description: '宿舍桌面的小伙伴，支持冷暖光调节。' },
  { id: 2, title: '考研英语词典', price: 12, category: '书籍', place: '教学楼附近', position: [120.1638, 30.2917], x: 30, y: 54, description: '少量铅笔笔记，希望交给下一个需要它的人。' },
  { id: 3, title: '蓝牙键盘', price: 60, category: '数码', place: '东侧校门附近', position: [120.169, 30.2918], x: 73, y: 59, description: '轻巧便携，适合自习时搭配平板使用。' },
]
const mapEl = ref(null)
const ready = ref(false)
const query = ref('')
const category = ref('全部')
const selectedId = ref(null)
const userPosition = ref(null)
const locating = ref(false)
const radius = ref('all')
const notice = ref(key ? '正在加载高德地图……' : '未配置高德 Key，当前为校区示意图。')
const locationNotice = ref('点击“我的位置”后，将请求设备定位权限。')
let map, geolocation, userMarker, accuracyCircle, scriptEl, loadTimer, locationTimer, mapTimer
let disposed = false
let markers = []
let locateSequence = 0

function distance(position) {
  if (!userPosition.value) return null
  const radians = value => value * Math.PI / 180
  const [lng, lat] = userPosition.value
  const a = Math.sin(radians(position[1] - lat) / 2) ** 2 + Math.cos(radians(lat)) * Math.cos(radians(position[1])) * Math.sin(radians(position[0] - lng) / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)))
}
const visibleItems = computed(() => items.map(item => ({ ...item, distance: distance(item.position) }))
  .filter(item => (category.value === '全部' || item.category === category.value)
    && `${item.title}${item.place}`.includes(query.value.trim())
    && (radius.value === 'all' || item.distance === null || item.distance <= Number(radius.value)))
  .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)))
const selected = computed(() => visibleItems.value.find(item => item.id === selectedId.value))
function distanceLabel(value) {
  return value === null ? '定位后显示距离' : `${value < 1000 ? Math.round(value) + ' m' : (value / 1000).toFixed(1) + ' km'} · 直线距离`
}
function selectItem(item) {
  selectedId.value = item.id
  if (ready.value) map.setZoomAndCenter(17, item.position)
}
function renderMarkers() {
  if (!map || !ready.value) return
  map.remove(markers)
  markers = visibleItems.value.map(item => {
    const content = document.createElement('button')
    content.type = 'button'
    content.textContent = `¥${item.price} · ${item.title}`
    content.setAttribute('aria-label', `查看${item.title}，${item.price}元`)
    content.style.cssText = `border:1px solid #111;border-radius:20px;padding:8px 12px;white-space:nowrap;cursor:pointer;font:13px system-ui;background:${item.id === selectedId.value ? '#111' : '#fff'};color:${item.id === selectedId.value ? '#fff' : '#111'}`
    content.addEventListener('click', () => selectItem(item))
    return new window.AMap.Marker({ position: item.position, content, anchor: 'bottom-center', title: item.title })
  })
  map.add(markers)
}
watch(visibleItems, () => {
  if (!visibleItems.value.some(item => item.id === selectedId.value)) selectedId.value = null
  renderMarkers()
})
watch(selectedId, renderMarkers)
function showCampus() {
  if (ready.value) map.setZoomAndCenter(16, campus)
}
function loadAmap() {
  if (window.AMap) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (securityJsCode) window._AMapSecurityConfig = { securityJsCode }
    scriptEl = document.createElement('script')
    scriptEl.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.Geolocation,AMap.Scale,AMap.ToolBar`
    loadTimer = window.setTimeout(() => reject(new Error('地图加载超时')), 15000)
    scriptEl.onload = () => { clearTimeout(loadTimer); window.AMap ? resolve() : reject(new Error('地图不可用')) }
    scriptEl.onerror = () => { clearTimeout(loadTimer); reject(new Error('地图加载失败')) }
    document.head.appendChild(scriptEl)
  })
}
function locate() {
  if (!geolocation || locating.value) return
  locating.value = true
  locationNotice.value = '正在定位，请允许浏览器访问位置……'
  const sequence = ++locateSequence
  locationTimer = window.setTimeout(() => {
    if (disposed || sequence !== locateSequence) return
    ++locateSequence
    locating.value = false
    locationNotice.value = '定位超时，请检查设备定位服务后重试。'
  }, 12000)
  geolocation.getCurrentPosition((status, result) => {
    if (disposed || sequence !== locateSequence) return
    clearTimeout(locationTimer)
    locating.value = false
    if (status !== 'complete' || !result?.position) {
      locationNotice.value = '无法获取位置，请检查浏览器权限、设备定位服务及 HTTPS 连接后重试。'
      return
    }
    const position = [result.position.getLng(), result.position.getLat()]
    userPosition.value = position
    if (userMarker) map.remove(userMarker)
    if (accuracyCircle) map.remove(accuracyCircle)
    userMarker = new window.AMap.Marker({ position, title: '我的位置', zIndex: 200 })
    map.add(userMarker)
    if (Number.isFinite(result.accuracy) && result.accuracy > 0) {
      accuracyCircle = new window.AMap.Circle({ center: position, radius: result.accuracy, strokeColor: '#666', strokeOpacity: 0.4, fillColor: '#888', fillOpacity: 0.1 })
      map.add(accuracyCircle)
    }
    map.setZoomAndCenter(16, position)
    locationNotice.value = `已定位${result.accuracy ? '，精度约 ' + Math.round(result.accuracy) + ' 米' : ''}。闲置为固定校区示例。`
  })
}
onMounted(async () => {
  if (!key) return
  try {
    await loadAmap()
    if (disposed) return
    await nextTick()
    if (disposed) return
    map = new window.AMap.Map(mapEl.value, { mapStyle: 'amap://styles/whitesmoke', center: campus, zoom: 16, zooms: [3, 20] })
    mapTimer = window.setTimeout(() => {
      if (!disposed && !ready.value) notice.value = '地图尚未加载完成，请检查网络与高德配置；当前为校区示意图。'
    }, 15000)
    map.on('complete', () => {
      if (disposed) return
      clearTimeout(mapTimer)
      ready.value = true
      notice.value = '高德地图 · 闲置为示例数据，尚未接入商品接口'
      renderMarkers()
    })
    window.AMap.plugin(['AMap.Geolocation', 'AMap.Scale', 'AMap.ToolBar'], () => {
      if (disposed) return
      map.addControl(new window.AMap.Scale({ position: 'LB' }))
      map.addControl(new window.AMap.ToolBar({ position: 'RB', offset: [16, 80] }))
      geolocation = new window.AMap.Geolocation({ enableHighAccuracy: true, timeout: 10000, convert: true, showButton: false, showMarker: false, showCircle: false, panToLocation: false, zoomToAccuracy: false })
      locationAvailable.value = true
    })
  } catch {
    if (!disposed) notice.value = '高德地图加载失败，请检查网络、Key 和安全配置；当前为校区示意图。'
  }
})
const locationAvailable = ref(false)
onBeforeUnmount(() => {
  disposed = true
  ++locateSequence
  clearTimeout(loadTimer)
  clearTimeout(locationTimer)
  clearTimeout(mapTimer)
  if (scriptEl) { scriptEl.onload = null; scriptEl.onerror = null }
  map?.destroy()
  map = null
})
</script>

<template>
  <section class="map-page">
    <aside class="map-panel">
      <p class="eyebrow">校园漫游 / NEARBY</p>
      <h1>好东西，在附近。</h1>
      <p class="intro">走几步，遇见下一件喜欢的闲置。</p>
      <label for="map-search">搜索闲置或地点</label>
      <InputText id="map-search" v-model="query" placeholder="台灯、词典、图书馆……" fluid />
      <!-- aria-label 给无可见标题的控件组提供语义名称；aria-pressed 表示当前筛选是否选中。 -->
      <div class="filters" aria-label="闲置分类">
        <button v-for="name in ['全部', '生活', '书籍', '数码']" :key="name" :aria-pressed="category === name" @click="category = name">{{ name }}</button>
      </div>
      <label for="map-radius">距离范围</label>
      <select id="map-radius" v-model="radius" :disabled="!userPosition">
        <option value="all">全部示例地点</option><option value="1000">我附近 1 公里</option><option value="3000">我附近 3 公里</option>
      </select>
      <div class="list-heading"><strong>{{ visibleItems.length }} 件闲置</strong><span>示例数据</span></div>
      <div class="item-list">
        <button v-for="item in visibleItems" :key="item.id" class="item" :class="{ active: selectedId === item.id }" @click="selectItem(item)">
          <span class="item-category">{{ item.category }}</span><span class="item-copy"><strong>{{ item.title }}</strong><small>{{ item.place }}</small><small>{{ distanceLabel(item.distance) }}</small></span><b>¥{{ item.price }}</b>
        </button>
        <p v-if="!visibleItems.length" class="empty">这个范围内没有匹配的示例闲置，试试调整距离或关键词。</p>
      </div>
      <p class="data-note">闲置坐标为朝晖校区示例；高德提供地图与定位，不提供市集商品数据。</p>
    </aside>
    <div class="map-stage">
      <div ref="mapEl" class="amap-box" aria-label="附近闲置地图"></div>
      <div v-if="!ready" class="mock-stage">
        <svg viewBox="0 0 900 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g stroke="#dfdfdb" stroke-width="18" fill="none"><path d="M-20 180 Q400 260 920 210 M-20 430 Q520 380 920 440 M180 -20 Q140 460 200 660 M640 -20 Q700 420 660 660" /></g><path d="M-20 270 Q480 330 920 270" stroke="#d4deda" stroke-width="28" fill="none" /></svg>
        <span class="campus-label">浙工大 · 朝晖校区</span>
        <button v-for="item in visibleItems" :key="item.id" class="mock-pin" :class="{ active: selectedId === item.id }" :style="{ left: item.x + '%', top: item.y + '%' }" @click="selectItem(item)">¥{{ item.price }} · {{ item.title }}</button>
      </div>
      <div class="map-actions"><Button label="回到校区" severity="secondary" rounded @click="showCampus" /><Button :label="locating ? '定位中…' : '我的位置'" :disabled="!ready || !locationAvailable || locating" severity="contrast" rounded @click="locate" /></div>
      <div class="map-status" role="status"><p>{{ notice }}</p><p>{{ locationNotice }}</p></div>
      <article v-if="selected" class="detail-card"><button class="close" aria-label="关闭闲置详情" @click="selectedId = null">×</button><small>示例闲置 / {{ selected.category }}</small><h2>{{ selected.title }} <span>¥{{ selected.price }}</span></h2><p>{{ selected.description }}</p><small>{{ selected.place }} · {{ distanceLabel(selected.distance) }}</small></article>
    </div>
  </section>
</template>

<style scoped>
.map-page { display: flex; flex: 1; min-height: 0; min-width: 0; color: var(--app-text, #171717); background: var(--app-bg, #f5f1e8); font-family: 'Round', system-ui, sans-serif; }
.map-panel { width: 320px; flex-shrink: 0; overflow: auto; padding: 28px 22px; border-right: 1px solid var(--app-border, #ddd); background: var(--app-surface, #fbf8f1); }
.eyebrow { font-size: 10px; letter-spacing: 2px; color: #777; margin: 0 0 14px; }
h1 { font-family: 'Ding', system-ui, sans-serif; font-size: 30px; font-weight: normal; margin: 0; }
.intro { font-size: 12px; color: #777; line-height: 1.8; margin: 12px 0 24px; }
label { display: block; font-size: 11px; color: #666; margin: 12px 0 8px; }
select { width: 100%; border: 1px solid #ddd; border-radius: 10px; background: white; padding: 9px; font: inherit; font-size: 12px; }
.filters { display: flex; gap: 7px; margin: 14px 0; }
.filters button { border: 1px solid #ddd; border-radius: 20px; padding: 6px 12px; background: transparent; font: inherit; font-size: 12px; cursor: pointer; }
.filters button[aria-pressed=true] { background: #171717; color: white; border-color: #171717; }
.list-heading { display: flex; justify-content: space-between; font-size: 12px; border-top: 1px solid #ddd; margin-top: 24px; padding: 20px 0 10px; }
.list-heading span, .data-note { color: #888; font-size: 11px; }
.item { display: flex; gap: 10px; align-items: flex-start; width: 100%; padding: 16px 8px; text-align: left; border: 0; border-bottom: 1px solid #e5e5e5; background: transparent; cursor: pointer; font: inherit; }
.item.active { background: #eee; border-radius: 10px; }
.item-category { font-size: 10px; border: 1px solid #ddd; padding: 5px; writing-mode: vertical-rl; letter-spacing: 3px; }
.item-copy { flex: 1; }.item-copy strong { font-size: 13px; font-weight: normal; }.item-copy small { display: block; margin-top: 7px; font-size: 10px; color: #777; }.item b { font-size: 16px; }
.data-note, .empty { line-height: 1.8; margin-top: 20px; }.empty { font-size: 12px; color: #777; }
.map-stage { flex: 1; min-width: 0; position: relative; overflow: hidden; }.amap-box, .mock-stage { position: absolute; inset: 0; }.mock-stage { background: #eeefea; }.mock-stage svg { width: 100%; height: 100%; }.campus-label { position: absolute; top: 45%; left: 35%; color: #92968e; font-size: 12px; }
.mock-pin { position: absolute; transform: translate(-50%, -100%); border: 1px solid #111; border-radius: 20px; padding: 8px 12px; background: white; white-space: nowrap; font-size: 12px; cursor: pointer; }.mock-pin.active { background: #111; color: white; }
.map-actions { position: absolute; top: 18px; right: 18px; display: flex; gap: 8px; }.map-status { position: absolute; left: 16px; top: 72px; right: 16px; pointer-events: none; }.map-status p { width: fit-content; max-width: 100%; padding: 5px 10px; margin: 4px 0; background: #fffffff0; border-radius: 6px; font-size: 10px; color: #666; }
.detail-card { position: absolute; left: 22px; right: 65px; bottom: 55px; padding: 20px; background: white; border: 1px solid #ddd; border-radius: 16px; max-width: 370px; }.detail-card small { font-size: 11px; color: #777; }.detail-card h2 { font-size: 19px; margin: 10px 0; }.detail-card h2 span { margin-left: 14px; }.detail-card p { font-size: 12px; line-height: 1.8; }.close { position: absolute; right: 12px; top: 8px; background: none; border: 0; font-size: 23px; cursor: pointer; }
button:focus-visible, select:focus-visible { outline: 2px solid #999; outline-offset: 3px; }
@media(max-width: 800px) { .map-page { flex-direction: column-reverse; overflow: auto; }.map-stage { flex: 0 0 55vh; min-height: 340px; }.map-panel { width: 100%; overflow: visible; padding: 22px; border-right: 0; }.item-list { display: flex; flex-wrap: wrap; }.item { flex: 1 1 240px; }.map-actions { top: 12px; right: 12px; } }
</style>
