<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Bell, PackageCheck, Check, ShoppingBag, MapPin, ChevronLeft, ChevronRight, RefreshCw, ImageOff } from 'lucide-vue-next'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import PlacePicker from '@/components/PlacePicker.vue'
import { priceLabel, type PlaceValue } from '@/data/market'
import {
  authState, getMyPurchases, getMySellRequests, getSellNotices, isLoggedIn, replySellNotice, resolveAssetUrl,
  type PurchaseRecord, type SellNotice, type SellRequestSummary,
} from '@/api/client'

type ReminderType = '购买' | '售卖'
type Reminder = {
  id: string
  type: ReminderType
  title: string
  content: string
  time: string
  date: string
  unread: boolean
  icon: typeof Bell
  notice?: SellNotice
  summary?: SellRequestSummary
  purchase?: PurchaseRecord
}
const activeView = ref<'buyer' | 'seller'>('seller')
const purchasePage = ref(1), purchaseTotalPages = ref(0)
const reminders = ref<Reminder[]>([])
const query = ref('')
const selectedId = ref('')
const detailOpen = ref(false)
const listEl = ref<HTMLElement | null>(null)
const detailEl = ref<HTMLElement | null>(null)
const loading = ref(false), issue = ref(''), replyIssue = ref(''), replyNotice = ref('')
const actionBusy = ref(false), replyOpen = ref(false), selectedNotice = ref<SellNotice | null>(null)
const replyAction = ref<'approve' | 'reject' | null>(null)
const longitude = ref(''), latitude = ref('')
const pickerVisible = ref(false), tradePlace = ref<PlaceValue | null>(null)
let loadSequence = 0
const emptyReminder = computed<Reminder>(() => ({
  id: '', type: activeView.value === 'buyer' ? '购买' : '售卖',
  title: activeView.value === 'buyer' ? '暂无购买订单' : '暂无售卖记录',
  content: !isLoggedIn.value ? '登录后可查看购买请求和交易进度。' : loading.value ? '正在加载交易数据…' : issue.value || '选择左侧记录，查看交易详情。',
  time: '', date: '', unread: false, icon: Bell,
}))
const selected = computed<Reminder>(() => reminders.value.find(item => item.id === selectedId.value) ?? reminders.value[0] ?? emptyReminder.value)
const unreadCount = computed(() => reminders.value.filter(item => item.unread).length)
const filteredReminders = computed(() => {
  const term = query.value.trim().toLowerCase()
  return term ? reminders.value.filter(item => [item.type, item.title, item.content, item.purchase?.request_id, item.purchase?.goods_id, item.purchase?.seller_id].join(' ').toLowerCase().includes(term)) : reminders.value
})
const tradePosition = computed<[number, number] | null>(() => {
  if (!longitude.value.trim() || !latitude.value.trim()) return null
  const lng = Number(longitude.value), lat = Number(latitude.value)
  return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90 ? [lng, lat] : null
})
const pickerPlace = computed<PlaceValue | null>(() => {
  if (!tradePosition.value) return null
  const matches = tradePlace.value?.position.every((value, index) => value === tradePosition.value![index])
  return matches ? tradePlace.value : { name: '已填写的交易地点', address: '', position: tradePosition.value, source: 'map' }
})
const purchasePosition = computed(() => {
  const purchase = selected.value.purchase
  return purchase?.status === 'approved' ? purchase.position : null
})
function statusLabel(status: string, buyer = false) {
  return ({ pending: buyer ? '等待卖家回复' : '待处理', approved: '已同意', rejected: '已拒绝', closed: '已关闭' } as Record<string, string>)[status] || '状态未知'
}
function formatDate(value?: string | null) { if (!value) return '未提供时间'; const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }) }
function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? '' : date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai' })
}
function applyReminders(items: Reminder[]) {
  reminders.value = items
  if (!items.some(item => item.id === selectedId.value)) selectedId.value = items[0]?.id ?? ''
  if (!items.length) detailOpen.value = false
}
function rebuild(notices: SellNotice[], summaries: SellRequestSummary[]) {
  const pending = notices.map(notice => ({ id: 'notice-' + notice.request_id, type: '售卖' as const, title: '有人想购买你的商品', content: `${notice.account} 请求购买商品 #${notice.goods_id}`, time: '待处理', date: '待处理', unread: true, icon: PackageCheck, notice }))
  const pendingIds = new Set(notices.map(notice => notice.request_id))
  const history = summaries.filter(item => !pendingIds.has(item.request_id)).map(item => ({ id: 'request-' + item.request_id, type: '售卖' as const, title: `商品 #${item.goods_id} 的交易记录`, content: `${item.account} · ${statusLabel(item.status)}`, time: formatTime(item.created_at), date: formatDate(item.created_at), unread: false, icon: PackageCheck, summary: item }))
  applyReminders([...pending, ...history])
}
async function load(page = purchasePage.value) {
  const sequence = ++loadSequence
  loading.value = true; issue.value = ''
  try {
    if (!isLoggedIn.value) { reminders.value = []; selectedId.value = ''; issue.value = '请先登录后查看交易提醒。'; return }
    if (activeView.value === 'buyer') {
      let result = await getMyPurchases(page)
      if (sequence !== loadSequence) return
      const lastPage = Math.max(1, result.totalpage)
      if (page > lastPage) {
        page = lastPage
        result = await getMyPurchases(page)
        if (sequence !== loadSequence) return
      }
      purchasePage.value = page; purchaseTotalPages.value = result.totalpage
      applyReminders((result.list ?? []).map(purchase => ({
        id: 'purchase-' + purchase.request_id, type: '购买', title: purchase.title || `商品 #${purchase.goods_id}`,
        content: `${priceLabel(purchase.price)} · ${statusLabel(purchase.status, true)}`, time: formatTime(purchase.created_at),
        date: formatDate(purchase.created_at), unread: false, icon: ShoppingBag, purchase,
      })))
    } else {
      const [notices, summaries] = await Promise.all([getSellNotices(), getMySellRequests()])
      if (sequence !== loadSequence) return
      rebuild(notices, summaries)
    }
  }
  catch (error) { if (sequence === loadSequence) issue.value = error instanceof Error ? error.message : '交易记录加载失败。' }
  finally { if (sequence === loadSequence) loading.value = false }
}
async function selectReminder(id: string) { selectedId.value = id; const reminder = reminders.value.find(item => item.id === id); if (reminder) reminder.unread = false; detailOpen.value = true; await nextTick(); detailEl.value?.focus() }
async function backToList() { detailOpen.value = false; await nextTick(); listEl.value?.querySelector<HTMLElement>('.reminder.active')?.focus() }
function openReply(notice: SellNotice) {
  selectedNotice.value = notice; replyOpen.value = true; replyIssue.value = ''; replyNotice.value = ''
  longitude.value = ''; latitude.value = ''; tradePlace.value = null
}
function selectTradePlace(place: PlaceValue) {
  tradePlace.value = { ...place, position: [...place.position] }
  longitude.value = String(place.position[0]); latitude.value = String(place.position[1]); replyIssue.value = ''
}
function changePurchasePage(page: number) {
  if (loading.value || page < 1 || page > purchaseTotalPages.value) return
  query.value = ''; detailOpen.value = false
  void load(page)
}
async function submitReply(status: 'approve' | 'reject') {
  if (!selectedNotice.value || actionBusy.value || pickerVisible.value || !isLoggedIn.value) return
  replyIssue.value = ''
  let position: [number, number] | undefined
  if (status === 'approve') {
    if (!tradePosition.value) { replyIssue.value = '请先在地图选择交易地点，或填写完整、有效的经纬度。'; return }
    position = [...tradePosition.value]
  }
  const sessionToken = authState.token
  actionBusy.value = true; replyAction.value = status
  try {
    const result = await replySellNotice(selectedNotice.value.request_id, status, position)
    if (sessionToken !== authState.token) return
    replyNotice.value = result.message || (status === 'approve' ? '已同意购买请求，并保存交易地点。' : '已拒绝购买请求。')
    replyOpen.value = false; await load()
  }
  catch (error) { if (sessionToken === authState.token) replyIssue.value = error instanceof Error ? error.message : '处理交易请求失败。' }
  finally { actionBusy.value = false; replyAction.value = null }
}
watch([activeView, isLoggedIn, () => authState.token], () => {
  reminders.value = []; selectedId.value = ''; query.value = ''; detailOpen.value = false
  purchasePage.value = 1; purchaseTotalPages.value = 0; replyNotice.value = ''
  replyOpen.value = false; pickerVisible.value = false; selectedNotice.value = null
  void load(1)
}, { immediate: true })
watch(replyOpen, value => { if (!value) pickerVisible.value = false })
onBeforeUnmount(() => { ++loadSequence })
</script>

