<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import { MapPin, ImageOff, Flag, Pencil, ShoppingCart, Store } from 'lucide-vue-next'
import { priceLabel, type MarketItem } from '@/data/market'
import Star from '@primeicons/vue/star'
import StarFill from '@primeicons/vue/star-fill'
import { reportGoods, authState, isLoggedIn, currentUserId, canDeleteGoods, deleteGoods, getFavorites, setFavorite, requestPurchase, getSellResult, closeSale } from '@/api/client'
const props = withDefaults(defineProps<{ item: MarketItem | null; showMap?: boolean }>(), { showMap: true })
const emit = defineEmits<{ close: []; map: [item: MarketItem]; edit: [item: MarketItem] }>()
const activeImageIndex = ref(0)
const actionIssue = ref(''), actionNotice = ref('')
const deleting = ref(false), favoriteBusy = ref(false), favoriteReady = ref(false), favorited = ref(false), purchaseBusy = ref(false), saleBusy = ref(false)
const purchaseIssue = ref(''), purchaseNotice = ref(''), purchaseStatus = ref<string | null>(null)
const canDelete = computed(() => !!props.item && !props.item.isExample && canDeleteGoods(props.item.userId))
const ownPost = computed(() => currentUserId.value !== null && String(currentUserId.value) === String(props.item?.userId))
let favoriteLoad = 0
watch([() => props.item?.id, () => authState.token, isLoggedIn], async () => {
  const version = ++favoriteLoad
  actionIssue.value = ''; actionNotice.value = ''; favorited.value = false; favoriteReady.value = false
  if (!props.item || !isLoggedIn.value || props.item.isExample || ownPost.value) return
  try {
    const items = await getFavorites()
    if (version !== favoriteLoad) return
    favorited.value = items.some(item => String(item.id) === props.item?.id)
    favoriteReady.value = true
  } catch (error) {
    if (version === favoriteLoad) actionIssue.value = error instanceof Error ? error.message : '收藏状态加载失败，请重新打开详情。'
  }
}, { immediate: true })
watch(() => props.item?.id, async () => {
  purchaseIssue.value = ''; purchaseNotice.value = ''; purchaseStatus.value = null
  if (!props.item || !isLoggedIn.value || props.item.isExample || ownPost.value) return
  try {
    const result = await getSellResult(props.item.id)
    if (props.item) purchaseStatus.value = result.status
  } catch { /* 404 表示尚未发起购买请求 */ }
}, { immediate: true })
async function buyPost() {
  if (!props.item || purchaseBusy.value || purchaseStatus.value === 'pending' || props.item.saleClosed) return
  purchaseBusy.value = true; purchaseIssue.value = ''; purchaseNotice.value = ''
  try {
    const result = await requestPurchase(props.item.id)
    purchaseNotice.value = result.message || '购买请求已发送'
    purchaseStatus.value = 'pending'
  } catch (error) { purchaseIssue.value = error instanceof Error ? error.message : '购买请求发送失败。' }
  finally { purchaseBusy.value = false }
}
async function stopSale() {
  if (!props.item || saleBusy.value || props.item.saleClosed || !window.confirm('关闭售卖后将不能再接受新的购买请求，确定继续吗？')) return
  saleBusy.value = true; purchaseIssue.value = ''; purchaseNotice.value = ''
  try { await closeSale(props.item.id); purchaseNotice.value = '已关闭售卖'; window.dispatchEvent(new Event('market:goods-updated')) }
  catch (error) { purchaseIssue.value = error instanceof Error ? error.message : '关闭售卖失败。' }
  finally { saleBusy.value = false }
}
async function toggleFavorite() {
  if (!props.item || favoriteBusy.value || !favoriteReady.value) return
  const id = props.item.id, token = authState.token, next = !favorited.value
  favoriteBusy.value = true; actionIssue.value = ''; actionNotice.value = ''
  try {
    const message = await setFavorite(id, next)
    if (token !== authState.token) return
    if (props.item?.id === id) { favorited.value = next; actionNotice.value = message }
    window.dispatchEvent(new Event('market:favorites-updated'))
  } catch (error) { actionIssue.value = error instanceof Error ? error.message : '收藏操作失败。' }
  finally { favoriteBusy.value = false }
}
async function removePost() {
  if (!props.item || !canDelete.value || deleting.value || !window.confirm('确定删除这个帖子吗？')) return
  const id = props.item.id
  deleting.value = true; actionIssue.value = ''
  try {
    await deleteGoods(id)
    window.dispatchEvent(new Event('market:goods-updated'))
    if (props.item?.id === id) emit('close')
  } catch (error) { actionIssue.value = error instanceof Error ? error.message : '删除失败。' }
  finally { deleting.value = false }
}
const reportId = useId()
const reportOpen = ref(false), reportReason = ref(''), reportIssue = ref('')
const reportSubmitting = ref(false)
const reportResult = ref('')
const images = computed(() => props.item?.images ?? [])
const activeImage = computed(() => images.value[activeImageIndex.value])
const statusLabels = { pending: '待审核', approved: '已通过', rejected: '已拒绝', deleted: '已下架' }
watch(() => props.item?.id, () => {
  activeImageIndex.value = 0
  reportOpen.value = false
  reportReason.value = ''
  reportIssue.value = ''
  reportResult.value = ''
})
watch(reportReason, () => {
  reportIssue.value = ''
  if (reportReason.value) reportResult.value = ''
})
async function submitReport() {
  reportIssue.value = ''
  reportResult.value = ''
  const reason = reportReason.value.trim()
  if (!reason) reportIssue.value = '请填写举报原因。'
  else if (reportReason.value.length > 500) reportIssue.value = '举报原因最多 500 个字符。'
  if (reportIssue.value || !props.item) return
  reportSubmitting.value = true
  try {
    const message = await reportGoods(props.item.id, reason)
    reportReason.value = ''
    reportResult.value = message
  } catch (error) {
    reportIssue.value = error instanceof Error ? error.message : '举报提交失败，请稍后重试。'
  } finally {
    reportSubmitting.value = false
  }
}
function formatDate(value?: string) {
  if (!value) return '未提供发布时间'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })
}
const visible = computed({
  get: () => !!props.item,               // !!：把对象/null 转成 true/false
  set: value => { if (!value) emit('close') },
})
</script>
<template>

  <Dialog v-model:visible="visible" modal :draggable="false" :closable="!reportSubmitting && !deleting && !favoriteBusy" class="market-detail-dialog" :header="'商品详情'" :style="{ width: '42rem', maxWidth: 'calc(100vw - 2rem)' }">
    <article v-if="item" class="market-detail">
      <img v-if="activeImage" class="detail-image" :src="activeImage" :alt="item.title + '，第 ' + (activeImageIndex + 1) + ' 张图片'" decoding="async">
      <div v-else class="detail-missing"><ImageOff :size="30" aria-hidden="true" /><span>暂无实拍图片</span></div>
      <div v-if="images.length > 1" class="detail-gallery" aria-label="选择商品图片">
        <Button v-for="(url, index) in images" :key="index" unstyled class="detail-thumbnail" :class="{ active: activeImageIndex === index }" :aria-label="'查看第 ' + (index + 1) + ' 张图片'" :aria-pressed="activeImageIndex === index" @click="activeImageIndex = index">
          <img :src="url" alt="" loading="lazy" decoding="async">
        </Button>
      </div>
      <div class="detail-heading"><h2>{{ item.title }}</h2><strong>{{ priceLabel(item.price) }}</strong></div>
      <p class="detail-author">{{ item.author }} · {{ item.category }}</p>
      <div class="detail-meta"><span>商品 #{{ item.id }}</span><span>{{ statusLabels[item.status] }}</span><time>{{ formatDate(item.createdAt) }}</time></div>
      <p class="detail-description">{{ item.description }}</p>
      <div v-if="item.place" class="detail-location"><MapPin :size="18" aria-hidden="true" /><div><small>{{ item.locationSource === 'example' ? '本地示例交接地点' : '交接地点' }}</small><p>{{ item.place }}</p></div></div>
      <Message v-if="item.isExample" severity="secondary" :closable="false" size="small">当前为本地 API 数据示例，不代表真实在售商品。</Message>
      <Message v-if="actionIssue" severity="error" :closable="false">{{ actionIssue }}</Message>
      <Message v-if="actionNotice" severity="success" :closable="false">{{ actionNotice }}</Message>
      <Message v-if="purchaseIssue" severity="error" :closable="false">{{ purchaseIssue }}</Message>
      <Message v-if="purchaseNotice" severity="success" :closable="false">{{ purchaseNotice }}</Message>
      <div class="detail-actions">
        <Button v-if="isLoggedIn && !ownPost && !item.isExample" class="ink-button" :disabled="purchaseBusy || ['pending','approved'].includes(purchaseStatus || '') || item.saleClosed" :loading="purchaseBusy" @click="buyPost"><ShoppingCart :size="16" aria-hidden="true" />{{ item.saleClosed ? '已关闭售卖' : purchaseStatus === 'approved' ? '交易已同意' : purchaseStatus === 'rejected' ? '重新发起购买' : purchaseStatus === 'closed' ? '交易已关闭' : purchaseStatus === 'pending' ? '等待卖家处理' : '发起购买请求' }}</Button>
        <Button v-if="ownPost && !item.isExample && !item.saleClosed" severity="secondary" outlined :loading="saleBusy" :disabled="saleBusy" @click="stopSale"><Store :size="16" aria-hidden="true" />关闭售卖</Button>
        <Button v-if="isLoggedIn && !ownPost && !item.isExample" severity="secondary" outlined :loading="favoriteBusy" :disabled="!favoriteReady || favoriteBusy || deleting" :aria-pressed="favorited" @click="toggleFavorite"><component :is="favorited ? StarFill : Star" aria-hidden="true" />{{ favorited ? '取消收藏' : '收藏' }}</Button>
        <Button v-if="canDelete" severity="danger" outlined :loading="deleting" :disabled="deleting || favoriteBusy" @click="removePost">删除帖子</Button>
        <Button v-if="ownPost && !item.isExample" severity="secondary" outlined :disabled="deleting || favoriteBusy" @click="emit('edit', item)"><Pencil :size="16" aria-hidden="true" />编辑帖子</Button>
        <Button v-if="showMap && item.position" class="ink-button" @click="emit('map', item)"><MapPin :size="16" aria-hidden="true" />在地图查看</Button>
        <Button severity="secondary" text class="detail-report-button" :aria-expanded="reportOpen" :aria-controls="reportId + '-form'" @click="reportOpen = !reportOpen"><Flag :size="16" aria-hidden="true" />举报商品</Button>
      </div>
      <Transition name="report-reveal">
        <form v-if="reportOpen" :id="reportId + '-form'" class="report-form" novalidate @submit.prevent="submitReport">
          <div class="report-field-heading"><label :for="reportId + '-reason'">举报原因</label><span>{{ reportReason.length }} / 500</span></div>
          <Textarea :id="reportId + '-reason'" v-model="reportReason" rows="3" maxlength="500" required fluid :invalid="!!reportIssue" :aria-invalid="!!reportIssue" :aria-describedby="reportId + '-hint' + (reportIssue ? ' ' + reportId + '-error' : '')" placeholder="请说明商品存在的问题，例如图片与描述不符、重复发布等。" />
          <p :id="reportId + '-hint'" class="report-hint">举报原因会提交给管理员审核，最多 500 个字符。</p>
          <Message v-if="reportIssue" :id="reportId + '-error'" severity="error" :closable="false" size="small" role="alert">{{ reportIssue }}</Message>
          <Message v-if="reportResult" severity="success" :closable="false" size="small" role="status">{{ reportResult }}</Message>
          <div class="report-form-actions"><Button label="取消" severity="secondary" text :disabled="reportSubmitting" @click="reportOpen = false" /><Button type="submit" label="提交举报" severity="secondary" outlined :loading="reportSubmitting" :disabled="reportSubmitting" /></div>
        </form>
      </Transition>
    </article>
  </Dialog>
