<script setup lang="ts">
/*
 * 地点选择弹窗：发布帖子时选交易/推荐地点用。
 *
 * 三种选点方式，结果统一收进同一个 PlaceValue：
 *   1. 搜索地点（PlaceSearch，限杭州市）→ 点结果列表
 *   2. 直接点地图 → 逆地理编码（Geocoder）把坐标翻译成地址；解析失败时降级为
 *      "保留坐标 + 手动填名称"，不阻塞用户
 *   3. "使用我的位置"（Geolocation 浏览器定位）→ 拿到坐标后走第 2 步
 *
 * 竞态控制（generation 与 sequence 两把号）：
 *   - generation：弹窗"整个生命周期"的编号。每次 start()（打开/重试）自增，
 *     cleanup() 里旧地图 destroy 后，迟到的异步回调靠比对它来知道自己已过期。
 *   - sequence："单个操作"的编号。搜索、定位、逆编码互相打断时各自自增，
 *     active(id) 检查不过的直接丢弃，防止旧结果覆盖新结果。
 */
// inject：取 App.vue 用 provide 提供的 isDark（读屏主题状态），第二个参数是兜底默认值
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
// lucide 图标：Search=搜索、MapPin=图钉、LocateFixed=定位、RefreshCw=刷新
import { Search, MapPin, LocateFixed, RefreshCw } from 'lucide-vue-next'
// 高德地图相关工具：插件加载 / 地图样式 / 错误文案 / 浏览器定位
import { amapPlugins, mapStyle, amapError, locateAmap } from '@/composables/amap'
// campus：校区中心坐标（地图初始中心）；PlaceValue：地点数据结构；PostKind：帖子类型
import { campus, type PlaceValue, type PostKind } from '@/data/market'
// visible：弹窗开关；value：父级当前已选地点；kind：帖子类型（决定文案）
const props = defineProps<{ visible: boolean; value: PlaceValue | null; kind: PostKind }>()
// 'update:visible' 是 v-model:visible 的另一半——emit 它父级就更新
const emit = defineEmits<{ 'update:visible': [value: boolean]; select: [place: PlaceValue] }>()
// 桥接：读父级的 visible，写时向父级发 update:visible
const shown = computed({ get: () => props.visible, set: value => emit('update:visible', value) })
const isDark = inject('isDark', ref(false))
// ref<HTMLElement | null>：存 DOM 元素（地图容器）；脚本里要 .value，模板 ref="mapEl" 自动关联
const mapEl = ref<HTMLElement | null>(null)
// 三行声明合并写法：搜索关键词、提示条文案、错误文案
const query = ref(''), feedback = ref(''), error = ref('')
// 四个"忙碌中"标记：分别对应 搜索/定位/逆编码 进行中
const loading = ref(false), searching = ref(false), locating = ref(false), resolving = ref(false)
const tileNotice = ref('')  // 底图瓦片加载慢时的提示
// results：搜索结果列表；pending：当前点选待确认的地点
const results = ref<PlaceValue[]>([]), pending = ref<PlaceValue | null>(null)
// 逆编码失败降级时的手动模式：保留的坐标 + 用户手填的名称
const manualPosition = ref<[number, number] | null>(null), manualName = ref('')
// 高德 SDK 对象们：any 类型（SDK 没有类型声明）；let 不带初始值 = undefined
let sdk: any, map: any, marker: any, searchService: any, geocoder: any
// AbortController：用于中途取消浏览器定位的标准 Web API
let locationAbort: AbortController | null = null
// 两把"号"：generation=弹窗生命周期编号；sequence=单次操作编号（详见文件头注释）
let generation = 0, sequence = 0
// ReturnType<typeof setTimeout>：setTimeout 的返回值类型（浏览器里是 number）
let operationTimer: ReturnType<typeof setTimeout>, mapTimer: ReturnType<typeof setTimeout>
// 三个操作任一进行中就算"忙"
const working = computed(() => searching.value || locating.value || resolving.value)
// "使用这个地点"按钮的取值：优先搜索/点选的结果（pending）；
// 逆编码失败降级时，取"手动坐标 + 用户填写的名称"。
// ?? 空值合并：左边是 null/undefined 才取右边（区别于 ||，0/空串不算空）
const choice = computed<PlaceValue | null>(() => pending.value ?? (manualPosition.value && manualName.value.trim() ? { name: manualName.value.trim(), address: '', position: manualPosition.value, source: 'map' } : null))
// 作废当前所有进行中的操作：序号 +1 让旧回调失效，掐掉超时计时器，中止定位。
function invalidate() { ++sequence; clearTimeout(operationTimer); locationAbort?.abort(); locationAbort = null; searching.value = false; locating.value = false; resolving.value = false }
// 开始一个新操作：先作废旧操作，再发一个新序号和 12 秒超时兜底。
// SDK 的回调正常会比计时器先到；超时说明网络/代理卡住了。
function begin(onTimeout?: () => void) {
  invalidate()
  const id = sequence   // 记下这次操作的序号，回调里用来核对是否过期
  operationTimer = setTimeout(() => { if (sequence !== id) return; invalidate(); if (onTimeout) onTimeout(); else feedback.value = '请求超时，请检查网络与高德代理后重试。' }, 12000)
  return id
}
// 回调还能不能算数：弹窗要还开着，且操作序号仍是发起时的那个（没被更新的操作打断）。
function active(id: number) { return props.visible && id === sequence }
// 把地图上的标记挪到指定坐标
function point(position: [number, number]) {
  marker?.setMap(null)   // 旧标记从地图移除（setMap(null) = 摘掉）
  // new sdk.Marker：创建高德标记；anchor: 'bottom-center'：图钉尖端对准坐标点
  marker = new sdk.Marker({ position, anchor: 'bottom-center' })
  map.add(marker)          // 加进地图
  map.panTo(position)      // 平滑把视野中心挪过去
}
// 点了某条搜索结果：作废进行中的操作 → 记为待确认 → 地图上打点。
// {...place, position: [...place.position]}：浅拷贝，避免改动父组件的数据对象
function selectResult(place: PlaceValue) {
  invalidate(); manualPosition.value = null; pending.value = { ...place, position: [...place.position] }; feedback.value = ''
  point(place.position)
}
// 点地图 / 定位成功后的收尾：把坐标翻译成地址（逆地理编码）。
// 解析失败或超时不算致命——降级成"手动模式"，坐标还在，用户自己填个名字即可确认。
function resolvePoint(position: [number, number]) {
  // 降级函数：坐标存进 manualPosition，提示用户手动补名称
  const fallback = (reason: string) => { manualPosition.value = position; feedback.value = reason + ' 已保留点选坐标，填写位置名称即可确认。' }
  // begin：登记新操作并挂 12 秒超时（超时就走降级）
  const id = begin(() => fallback('已取得坐标，但地址解析超时。')); resolving.value = true; pending.value = null; manualPosition.value = null; manualName.value = ''; feedback.value = '已取得坐标，正在解析地址…'; point(position)
  // geocoder.getAddress：高德逆地理编码——坐标进、地址出；回调式 API
  try { geocoder.getAddress(position, (status: string, result: any) => {
    if (!active(id)) return   // 已被更新操作作废，丢弃
    clearTimeout(operationTimer); resolving.value = false
    // ?. 链式取值：一层没取到整句就是 undefined，不报错
    const address = result?.regeocode?.formattedAddress
    if (status === 'complete' && address) {
      // 地图点选使用真实逆编码地址，不借用附近 POI 冒充当前选点。
      pending.value = { name: address, address, position, source: 'map' }; feedback.value = '请核对位置，确认后用于帖子。'
    } else fallback(amapError(result, '地址解析'))   // 解析失败 → 降级
  }) } catch (cause) { if (active(id)) { invalidate(); fallback(amapError(cause, '地址解析')) } }
}
// 搜索地点
function search() {
  // 服务没初始化、或关键词为空，直接不搜
  if (!searchService || !query.value.trim()) return
  const id = begin(); searching.value = true; results.value = []; feedback.value = ''
  try { searchService.search(query.value.trim(), (status: string, result: any) => {
    if (!active(id)) return
    clearTimeout(operationTimer); searching.value = false
    // no_data 是"没搜到"（正常情况），其余状态当错误处理
    if (status !== 'complete') { feedback.value = status === 'no_data' ? '没有找到地点，请换一个具体名称。' : amapError(result, '地点搜索'); return }
    // 链式处理：取 POI 列表 → filter 过滤没有经纬度的脏数据 → map 转成 PlaceValue 结构。
    // [pname, cityname, ...].filter(Boolean).join('')：把非空的省市区地址拼成一串
    results.value = (result?.poiList?.pois ?? []).filter((poi: any) => poi.location?.getLng && poi.location?.getLat).map((poi: any) => ({ name: poi.name, address: [poi.pname, poi.cityname, poi.adname, typeof poi.address === 'string' ? poi.address : ''].filter(Boolean).join(''), position: [poi.location.getLng(), poi.location.getLat()], poiId: poi.id, source: 'poi' }))
    if (!results.value.length) feedback.value = '没有可选坐标，请换一个具体地点名称。'
  }) } catch (cause) { if (active(id)) { invalidate(); feedback.value = amapError(cause, '地点搜索') } }
}
// "使用我的位置"：浏览器定位（locateAmap 内部带超时/高精度重试），
// 成功后交给 resolvePoint 做地址解析。AbortController 在弹窗关闭时中断等待。
async function locate() {
  // 正在定位中就不重复触发
  if (!sdk || !map || locating.value) return
  invalidate()
  const id = sequence, controller = new AbortController()
  locationAbort = controller; locating.value = true
  try {
    // await：等定位完成；controller.signal 传进去，外部 abort 就能取消
    const result = await locateAmap(sdk, controller.signal, message => { if (active(id)) feedback.value = message })
    if (!active(id)) return
    resolvePoint(result.position)
  } catch (cause) {
    // instanceof：判断错误类型，拿得到 message 就显示原始信息
    if (active(id)) feedback.value = cause instanceof Error ? cause.message : '定位失败，请搜索地点或手动选点。'
  } finally { if (active(id)) { locating.value = false; locationAbort = null } }  // finally：无论成败都执行
}
// 关闭弹窗或组件卸载时的总清理：生命周期号 +1 作废所有回调，销毁地图释放内存。
// 高德地图实例必须 destroy()，否则事件监听和瓦片请求会留在页面里。
function cleanup() { ++generation; invalidate(); clearTimeout(mapTimer); map?.destroy(); map = null; marker = null; searchService = null; geocoder = null }
// 弹窗打开 / 点"重新加载"时重建整个地图。先清理旧实例再走一遍初始化。
async function start() {
  // token：本次初始化的生命周期号，之后每次 await 返回都核对它，防止旧初始化覆盖新的
  cleanup(); const token = generation; loading.value = true; error.value = ''; tileNotice.value = ''; feedback.value = ''; results.value = []; query.value = ''; manualPosition.value = null; manualName.value = ''
  // 回显父级已选地点（拷贝一份，不直接引用）
  pending.value = props.value ? { ...props.value, position: [...props.value.position] } : null
  // 等 DOM 更新完（地图容器真的出现在页面里）再初始化
  await nextTick()
  try {
    // 按需加载 4 个高德插件：搜索、逆编码、定位、比例尺
    sdk = await amapPlugins(['AMap.PlaceSearch', 'AMap.Geocoder', 'AMap.Geolocation', 'AMap.Scale'])
    // 加载期间弹窗被关了/被重建了/容器没了 → 直接放弃
    if (!props.visible || token !== generation || !mapEl.value) return
    // new sdk.Map(容器, 配置)：创建地图实例
    map = new sdk.Map(mapEl.value, {
      center: pending.value?.position ?? campus,  // 初始中心：已选地点或校区中心
      zoom: 16,                                    // 缩放级别（越大越近）
      mapStyle: mapStyle(isDark.value),            // 按主题选底图样式
      resizeEnable: true,                          // 容器尺寸变化自动适应
      animateEnable: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,  // 减少动效时关动画
    })
    // 左下角（LB）加比例尺控件
    map.addControl(new sdk.Scale({ position: 'LB' }))
    // 搜索与逆编码都圈定在杭州；citylimit 保证不会搜到外地的同名地点。
    searchService = new sdk.PlaceSearch({ city: '杭州', citylimit: true, pageSize: 8, extensions: 'base' })
    geocoder = new sdk.Geocoder({ city: '杭州', extensions: 'base' })
    // 监听地图点击：把点击坐标交给 resolvePoint 解析地址
    map.on('click', (event: any) => resolvePoint([event.lnglat.getLng(), event.lnglat.getLat()]))
    // 服务与底图分别就绪，瓦片超时不应挡住点击、搜索与确认。
    loading.value = false
    // complete 事件 = 底图瓦片加载完成 → 撤掉慢加载计时器和提示
    map.on('complete', () => { if (token !== generation) return; clearTimeout(mapTimer); tileNotice.value = '' })
    // 15 秒还没 complete → 提示"底图慢"，但不阻塞其他功能
    mapTimer = setTimeout(() => { if (token !== generation) return; tileNotice.value = '底图加载较慢，可继续搜索地点；请核对坐标后确认。' }, 15000)
    // 已有选中地点就先把标记立上
    if (pending.value) point(pending.value.position)
  } catch (cause) { if (token === generation && props.visible) { loading.value = false; error.value = cause instanceof Error ? cause.message : '地图加载失败。' } }
}
// 确认按钮：有结果、不忙、没加载失败才允许；emit select 把深拷贝的地点交给父级并关窗
function confirm() { if (!choice.value || working.value || loading.value || error.value) return; emit('select', { ...choice.value, position: [...choice.value.position] }); shown.value = false }
// 弹窗一关就销毁地图（下次打开重建，省资源）
watch(() => props.visible, value => { if (!value) cleanup() })
// 主题切换时同步换底图样式
watch(isDark, dark => map?.setMapStyle(mapStyle(dark)))
// 组件卸载兜底清理
onBeforeUnmount(cleanup)
</script>
<template>
  <!-- @show：PrimeVue Dialog 的弹窗打开事件——每次打开都重新初始化地图 -->
  <Dialog v-model:visible="shown" modal :draggable="false" class="place-picker-dialog" :header="kind === 'idle' ? '选择交易地点' : '选择推荐地点'" :style="{ width: '52rem', maxWidth: 'calc(100vw - 2rem)' }" @show="start">
    <div class="place-picker">
      <!-- 顶部提示文案，按帖子类型切换 -->
      <p class="picker-hint">{{ kind === 'idle' ? '选择公共交接点，不默认公开当前位置。' : '选中你想推荐的好地方，并核对地图位置。' }}当前搜索范围：杭州。</p>
      <!-- 搜索表单：回车或点按钮都触发 submit → @submit.prevent 拦下刷新改调 search()；
           :loading：按钮转圈；:disabled：三种情况禁用 -->
      <form class="place-search" @submit.prevent="search"><InputText v-model="query" aria-label="搜索地点" placeholder="搜索图书馆、店名或具体地址" :disabled="loading || !!error" /><Button type="submit" :loading="searching" :disabled="!query.trim() || loading || !!error" aria-label="搜索地点"><Search :size="17" aria-hidden="true" /><span>搜索</span></Button></form>
      <!-- 地图区：ref="mapEl" 把这个 div 交给脚本当地图容器；
           !!error：error 是字符串，!! 转成布尔判断"有没有错" -->
      <div class="picker-map-wrap"><div ref="mapEl" class="picker-map" aria-label="高德地点选择地图"></div>
        <!-- 加载中/出错时的覆盖层：role="status" 让读屏播报状态变化 -->
        <div v-if="loading || error" class="picker-map-state" role="status"><MapPin :size="26" aria-hidden="true" /><p>{{ loading ? '正在加载高德地图…' : error }}</p><Button v-if="error" severity="secondary" @click="start"><RefreshCw :size="16" aria-hidden="true" />重新加载</Button></div></div>
      <!-- 底部操作行：左侧说明文字，右侧"使用我的位置"按钮 -->
      <div class="picker-actions"><span>点击地图或从搜索结果选择，最后确认。</span><Button size="small" severity="secondary" :loading="locating" :disabled="loading || !!error" @click="locate"><LocateFixed :size="16" aria-hidden="true" />使用我的位置</Button></div>
      <!-- severity="warn"：黄色警告条（底图加载慢的提示） -->
      <Message v-if="tileNotice" severity="warn" size="small" :closable="false">{{ tileNotice }} <Button label="重试底图" text size="small" severity="secondary" @click="start" /></Message>
      <Message v-if="feedback" severity="secondary" size="small" :closable="false">{{ feedback }}</Message>
      <!-- 搜索结果列表：v-for 渲染；:key 用 POI id；selected 类标出当前点选项 -->
      <div v-if="results.length" class="place-results" aria-label="地点搜索结果"><Button v-for="place in results" :key="place.poiId" unstyled class="place-result" :class="{ selected: pending?.poiId === place.poiId }" :aria-pressed="pending?.poiId === place.poiId" @click="selectResult(place)"><MapPin :size="17" aria-hidden="true" /><span><strong>{{ place.name }}</strong><small>{{ place.address }}</small></span></Button></div>
      <!-- 逆编码失败降级的手动命名区：maxlength 限制输入长度 -->
      <div v-if="manualPosition" class="manual-place"><label for="manual-place-name">这个位置的名称或说明</label><InputText id="manual-place-name" v-model="manualName" maxlength="80" fluid placeholder="例如：图书馆东侧入口" /><small>保存的是你点选的坐标与手动说明，不是已验证的 POI。</small></div>
      <!-- 已选地点预览条 -->
      <div v-if="choice" class="selected-place"><MapPin :size="18" aria-hidden="true" /><div><strong>{{ choice.name }}</strong><p>{{ choice.address || '手动说明的地图坐标' }}</p></div></div>
    </div>
    <!-- #footer：Vue 具名插槽——这段内容会渲染进 Dialog 组件的页脚位置 -->
    <template #footer><Button label="取消" severity="secondary" text @click="shown = false" /><Button label="使用这个地点" class="ink-button" :disabled="!choice || working || loading || !!error" @click="confirm" /></template>
  </Dialog>