<template>
  <section class="message-page" aria-label="交易消息">
    <div class="message-layout" :class="{ 'detail-open': detailOpen }">
      <section ref="listEl" class="reminder-list" aria-label="交易列表">
        <div class="list-heading">
          <div><h2>交易</h2><p>购买请求与交易进度。</p></div>
          <span v-if="unreadCount" class="unread-count" aria-label="待处理请求数量">{{ unreadCount }}</span>
        </div>
        <div class="trade-switch" role="group" aria-label="交易视角">
          <Button type="button" unstyled :class="{ active: activeView === 'buyer' }" :aria-pressed="activeView === 'buyer'" @click="activeView = 'buyer'">
            <ShoppingBag :size="16" aria-hidden="true" />我买的
          </Button>
          <Button type="button" unstyled :class="{ active: activeView === 'seller' }" :aria-pressed="activeView === 'seller'" @click="activeView = 'seller'">
            <PackageCheck :size="16" aria-hidden="true" />我卖的
          </Button>
        </div>
        <div class="list-toolbar">
          <div class="toolbar-heading">
            <label class="search-label" for="reminder-search">{{ activeView === 'buyer' ? '搜索本页订单' : '搜索售卖记录' }}</label>
            <Button type="button" class="read-all" unstyled :disabled="loading" aria-label="刷新交易记录" @click="load()">
              <RefreshCw :size="13" aria-hidden="true" />刷新
            </Button>
          </div>
          <InputText id="reminder-search" v-model="query" class="reminder-search" type="search" :placeholder="activeView === 'buyer' ? '商品名称、订单号或状态' : '搜索商品或买家'" unstyled />
        </div>
        <Message v-if="replyNotice" class="list-feedback" severity="success" :closable="false" size="small">{{ replyNotice }}</Message>
        <div class="reminders" :aria-busy="loading">
          <button v-for="reminder in filteredReminders" :key="reminder.id" type="button" class="reminder" :class="{ active: selectedId === reminder.id, unread: reminder.unread }" :aria-label="`${reminder.unread ? '未读，' : ''}${reminder.title}`" :aria-pressed="selectedId === reminder.id" @click="selectReminder(reminder.id)">
            <span class="reminder-icon"><component :is="reminder.icon" :size="17" aria-hidden="true" /></span><span class="reminder-text"><span class="reminder-heading"><strong>{{ reminder.title }}</strong><time>{{ reminder.time }}</time></span><span class="reminder-snippet">{{ reminder.content }}</span><span class="reminder-type">{{ reminder.type }}</span></span><span v-if="reminder.unread" class="unread-dot" aria-label="未读"></span>
          </button>
        </div>
        <p v-if="loading" class="list-note" role="status">正在加载交易数据…</p>
        <Message v-else-if="issue" class="list-feedback" severity="error" :closable="false" size="small">{{ issue }}</Message>
        <p v-else-if="!filteredReminders.length" class="list-note" role="status">{{ query ? '没有找到相关交易。' : activeView === 'buyer' ? '还没有购买订单，发起购买请求后会出现在这里。' : '还没有售卖记录。' }}</p>
        <nav v-if="activeView === 'buyer' && purchaseTotalPages > 0" class="purchase-pagination" aria-label="购买订单分页">
          <Button type="button" severity="secondary" outlined size="small" :disabled="loading || purchasePage <= 1" aria-label="上一页订单" @click="changePurchasePage(purchasePage - 1)"><ChevronLeft :size="16" aria-hidden="true" /></Button>
          <span aria-live="polite">第 {{ purchasePage }} / {{ purchaseTotalPages }} 页</span>
          <Button type="button" severity="secondary" outlined size="small" :disabled="loading || purchasePage >= purchaseTotalPages" aria-label="下一页订单" @click="changePurchasePage(purchasePage + 1)"><ChevronRight :size="16" aria-hidden="true" /></Button>
        </nav>
      </section>
      <section ref="detailEl" class="reminder-detail" tabindex="-1" aria-label="交易详情">
        <header class="detail-header">
          <Button class="detail-back" type="button" unstyled @click="backToList"><ChevronLeft :size="16" aria-hidden="true" />返回</Button>
          <div class="detail-icon"><component :is="selected.icon" :size="20" aria-hidden="true" /></div>
          <div class="detail-heading"><span class="detail-type">{{ selected.type }}记录</span><h3>{{ selected.title }}</h3></div>
          <time v-if="selected.date">{{ selected.date }}</time>
        </header>
        <article v-if="selected.purchase" class="detail-content purchase-detail">
          <div class="purchase-product">
            <div class="purchase-cover">
              <img v-if="selected.purchase.images?.[0]" :src="resolveAssetUrl(selected.purchase.images[0])" :alt="selected.purchase.title" />
              <ImageOff v-else :size="24" aria-label="暂无商品图片" />
            </div>
            <div class="purchase-product-info">
              <span class="detail-type">历史购买订单</span>
              <h4>{{ selected.title }}</h4>
              <strong class="purchase-price">{{ priceLabel(selected.purchase.price) }}</strong>
            </div>
          </div>
          <div class="purchase-progress">
            <span class="order-status" :class="{ approved: selected.purchase.status === 'approved' }">{{ statusLabel(selected.purchase.status, true) }}</span>
            <p>{{ selected.purchase.status === 'pending' ? '购买请求已发送，请等待卖家处理。' : selected.purchase.status === 'approved' ? '卖家已同意购买请求，交接地点见下方。' : selected.purchase.status === 'rejected' ? '卖家已拒绝本次购买请求。' : selected.purchase.status === 'closed' ? '本次交易请求已关闭。' : '暂时无法识别订单状态，请刷新后重试。' }}</p>
          </div>
          <dl class="order-facts">
            <div><dt>订单号</dt><dd>{{ selected.purchase.request_id }}</dd></div>
            <div><dt>商品编号</dt><dd>#{{ selected.purchase.goods_id }}</dd></div>
            <div><dt>卖家编号</dt><dd>#{{ selected.purchase.seller_id }}</dd></div>
            <div><dt>申请时间</dt><dd>{{ formatDate(selected.purchase.created_at) }}</dd></div>
            <div><dt>处理时间</dt><dd>{{ selected.purchase.handled_at ? formatDate(selected.purchase.handled_at) : '尚未处理' }}</dd></div>
          </dl>
          <div v-if="purchasePosition" class="transaction-position">
            <MapPin :size="18" aria-hidden="true" />
            <div><strong>交易地点</strong><span>经度 {{ purchasePosition[0] }} · 纬度 {{ purchasePosition[1] }}</span></div>
          </div>
        </article>
        <article v-else class="detail-content">
          <div class="detail-mark"><Bell :size="18" aria-hidden="true" /></div>
          <p>{{ selected.content }}</p><small v-if="selected.date">{{ selected.date }}</small>
          <div v-if="selected.notice" class="transaction-actions"><Button type="button" class="ink-button" @click="openReply(selected.notice)"><PackageCheck :size="16" aria-hidden="true" />处理请求</Button></div>
          <div v-else-if="selected.summary?.status === 'approved' && selected.summary.position" class="transaction-position">
            <MapPin :size="18" aria-hidden="true" /><div><strong>交易地点</strong><span>经度 {{ selected.summary.position[0] }} · 纬度 {{ selected.summary.position[1] }}</span></div>
          </div>
        </article>
      </section>
    </div>
    <Dialog v-model:visible="replyOpen" modal header="回复购买请求" class="trade-reply-dialog" :draggable="false" :closable="!actionBusy && !pickerVisible" :close-on-escape="!actionBusy && !pickerVisible" :style="{ width: '36rem', maxWidth: 'calc(100vw - 2rem)' }">
      <form id="trade-reply-form" class="reply-form" @submit.prevent="submitReply('approve')">
        <div class="reply-summary">
          <span class="reply-summary-icon"><ShoppingBag :size="21" aria-hidden="true" /></span>
          <div><span class="reply-eyebrow">待处理的购买请求</span><p><strong>{{ selectedNotice?.account }}</strong> 想购买你的商品</p><span class="reply-goods">商品 #{{ selectedNotice?.goods_id }}</span></div>
        </div>
        <fieldset class="reply-location" :disabled="actionBusy">
          <legend>约定交易地点</legend>
          <p id="trade-location-hint" class="reply-hint">同意购买前选择交接地点，确认后会发送给买家。</p>
          <Button type="button" unstyled class="reply-map-button" aria-haspopup="dialog" :disabled="actionBusy" @click="pickerVisible = true">
            <span class="reply-map-icon"><MapPin :size="21" aria-hidden="true" /></span>
            <span class="reply-map-copy"><strong>{{ pickerPlace?.name || '在地图上选择地点' }}</strong><small>{{ pickerPlace?.address || (tradePosition ? '已保存坐标，点击可重新选点' : '搜索地点或点击地图，自动填写经纬度') }}</small></span>
            <ChevronRight :size="18" aria-hidden="true" />
          </Button>
          <div class="coordinate-fields">
            <div class="reply-field"><label for="trade-lng">经度</label><InputText id="trade-lng" v-model="longitude" inputmode="decimal" fluid placeholder="例如 120.123456" aria-describedby="trade-location-hint trade-coordinate-hint" :invalid="!!replyIssue && !tradePosition" /></div>
            <div class="reply-field"><label for="trade-lat">纬度</label><InputText id="trade-lat" v-model="latitude" inputmode="decimal" fluid placeholder="例如 30.123456" aria-describedby="trade-location-hint trade-coordinate-hint" :invalid="!!replyIssue && !tradePosition" /></div>
          </div>
          <small id="trade-coordinate-hint" class="reply-hint">地图选点后自动回填，也可手动调整。拒绝请求无需填写地点。</small>
        </fieldset>
        <Message v-if="replyIssue" severity="error" :closable="false" size="small">{{ replyIssue }}</Message>
      </form>
      <template #footer>
        <div class="reply-footer">
          <Button type="button" label="暂不处理" severity="secondary" text :disabled="actionBusy || pickerVisible" @click="replyOpen = false" />
          <div class="reply-footer-actions">
            <Button type="button" label="拒绝请求" severity="secondary" outlined :loading="actionBusy && replyAction === 'reject'" :disabled="actionBusy || pickerVisible" @click="submitReply('reject')" />
            <Button type="submit" form="trade-reply-form" class="ink-button" :loading="actionBusy && replyAction === 'approve'" :disabled="actionBusy || pickerVisible"><Check :size="16" aria-hidden="true" />同意并发送地点</Button>
          </div>
        </div>
      </template>
    </Dialog>
    <PlacePicker v-model:visible="pickerVisible" :value="pickerPlace" @select="selectTradePlace" />
  </section>