</template>
<style scoped>
.market-detail{display:flex;flex-direction:column;gap:18px;font:14px/1.65 system-ui,sans-serif;color:var(--app-text)}
.detail-image{display:block;align-self:center;width:auto;max-width:100%;height:auto;max-height:min(420px,60vh);object-fit:contain;background:transparent;border-radius:10px}
.detail-gallery{display:flex;gap:8px;overflow-x:auto;padding:3px;scrollbar-width:thin}
.detail-thumbnail{display:grid;place-items:center;flex:none;width:62px;height:62px;padding:0;border:1px solid var(--app-border);border-radius:8px;overflow:hidden;background:var(--app-hover);color:var(--app-muted);cursor:pointer}
.detail-thumbnail.active{border:2px solid var(--app-text)}
.detail-thumbnail:focus-visible{outline:2px solid var(--app-text);outline-offset:2px}
.detail-thumbnail img{width:100%;height:100%;object-fit:cover}
.detail-meta{display:flex;flex-wrap:wrap;gap:6px 14px;color:var(--app-muted);font-size:11px}
.detail-missing{min-height:180px;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;background:var(--app-hover);border-radius:10px;color:var(--app-muted)}
.detail-heading{display:flex;gap:16px;justify-content:space-between;align-items:baseline}
.detail-heading h2{margin:0;font-size:20px;font-weight:600;min-width:0;overflow-wrap:anywhere}
.detail-heading strong{font-size:24px;white-space:nowrap;font-variant-numeric:tabular-nums} /* 价格不换行、等宽数字 */
.detail-author{margin:0;color:var(--app-muted);font-size:12px}
.detail-description{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.detail-location{display:flex;gap:10px;align-items:center;padding:14px;background:var(--app-hover);border-radius:8px}
.detail-location p{margin:2px 0 0}
.detail-location small{color:var(--app-muted)}
.detail-actions{display:flex;align-items:center;flex-wrap:wrap;gap:10px}
.detail-report-button{margin-left:auto}
.report-form{display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid var(--app-border);border-radius:10px}
.report-field-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
.report-field-heading label{font-size:13px;font-weight:550}
.report-field-heading span,.report-hint,.report-preview small{color:var(--app-muted);font-size:11px}
.report-hint{margin:0}
.report-preview{padding:12px;border:1px solid var(--app-border);border-radius:8px}
.report-preview strong{font-size:12px;font-weight:550}
.report-preview p{margin:8px 0;white-space:pre-wrap;overflow-wrap:anywhere}
.report-form-actions{display:flex;justify-content:flex-end;gap:8px}
.report-reveal-enter-active,.report-reveal-leave-active{transition:opacity .18s ease,transform .18s ease}
.report-reveal-enter-from,.report-reveal-leave-to{opacity:0;transform:translateY(-5px)}
@media(max-width:480px){.detail-heading{flex-wrap:wrap;gap:6px}.detail-image{max-height:320px}}
@media(prefers-reduced-motion:reduce){.report-reveal-enter-active,.report-reveal-leave-active{transition:none}.report-reveal-enter-from,.report-reveal-leave-to{transform:none}}
</style>