</template>
<style scoped>
.place-picker{display:flex;flex-direction:column;gap:14px;color:var(--app-text);font:14px/1.5 system-ui,sans-serif}.picker-hint{font-size:12px;color:var(--app-muted);margin:0}.place-search{display:flex;gap:10px}.place-search>input{flex:1;min-width:0}.picker-map-wrap{height:310px;position:relative;border:1px solid var(--app-border);border-radius:10px;overflow:hidden;background:var(--app-hover)}.picker-map{height:100%;width:100%}.picker-map-state{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px;background:var(--app-surface);color:var(--app-muted)}.picker-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px;color:var(--app-muted)}.place-results{max-height:190px;overflow:auto;border:1px solid var(--app-border);border-radius:8px}.place-result{display:flex;gap:12px;align-items:flex-start;background:none;border:0;border-bottom:1px solid var(--app-border);padding:12px;width:100%;text-align:left;color:var(--app-text);font:inherit;cursor:pointer}.place-result.selected,.place-result:hover{background:var(--app-hover)}.place-result:focus-visible{outline:2px solid var(--app-text);outline-offset:-3px}.place-result strong{font-size:13px;font-weight:500}.place-result small{display:block;color:var(--app-muted);font-size:11px;margin-top:4px}.selected-place{display:flex;align-items:center;gap:10px;background:var(--app-hover);padding:14px;border-radius:8px}.selected-place strong{font-size:13px}.selected-place p{margin:3px 0 0;font-size:11px;color:var(--app-muted)}.manual-place{display:flex;flex-direction:column;gap:8px}.manual-place small{color:var(--app-muted);font-size:11px}@media(max-width:600px){.picker-map-wrap{height:260px}.picker-actions{align-items:flex-start}.picker-actions>span{max-width:45%}}
</style>