</template>

<style scoped>
.message-page{display:flex;flex:1;min-height:0;min-width:0;overflow:hidden;background:var(--app-bg);color:var(--app-text);font-family:'Round',system-ui,sans-serif}.message-layout{display:flex;flex:1;min-height:0}.reminder-list{width:360px;flex-shrink:0;background:var(--app-surface);border-right:1px solid var(--app-line);padding:26px 14px;overflow:auto}.list-heading{display:flex;align-items:flex-start;justify-content:space-between;margin:0 10px 20px}.list-heading h2{margin:0;font-family:'Ding',system-ui,sans-serif;font-size:30px;font-weight:400}.list-heading p{margin:6px 0 0;color:var(--app-muted);font-size:11px}.unread-count{display:grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:20px;background:var(--app-text);color:var(--app-bg);font-size:11px}.search-label{display:block;margin:0 10px 6px;color:var(--app-muted);font-size:11px}.reminder-search{width:calc(100% - 20px);margin:0 10px;padding:10px 12px;border:1px solid var(--app-line);border-radius:10px;background:var(--app-field);color:var(--app-text);font:inherit;font-size:12px}.read-all{display:block;margin:9px 10px 0;border:0;background:transparent;color:var(--app-muted);font:inherit;font-size:11px;cursor:pointer}.reminders{display:flex;flex-direction:column;gap:3px;margin-top:14px}.reminder{position:relative;display:flex;align-items:flex-start;gap:11px;width:100%;padding:14px 10px;border:0;border-radius:12px;background:transparent;color:var(--app-text);text-align:left;font:inherit;cursor:pointer}.reminder:hover,.reminder.active{background:var(--app-hover)}.reminder-icon{display:grid;place-items:center;width:36px;height:36px;flex-shrink:0;border-radius:11px;background:var(--app-hover);color:var(--app-muted)}.reminder.active .reminder-icon{background:var(--app-text);color:var(--app-bg)}.reminder-text{display:block;min-width:0;flex:1}.reminder-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px}.reminder-heading strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}.reminder-heading time{flex-shrink:0;color:var(--app-faint);font-size:10px}.reminder-snippet{display:block;margin-top:6px;overflow:hidden;color:var(--app-muted);font-size:11px;line-height:1.55;text-overflow:ellipsis;white-space:nowrap}.reminder-type{display:inline-block;margin-top:7px;color:var(--app-faint);font-size:10px}.unread-dot{width:6px;height:6px;flex-shrink:0;margin-top:5px;border-radius:50%;background:var(--app-text)}.list-note{margin:20px 10px;color:var(--app-faint);font-size:11px;line-height:1.8}.reminder-detail{display:flex;flex:1;min-width:0;flex-direction:column;outline:none}.detail-header{display:flex;align-items:center;gap:12px;padding:24px;border-bottom:1px solid var(--app-line)}.detail-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:var(--app-text);color:var(--app-bg)}.detail-header h3{margin:4px 0 0;font-size:15px;font-weight:500}.detail-type{color:var(--app-muted);font-size:11px}.detail-header>time{margin-left:auto;color:var(--app-faint);font-size:10px}.detail-back{display:none}.detail-content{width:min(560px,calc(100% - 48px));margin:70px auto 0;padding:30px;border:1px solid var(--app-line);border-radius:18px;background:var(--app-field);text-align:center}.detail-mark{display:grid;place-items:center;width:38px;height:38px;margin:0 auto 18px;border:1px solid var(--app-line);border-radius:50%;color:var(--app-muted)}.detail-content p{margin:0;color:var(--app-text);font-size:14px;line-height:1.9}.detail-content small{display:block;margin-top:18px;color:var(--app-faint);font-size:11px}.api-note{display:flex;align-items:center;justify-content:center;gap:6px;margin:18px auto;color:var(--app-faint);font-size:11px}@media(max-width:900px){.reminder-list{width:300px}}@media(max-width:640px){.reminder-list{width:100%;border-right:0}.message-layout .reminder-detail{display:none}.message-layout.detail-open .reminder-list{display:none}.message-layout.detail-open .reminder-detail{display:flex}.detail-back{display:block;padding:8px;border:1px solid var(--app-line);border-radius:8px;background:var(--app-field);color:var(--app-text);font:inherit;font-size:12px}.detail-header{padding:18px}.detail-header>time{display:none}.detail-content{width:calc(100% - 28px);margin:28px auto 0;padding:24px}.api-note{padding:0 16px;text-align:center;line-height:1.6}}button:focus-visible,input:focus-visible{outline:2px solid var(--app-muted);outline-offset:3px}
.trade-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin: 0 10px 22px; padding: 4px; border: 1px solid var(--app-line); border-radius: 12px; background: var(--app-field); }
.trade-switch button { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; border: 0; border-radius: 8px; background: transparent; color: var(--app-muted); font: inherit; font-size: 12px; cursor: pointer; }
.trade-switch button.active { background: var(--app-text); color: var(--app-bg); }
.toolbar-heading { display: flex; align-items: center; justify-content: space-between; margin: 0 10px 8px; }
.toolbar-heading .search-label { margin: 0; }
.toolbar-heading .read-all { display: inline-flex; align-items: center; gap: 5px; margin: 0; padding: 4px; }
.read-all:disabled { opacity: .5; cursor: wait; }
.list-feedback { margin: 16px 10px 0; }
.purchase-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 20px 10px 0; padding-top: 16px; border-top: 1px solid var(--app-line); }
.purchase-pagination span { color: var(--app-muted); font: 12px system-ui, sans-serif; }
.reminder-detail { overflow-y: auto; }
.detail-header { flex-shrink: 0; }
.detail-heading { flex: 1; min-width: 0; }
.detail-heading h3 { overflow-wrap: anywhere; }
.detail-icon { flex-shrink: 0; }
.transaction-actions { margin-top: 24px; }
.transaction-position { display: flex; align-items: flex-start; gap: 12px; margin-top: 24px; padding: 16px; border: 1px solid var(--app-line); border-radius: 12px; background: var(--app-surface); text-align: left; }
.transaction-position > svg { flex-shrink: 0; margin-top: 2px; color: var(--app-muted); }
.transaction-position strong { display: block; font-size: 13px; font-weight: 500; }
.transaction-position span { display: block; margin-top: 6px; color: var(--app-muted); font: 12px/1.7 system-ui, sans-serif; overflow-wrap: anywhere; }
.purchase-detail { margin-top: 32px; margin-bottom: 32px; text-align: left; font-family: system-ui, sans-serif; }
.purchase-product { display: flex; align-items: center; gap: 20px; }
.purchase-cover { display: grid; place-items: center; width: 88px; height: 88px; flex-shrink: 0; overflow: hidden; border: 1px solid var(--app-line); border-radius: 12px; background: var(--app-hover); color: var(--app-faint); }
.purchase-cover img { width: 100%; height: 100%; object-fit: cover; }
.purchase-product-info { min-width: 0; }
.purchase-product h4 { margin: 6px 0 10px; font-size: 16px; line-height: 1.5; font-weight: 550; overflow-wrap: anywhere; }
.purchase-price { font-size: 21px; font-weight: 600; }
.purchase-progress { margin-top: 24px; padding: 20px 0; border-top: 1px solid var(--app-line); border-bottom: 1px solid var(--app-line); }
.order-status { display: inline-flex; align-items: center; padding: 5px 10px; border: 1px solid var(--app-line); border-radius: 6px; background: var(--app-hover); color: var(--app-muted); font-size: 12px; }
.order-status.approved { border-color: var(--app-text); background: var(--app-text); color: var(--app-bg); }
.purchase-detail .purchase-progress p { margin-top: 12px; color: var(--app-muted); font-size: 12px; line-height: 1.8; }
.order-facts { display: flex; flex-direction: column; gap: 16px; margin: 24px 0 0; font-size: 12px; line-height: 1.7; }
.order-facts > div { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 16px; }
.order-facts dt { color: var(--app-muted); }
.order-facts dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
.reply-form { display: flex; flex-direction: column; gap: 24px; padding: 4px 0 8px; color: var(--app-text); font: 14px/1.6 system-ui, sans-serif; }
.reply-summary { display: flex; align-items: flex-start; gap: 14px; padding: 18px; border: 1px solid var(--app-line); border-radius: 12px; background: var(--app-field); }
.reply-summary-icon { display: grid; place-items: center; width: 42px; height: 42px; flex-shrink: 0; border-radius: 10px; background: var(--app-hover); }
.reply-summary > div { min-width: 0; }
.reply-eyebrow, .reply-goods { color: var(--app-muted); font-size: 12px; }
.reply-summary p { margin: 6px 0; overflow-wrap: anywhere; }
.reply-summary strong { font-weight: 600; }
.reply-location { display: flex; flex-direction: column; gap: 16px; min-width: 0; margin: 0; padding: 0; border: 0; }
.reply-location legend { margin-bottom: 8px; padding: 0; font-size: 14px; font-weight: 600; }
.reply-hint { margin: 0; color: var(--app-muted); font-size: 12px; line-height: 1.7; }
.reply-map-button { display: flex; align-items: center; gap: 12px; width: 100%; padding: 16px; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-field); color: var(--app-text); text-align: left; font: inherit; cursor: pointer; }
.reply-map-button:hover { border-color: var(--app-muted); background: var(--app-hover); }
.reply-map-icon { display: grid; place-items: center; width: 38px; height: 38px; flex-shrink: 0; border-radius: 10px; background: var(--app-hover); }
.reply-map-copy { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.reply-map-copy strong { display: block; font-size: 13px; font-weight: 550; }
.reply-map-copy small { display: block; margin-top: 5px; color: var(--app-muted); font-size: 11px; line-height: 1.7; }
.reply-map-button > svg { flex-shrink: 0; color: var(--app-muted); }
.reply-map-button:disabled { opacity: .6; cursor: wait; }
.coordinate-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.reply-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.reply-field label { font-size: 12px; font-weight: 500; }
.reply-field input { width: 100%; min-width: 0; min-height: 44px; font: 13px system-ui, sans-serif; }
.reply-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; }
.reply-footer-actions { display: flex; align-items: center; gap: 10px; }
.reply-footer :deep(button) { min-height: 42px; font-size: 13px; white-space: nowrap; }
:global(.trade-reply-dialog) { font-family: system-ui, sans-serif; }
:global(.trade-reply-dialog .p-dialog-header) { padding: 24px 24px 20px; }
:global(.trade-reply-dialog .p-dialog-content) { padding: 0 24px 24px; }
:global(.trade-reply-dialog .p-dialog-footer) { padding: 18px 24px; border-top: 1px solid var(--app-line); }
@media (max-width: 640px) {
  .detail-back { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; }
  .purchase-detail { margin-top: 24px; padding: 20px; }
  .purchase-product { gap: 14px; }
  .purchase-cover { width: 72px; height: 72px; }
  .purchase-product h4 { font-size: 14px; }
  .order-facts > div { gap: 10px; }
}
@media (max-width: 480px) {
  .coordinate-fields { grid-template-columns: 1fr; gap: 14px; }
  .reply-summary { padding: 14px; }
  .reply-map-button { padding: 14px; }
  .reply-footer { flex-direction: column-reverse; align-items: stretch; gap: 12px; }
  .reply-footer-actions { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr); gap: 8px; }
  :global(.trade-reply-dialog .p-dialog-header) { padding: 20px 18px 16px; }
  :global(.trade-reply-dialog .p-dialog-content) { padding: 0 18px 20px; }
  :global(.trade-reply-dialog .p-dialog-footer) { padding: 16px 18px max(16px, env(safe-area-inset-bottom)); }
}
</style>
