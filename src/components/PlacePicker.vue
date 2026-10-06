<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { Search, MapPin, LocateFixed, RefreshCw } from 'lucide-vue-next'
import { amapPlugins, mapStyle, amapError, locateAmap } from '@/composables/amap'
import { campus, type PlaceValue } from '@/data/market'
const props = defineProps<{ visible: boolean; value: PlaceValue | null }>()
const emit = defineEmits<{ 'update:visible': [value: boolean]; select: [place: PlaceValue] }>()
const shown = computed({ get: () => props.visible, set: value => emit('update:visible', value) })
const isDark = inject('isDark', ref(false))
const mapEl = ref<HTMLElement | null>(null)
const query = ref(''), feedback = ref(''), error = ref('')
const loading = ref(false), searching = ref(false), locating = ref(false), resolving = ref(false)
const tileNotice = ref('')  // 底图瓦片加载慢时的提示
const results = ref<PlaceValue[]>([]), pending = ref<PlaceValue | null>(null)
const manualPosition = ref<[number, number] | null>(null), manualName = ref('')
let sdk: any, map: any, marker: any, searchService: any, geocoder: any
let locationAbort: AbortController | null = null
let generation = 0, sequence = 0
let operationTimer: ReturnType<typeof setTimeout>, mapTimer: ReturnType<typeof setTimeout>
const working = computed(() => searching.value || locating.value || resolving.value)
const choice = computed<PlaceValue | null>(() => pending.value ?? (manualPosition.value && manualName.value.trim() ? { name: manualName.value.trim(), address: '', position: manualPosition.value, source: 'map' } : null))
function invalidate() { ++sequence; clearTimeout(operationTimer); locationAbort?.abort(); locationAbort = null; searching.value = false; locating.value = false; resolving.value = false }
function begin(onTimeout?: () => void) {
  invalidate()
  const id = sequence   // 记下这次操作的序号，回调里用来核对是否过期
  operationTimer = setTimeout(() => { if (sequence !== id) return; invalidate(); if (onTimeout) onTimeout(); else feedback.value = '请求超时，请检查网络与高德代理后重试。' }, 12000)
  return id
}
function active(id: number) { return props.visible && id === sequence }
function point(position: [number, number]) {
  marker?.setMap(null)
  marker = new sdk.Marker({ position, anchor: 'bottom-center' })
  map.add(marker)          // 加进地图
  map.panTo(position)      // 平滑把视野中心挪过去
}
function selectResult(place: PlaceValue) {
  invalidate(); manualPosition.value = null; pending.value = { ...place, position: [...place.position] }; feedback.value = ''
  point(place.position)
}
function resolvePoint(position: [number, number]) {
  const fallback = (reason: string) => { manualPosition.value = position; feedback.value = reason + ' 已保留点选坐标，填写位置名称即可确认。' }
  const id = begin(() => fallback('已取得坐标，但地址解析超时。')); resolving.value = true; pending.value = null; manualPosition.value = null; manualName.value = ''; feedback.value = '已取得坐标，正在解析地址…'; point(position)
  try { geocoder.getAddress(position, (status: string, result: any) => {
    if (!active(id)) return
    clearTimeout(operationTimer); resolving.value = false
    const address = result?.regeocode?.formattedAddress
    if (status === 'complete' && address) {
      pending.value = { name: address, address, position, source: 'map' }; feedback.value = '请核对位置，确认后用于帖子。'
    } else fallback(amapError(result, '地址解析'))   // 解析失败 → 降级
  }) } catch (cause) { if (active(id)) { invalidate(); fallback(amapError(cause, '地址解析')) } }
}
function search() {
  if (!searchService || !query.value.trim()) return
  const id = begin(); searching.value = true; results.value = []; feedback.value = ''
  try { searchService.search(query.value.trim(), (status: string, result: any) => {
    if (!active(id)) return
    clearTimeout(operationTimer); searching.value = false
    if (status !== 'complete') { feedback.value = status === 'no_data' ? '没有找到地点，请换一个具体名称。' : amapError(result, '地点搜索'); return }
    results.value = (result?.poiList?.pois ?? []).filter((poi: any) => poi.location?.getLng && poi.location?.getLat).map((poi: any) => ({ name: poi.name, address: [poi.pname, poi.cityname, poi.adname, typeof poi.address === 'string' ? poi.address : ''].filter(Boolean).join(''), position: [poi.location.getLng(), poi.location.getLat()], poiId: poi.id, source: 'poi' }))
    if (!results.value.length) feedback.value = '没有可选坐标，请换一个具体地点名称。'
  }) } catch (cause) { if (active(id)) { invalidate(); feedback.value = amapError(cause, '地点搜索') } }
}
async function locate() {
  if (!sdk || !map || locating.value) return
  invalidate()
  const id = sequence, controller = new AbortController()
  locationAbort = controller; locating.value = true
  try {
    const result = await locateAmap(sdk, controller.signal, message => { if (active(id)) feedback.value = message })
    if (!active(id)) return
    resolvePoint(result.position)
  } catch (cause) {
    if (active(id)) feedback.value = cause instanceof Error ? cause.message : '定位失败，请搜索地点或手动选点。'
  } finally { if (active(id)) { locating.value = false; locationAbort = null } }  // finally：无论成败都执行
}
function cleanup() { ++generation; invalidate(); clearTimeout(mapTimer); map?.destroy(); map = null; marker = null; searchService = null; geocoder = null }
async function start() {
  cleanup(); const token = generation; loading.value = true; error.value = ''; tileNotice.value = ''; feedback.value = ''; results.value = []; query.value = ''; manualPosition.value = null; manualName.value = ''
  pending.value = props.value ? { ...props.value, position: [...props.value.position] } : null
  await nextTick()
  try {
    sdk = await amapPlugins(['AMap.PlaceSearch', 'AMap.Geocoder', 'AMap.Geolocation', 'AMap.Scale'])
    if (!props.visible || token !== generation || !mapEl.value) return
    map = new sdk.Map(mapEl.value, {
      center: pending.value?.position ?? campus,  // 初始中心：已选地点或校区中心
      zoom: 16,                                    // 缩放级别（越大越近）
      mapStyle: mapStyle(isDark.value),            // 按主题选底图样式
      resizeEnable: true,                          // 容器尺寸变化自动适应
      animateEnable: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,  // 减少动效时关动画
    })
    map.addControl(new sdk.Scale({ position: 'LB' }))
    searchService = new sdk.PlaceSearch({ city: '杭州', citylimit: true, pageSize: 8, extensions: 'base' })
    geocoder = new sdk.Geocoder({ city: '杭州', extensions: 'base' })
    map.on('click', (event: any) => resolvePoint([event.lnglat.getLng(), event.lnglat.getLat()]))
    loading.value = false
    map.on('complete', () => { if (token !== generation) return; clearTimeout(mapTimer); tileNotice.value = '' })
    mapTimer = setTimeout(() => { if (token !== generation) return; tileNotice.value = '底图加载较慢，可继续搜索地点；请核对坐标后确认。' }, 15000)
    if (pending.value) point(pending.value.position)
  } catch (cause) { if (token === generation && props.visible) { loading.value = false; error.value = cause instanceof Error ? cause.message : '地图加载失败。' } }
}
function confirm() { if (!choice.value || working.value || loading.value || error.value) return; emit('select', { ...choice.value, position: [...choice.value.position] }); shown.value = false }
watch(() => props.visible, value => { if (!value) cleanup() })
watch(isDark, dark => map?.setMapStyle(mapStyle(dark)))
onBeforeUnmount(cleanup)
</script>
<template>
  <Dialog v-model:visible="shown" modal :draggable="false" class="place-picker-dialog" :header="'选择交易地点'" :style="{ width: '52rem', maxWidth: 'calc(100vw - 2rem)' }" @show="start">
    <div class="place-picker">
      <p class="picker-hint">选择公共交接点，不默认公开当前位置。当前搜索范围：杭州。</p>
      <form class="place-search" @submit.prevent="search"><InputText v-model="query" aria-label="搜索地点" placeholder="搜索图书馆、店名或具体地址" :disabled="loading || !!error" /><Button type="submit" :loading="searching" :disabled="!query.trim() || loading || !!error" aria-label="搜索地点"><Search :size="17" aria-hidden="true" /><span>搜索</span></Button></form>
      <div class="picker-map-wrap"><div ref="mapEl" class="picker-map" aria-label="高德地点选择地图"></div>
        <div v-if="loading || error" class="picker-map-state" role="status"><MapPin :size="26" aria-hidden="true" /><p>{{ loading ? '正在加载高德地图…' : error }}</p><Button v-if="error" severity="secondary" @click="start"><RefreshCw :size="16" aria-hidden="true" />重新加载</Button></div></div>
      <div class="picker-actions"><span>点击地图或从搜索结果选择，最后确认。</span><Button size="small" severity="secondary" :loading="locating" :disabled="loading || !!error" @click="locate"><LocateFixed :size="16" aria-hidden="true" />使用我的位置</Button></div>
      <Message v-if="tileNotice" severity="warn" size="small" :closable="false">{{ tileNotice }} <Button label="重试底图" text size="small" severity="secondary" @click="start" /></Message>
      <Message v-if="feedback" severity="secondary" size="small" :closable="false">{{ feedback }}</Message>
      <div v-if="results.length" class="place-results" aria-label="地点搜索结果"><Button v-for="place in results" :key="place.poiId" unstyled class="place-result" :class="{ selected: pending?.poiId === place.poiId }" :aria-pressed="pending?.poiId === place.poiId" @click="selectResult(place)"><MapPin :size="17" aria-hidden="true" /><span><strong>{{ place.name }}</strong><small>{{ place.address }}</small></span></Button></div>
      <div v-if="manualPosition" class="manual-place"><label for="manual-place-name">这个位置的名称或说明</label><InputText id="manual-place-name" v-model="manualName" maxlength="80" fluid placeholder="例如：图书馆东侧入口" /><small>保存的是你点选的坐标与手动说明，不是已验证的 POI。</small></div>
      <div v-if="choice" class="selected-place"><MapPin :size="18" aria-hidden="true" /><div><strong>{{ choice.name }}</strong><p>{{ choice.address || '手动说明的地图坐标' }}</p></div></div>
    </div>
    <template #footer><Button label="取消" severity="secondary" text @click="shown = false" /><Button label="使用这个地点" class="ink-button" :disabled="!choice || working || loading || !!error" @click="confirm" /></template>
  </Dialog>
</template>
<style scoped>
.place-picker{display:flex;flex-direction:column;gap:14px;color:var(--app-text);font:14px/1.5 system-ui,sans-serif}.picker-hint{font-size:12px;color:var(--app-muted);margin:0}.place-search{display:flex;gap:10px}.place-search>input{flex:1;min-width:0}.picker-map-wrap{height:310px;position:relative;border:1px solid var(--app-border);border-radius:10px;overflow:hidden;background:var(--app-hover)}.picker-map{height:100%;width:100%}.picker-map-state{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px;background:var(--app-surface);color:var(--app-muted)}.picker-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px;color:var(--app-muted)}.place-results{max-height:190px;overflow:auto;border:1px solid var(--app-border);border-radius:8px}.place-result{display:flex;gap:12px;align-items:flex-start;background:none;border:0;border-bottom:1px solid var(--app-border);padding:12px;width:100%;text-align:left;color:var(--app-text);font:inherit;cursor:pointer}.place-result.selected,.place-result:hover{background:var(--app-hover)}.place-result:focus-visible{outline:2px solid var(--app-text);outline-offset:-3px}.place-result strong{font-size:13px;font-weight:500}.place-result small{display:block;color:var(--app-muted);font-size:11px;margin-top:4px}.selected-place{display:flex;align-items:center;gap:10px;background:var(--app-hover);padding:14px;border-radius:8px}.selected-place strong{font-size:13px}.selected-place p{margin:3px 0 0;font-size:11px;color:var(--app-muted)}.manual-place{display:flex;flex-direction:column;gap:8px}.manual-place small{color:var(--app-muted);font-size:11px}@media(max-width:600px){.picker-map-wrap{height:260px}.picker-actions{align-items:flex-start}.picker-actions>span{max-width:45%}}
</style>
