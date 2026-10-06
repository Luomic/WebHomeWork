<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { Check, FileWarning, ImageOff, RefreshCw, Search, X } from 'lucide-vue-next'
import type { GoodsList } from '@/types/goods/Goods'
import type { GoodsReport } from '@/types/admin/review'
import { canDeleteGoods, deleteGoods, auditGoods, getAdminReports, getPendingGoods, handleReport, resolveAssetUrl } from '@/api/client'

const route = useRoute()
const goodsQuery = ref('')
const reportsQuery = ref('')
const goodsNotice = ref('')
const reportsNotice = ref('')
const loading = ref(false)
const loadError = ref('')
const busyGoods = ref<number | null>(null)
const busyReports = ref<number | null>(null)
const pendingGoods = ref<GoodsList<string[]>[]>([])
const pendingReports = ref<GoodsReport[]>([])
const selectedGoods = ref<GoodsList<string[]> | null>(null)
const goodsDetailVisible = computed({
  get: () => selectedGoods.value !== null,
  set: visible => { if (!visible) selectedGoods.value = null },
})

function creationTime(value?: string) {
  const time = value ? new Date(value).valueOf() : Number.NaN
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

const allPendingGoods = computed(() => pendingGoods.value
  .filter(item => item.status === 'pending')
  .sort((a, b) => creationTime(a.created_at) - creationTime(b.created_at) || a.id - b.id))
const allPendingReports = computed(() => pendingReports.value
  .filter(item => item.status === 'pending')
  .sort((a, b) => creationTime(a.created_at) - creationTime(b.created_at) || a.id - b.id))
const pendingGoodsList = computed(() => {
  const query = goodsQuery.value.trim().toLocaleLowerCase()
  return allPendingGoods.value.filter(item => !query || [
    item.id, item.title, item.description, item.category, item.user_id,
  ].join(' ').toLocaleLowerCase().includes(query))
})
const pendingReportList = computed(() => {
  const query = reportsQuery.value.trim().toLocaleLowerCase()
  return allPendingReports.value.filter(item => !query || [
    item.id, item.reason, item.post_id, item.user_id,
  ].join(' ').toLocaleLowerCase().includes(query))
})

function formatDate(value?: string | null) {
  if (!value) return '未提供'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date)
}

function priceLabel(value: number) {
  return `¥${value}`
}

async function removeGoods(item: GoodsList<string[]>) {
  if (busyGoods.value !== null || !canDeleteGoods(item.user_id) || !window.confirm('确定删除这个帖子吗？')) return
  busyGoods.value = item.id; goodsNotice.value = ''
  try {
    await deleteGoods(item.id)
    pendingGoods.value = pendingGoods.value.filter(goods => goods.id !== item.id)
    if (selectedGoods.value?.id === item.id) selectedGoods.value = null
    goodsNotice.value = '删除成功。'
    window.dispatchEvent(new Event('market:goods-updated'))
  } catch (error) { goodsNotice.value = error instanceof Error ? error.message : '删除失败。' }
  finally { busyGoods.value = null }
}

async function reviewGoods(item: GoodsList<string[]>, action: 'approve' | 'reject') {
  const label = action === 'approve' ? '通过' : '驳回'
  if (busyGoods.value !== null) return
  busyGoods.value = item.id
  console.log("#####################"+JSON.stringify(item))
  goodsNotice.value = ''
  try {
    const message = await auditGoods(item.id, action)
    pendingGoods.value = pendingGoods.value.filter(goods => goods.id !== item.id)
    goodsNotice.value = message || `商品 #${item.id}已${label}。`
  } catch (error) {
    goodsNotice.value = error instanceof Error ? error.message : `商品 #${item.id}审核失败。`
  } finally {
    busyGoods.value = null
  }
}

async function reviewReport(item: GoodsReport, action: 'valid' | 'invalid') {
  const label = action === 'valid' ? '举报成立' : '举报无效'
  if (busyReports.value !== null) return
  busyReports.value = item.id
  reportsNotice.value = ''
  try {
    const message = await handleReport(item.id, action)
    pendingReports.value = pendingReports.value.filter(report => report.id !== item.id)
    reportsNotice.value = message || `举报 #${item.id}已处理为“${label}”。`
  } catch (error) {
    reportsNotice.value = error instanceof Error ? error.message : `举报 #${item.id}处理失败。`
  } finally {
    busyReports.value = null
  }
}

async function loadAdminData() {
  loading.value = true
  loadError.value = ''
  try {
    const [goods, reports] = await Promise.all([
      getPendingGoods(),
      getAdminReports(),
    ])
    pendingGoods.value = goods.map(item => ({
      ...item,
      images: item.images?.map(resolveAssetUrl) || [],
    }))
    pendingReports.value = reports
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '管理员数据加载失败。'
  } finally {
    loading.value = false
  }
}

function scrollToHash() {
  const id = route.hash.replace(/^#/, '')
  if (id) {
    nextTick(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
}

onMounted(() => {
  void loadAdminData()
  scrollToHash()
})
watch(() => route.hash, scrollToHash)
</script>

<template>
  <main class="admin-page" aria-label="管理员面板">
    <div class="admin-container">
      <header class="admin-heading">
        <div>
          <p class="page-context">内容管理</p>
          <h1>管理员面板</h1>
          <p class="heading-note">待审核商品与举报按提交时间从早到晚显示。</p>
        </div>
        <div class="pending-summary">
          <strong>{{ allPendingGoods.length + allPendingReports.length }}</strong>
          <span>项待处理</span>
        </div>
      </header>

      <Message v-if="loading" severity="secondary" :closable="false" size="small" class="load-notice" role="status">
        正在加载管理员数据…
      </Message>
      <div v-else-if="loadError" class="load-error" role="alert">
        <Message severity="error" :closable="false" size="small">{{ loadError }}</Message>
        <Button severity="secondary" outlined size="small" :disabled="loading" @click="loadAdminData">
          <RefreshCw :size="14" aria-hidden="true" />重试
        </Button>
      </div>

      <section id="pending-goods" class="admin-module" aria-labelledby="goods-heading">
        <div class="module-heading">
          <div>
            <span class="module-kicker">商品审核</span>
            <h2 id="goods-heading">待审核的商品列表</h2>
          </div>
          <span class="module-count">共 {{ allPendingGoods.length }} 条待审核</span>
        </div>

        <label class="admin-search">
          <Search :size="16" aria-hidden="true" />
          <InputText
            v-model="goodsQuery"
            placeholder="搜索商品编号、标题、分类或用户"
            aria-label="搜索待审核商品"
          />
        </label>
        <p v-if="goodsQuery.trim()" class="search-count">匹配 {{ pendingGoodsList.length }} 条</p>
        <Message v-if="goodsNotice" severity="secondary" :closable="false" size="small" class="action-notice" aria-live="polite">
          {{ goodsNotice }}
        </Message>

        <div v-if="!loading && !loadError && pendingGoodsList.length" class="goods-review-list">
          <article v-for="item in pendingGoodsList" :key="item.id" class="goods-review-card">
            <button
              type="button"
              class="goods-review-image"
              :aria-label="`查看${item.title}的完整信息和图片`"
              @click="selectedGoods = item"
            >
              <img v-if="item.images?.[0]" :src="item.images[0]" :alt="item.title" loading="lazy">
              <ImageOff v-else :size="24" aria-hidden="true" />
              <span v-if="item.images?.length" class="image-count">{{ item.images.length }} 张</span>
            </button>

            <div class="goods-review-copy">
              <div class="review-title-row">
                <h3>{{ item.title }}</h3>
                <span class="status-pill">待审核</span>
              </div>
              <p class="description-preview">{{ item.description || '暂无描述' }}</p>
              <dl class="record-fields">
                <div><dt>商品编号</dt><dd>#{{ item.id }}</dd></div>
                <div><dt>分类</dt><dd>{{ item.category || '未分类' }}</dd></div>
                <div><dt>价格</dt><dd>{{ priceLabel(item.price) }}</dd></div>
                <div><dt>发布者</dt><dd>用户 {{ item.user_id ?? '未提供' }}</dd></div>
                <div><dt>提交时间</dt><dd>{{ formatDate(item.created_at) }}</dd></div>
              </dl>
              <Button
                label="查看完整信息与图片"
                severity="secondary"
                text
                size="small"
                class="details-button"
                @click="selectedGoods = item"
              />
            </div>

            <div class="review-actions">
              <Button class="approve-button" size="small" :loading="busyGoods === item.id" :disabled="busyGoods !== null" @click="reviewGoods(item, 'approve')">
                <Check :size="15" aria-hidden="true" />通过
              </Button>
              <Button severity="secondary" outlined size="small" :loading="busyGoods === item.id" :disabled="busyGoods !== null" @click="reviewGoods(item, 'reject')">
                <X :size="15" aria-hidden="true" />驳回
              </Button>
              <Button v-if="canDeleteGoods(item.user_id)" severity="danger" outlined size="small" :disabled="busyGoods !== null" @click="removeGoods(item)">删除帖子</Button>
            </div>
          </article>
        </div>
        <div v-else-if="!loading && !loadError" class="admin-empty">
          <Check :size="24" aria-hidden="true" />
          <p>{{ goodsQuery.trim() ? '没有匹配的待审核商品。' : '暂无待审核商品。' }}</p>
        </div>
      </section>

      <section id="pending-reports" class="admin-module" aria-labelledby="reports-heading">
        <div class="module-heading">
          <div>
            <span class="module-kicker">举报处理</span>
            <h2 id="reports-heading">待审核的举报商品列表</h2>
          </div>
          <span class="module-count">共 {{ allPendingReports.length }} 条待处理</span>
        </div>

        <label class="admin-search">
          <Search :size="16" aria-hidden="true" />
          <InputText
            v-model="reportsQuery"
            placeholder="搜索举报编号、原因、商品或用户"
            aria-label="搜索待审核举报"
          />
        </label>
        <p v-if="reportsQuery.trim()" class="search-count">匹配 {{ pendingReportList.length }} 条</p>
        <Message v-if="reportsNotice" severity="secondary" :closable="false" size="small" class="action-notice" aria-live="polite">
          {{ reportsNotice }}
        </Message>
        <p class="report-effect-note">举报成立后，服务端会下架对应商品，发布者经验 −5，举报人经验 +5。</p>

        <div v-if="!loading && !loadError && pendingReportList.length" class="report-list">
          <article v-for="report in pendingReportList" :key="report.id" class="report-card">
            <div class="report-icon"><FileWarning :size="20" aria-hidden="true" /></div>
            <div class="report-copy">
              <div class="review-title-row">
                <h3>举报 #{{ report.id }}</h3>
                <span class="status-pill">待处理</span>
              </div>
              <p class="report-reason">{{ report.reason || '未提供举报原因' }}</p>
              <dl class="record-fields">
                <div><dt>商品编号</dt><dd>#{{ report.post_id }}</dd></div>
                <div><dt>举报人</dt><dd>用户 {{ report.user_id }}</dd></div>
                <div><dt>提交时间</dt><dd>{{ formatDate(report.created_at) }}</dd></div>
              </dl>
            </div>
            <div class="review-actions">
              <Button class="approve-button" size="small" :loading="busyReports === report.id" :disabled="busyReports !== null" @click="reviewReport(report, 'valid')">
                <Check :size="15" aria-hidden="true" />举报成立
              </Button>
              <Button severity="secondary" outlined size="small" :loading="busyReports === report.id" :disabled="busyReports !== null" @click="reviewReport(report, 'invalid')">
                <X :size="15" aria-hidden="true" />举报无效
              </Button>
            </div>
          </article>
        </div>
        <div v-else-if="!loading && !loadError" class="admin-empty">
          <Check :size="24" aria-hidden="true" />
          <p>{{ reportsQuery.trim() ? '没有匹配的待审核举报。' : '暂无待审核举报。' }}</p>
        </div>
      </section>
    </div>
  </main>

  <Dialog
    v-model:visible="goodsDetailVisible"
    modal
    :draggable="false"
    header="审核商品详情"
    :style="{ width: '44rem', maxWidth: 'calc(100vw - 2rem)' }"
  >
    <article v-if="selectedGoods" class="goods-detail">
      <div class="detail-heading">
        <h2>{{ selectedGoods.title }}</h2>
        <strong>{{ priceLabel(selectedGoods.price) }}</strong>
      </div>
      <dl class="detail-fields">
        <div><dt>商品编号</dt><dd>#{{ selectedGoods.id }}</dd></div>
        <div><dt>发布者</dt><dd>用户 {{ selectedGoods.user_id ?? '未提供' }}</dd></div>
        <div><dt>分类</dt><dd>{{ selectedGoods.category || '未分类' }}</dd></div>
        <div><dt>状态</dt><dd>待审核</dd></div>
        <div><dt>创建时间</dt><dd>{{ formatDate(selectedGoods.created_at) }}</dd></div>
        <div><dt>更新时间</dt><dd>{{ formatDate(selectedGoods.updated_at) }}</dd></div>
        <div><dt>删除时间</dt><dd>{{ selectedGoods.deleted_at ? formatDate(selectedGoods.deleted_at) : '未删除' }}</dd></div>
      </dl>

      <section class="detail-section" aria-label="商品完整描述">
        <h3>商品描述</h3>
        <p class="detail-description">{{ selectedGoods.description || '暂无描述' }}</p>
      </section>

      <section class="detail-section" aria-label="商品全部图片">
        <h3>商品图片 · {{ selectedGoods.images?.length ?? 0 }} 张</h3>
        <div v-if="selectedGoods.images?.length" class="detail-images">
          <figure v-for="(url, index) in selectedGoods.images" :key="`${selectedGoods.id}-${index}`">
            <img :src="url" :alt="`${selectedGoods.title}，第 ${index + 1} 张图片`" loading="lazy">
            <figcaption>第 {{ index + 1 }} 张</figcaption>
          </figure>
        </div>
        <div v-else class="detail-missing">
          <ImageOff :size="24" aria-hidden="true" /><span>暂无商品图片</span>
        </div>
      </section>
    </article>
    <template #footer>
      <Button label="关闭" severity="secondary" outlined @click="goodsDetailVisible = false" />
    </template>
  </Dialog>
</template>

<style scoped>
.admin-page {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--app-bg);
  color: var(--app-text);
  font: 14px/1.5 system-ui, sans-serif;
}

.admin-container {
  width: min(1080px, 100%);
  margin: 0 auto;
  padding: 32px clamp(16px, 4vw, 46px) 48px;
}

.admin-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 22px;
}

.page-context,
.module-kicker {
  margin: 0;
  color: var(--app-muted);
  font-size: 11px;
}

.admin-heading h1 {
  margin: 5px 0 8px;
  font-size: 28px;
  font-weight: 650;
  letter-spacing: -.5px;
}

.heading-note,
.search-count,
.report-effect-note {
  margin: 0;
  color: var(--app-muted);
  font-size: 12px;
}

.pending-summary {
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 10px 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  white-space: nowrap;
}

.pending-summary strong {
  font-size: 22px;
}
.pending-summary span {
  color: var(--app-muted);
  font-size: 11px;
}

.load-notice {
  margin: 0 0 16px;
}

.load-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.load-error :deep(.p-message) {
  flex: 1;
  margin: 0;
}

.admin-module {
  scroll-margin-top: 20px;
  margin-top: 18px;
  padding: 22px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-surface);
}

.module-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.module-heading h2 {
  margin: 4px 0 0;
  font-size: 18px;
  font-weight: 600;
}
.module-count {
  flex: none;
  color: var(--app-muted);
  font-size: 11px;
}

.admin-search {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.admin-search > svg {
  position: absolute;
  left: 12px;
  color: var(--app-muted);
  pointer-events: none;
}

.admin-search :deep(input) {
  width: 100%;
  padding-left: 36px;
  background: var(--app-field);
  border-color: var(--app-border);
}

.search-count,
.action-notice,
.report-effect-note {
  margin-bottom: 14px;
}

.goods-review-list,
.report-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.goods-review-card,
.report-card {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-field);
}

.goods-review-image {
  position: relative;
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 9px;
  background: var(--app-hover);
  color: var(--app-muted);
  cursor: pointer;
}

.goods-review-image:focus-visible {
  outline: 2px solid var(--app-text);
  outline-offset: 3px;
}
.goods-review-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-count {
  position: absolute;
  right: 4px;
  bottom: 4px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--app-surface);
  color: var(--app-text);
  font-size: 10px;
}

.goods-review-copy,
.report-copy {
  min-width: 0;
}

.review-title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}
.review-title-row h3 {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 550;
}

.status-pill {
  flex: none;
  padding: 2px 7px;
  border-radius: 20px;
  background: var(--app-hover);
  color: var(--app-muted);
  font-size: 10px;
}

.description-preview,
.report-reason {
  margin: 7px 0;
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.description-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.record-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 0;
}
.record-fields div {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 11px;
}
.record-fields dt {
  color: var(--app-faint);
}
.record-fields dd {
  margin: 0;
  color: var(--app-muted);
  overflow-wrap: anywhere;
}
.details-button {
  margin-top: 8px;
  padding: 3px 0;
  font-size: 11px;
}

.review-actions {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 88px;
}
.review-actions :deep(button) {
  justify-content: center;
}
.approve-button {
  background: var(--app-text);
  border-color: var(--app-text);
  color: var(--app-bg);
}
.report-card {
  grid-template-columns: 42px minmax(0, 1fr) auto;
}

.report-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: var(--app-hover);
  color: var(--app-muted);
}

.admin-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 34px 12px;
  color: var(--app-muted);
  font-size: 12px;
}

.admin-empty p {
  margin: 0;
}
.goods-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--app-text);
  font: 14px/1.65 system-ui, sans-serif;
}
.detail-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.detail-heading h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.detail-heading strong {
  flex: none;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}
.detail-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 20px;
  margin: 0;
}
.detail-fields div {
  min-width: 0;
}
.detail-fields dt {
  color: var(--app-muted);
  font-size: 11px;
}
.detail-fields dd {
  margin: 3px 0 0;
  overflow-wrap: anywhere;
  font-size: 12px;
}
.detail-section h3 {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
}
.detail-description {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.detail-images {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.detail-images figure {
  margin: 0;
}
.detail-images img {
  display: block;
  width: 100%;
  max-height: 460px;
  object-fit: contain;
  border-radius: 8px;
  background: var(--app-hover);
}
.detail-images figcaption {
  margin-top: 5px;
  text-align: center;
  color: var(--app-muted);
  font-size: 11px;
}
.detail-missing {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
  border-radius: 8px;
  background: var(--app-hover);
  color: var(--app-muted);
}

@media (max-width: 700px) {
  .admin-container {
    padding-top: 22px;
  }
  .admin-heading {
    margin-bottom: 20px;
  }
  .admin-heading h1 {
    font-size: 24px;
  }
  .pending-summary {
    padding: 8px 10px;
  }
  .goods-review-card {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px;
  }
  .goods-review-image {
    width: 64px;
    height: 64px;
  }
  .review-actions {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
  }
  .report-card {
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 12px;
  }
  .report-icon {
    width: 36px;
    height: 36px;
  }
  .admin-module {
    padding: 16px;
  }
  .record-fields {
    gap: 5px 12px;
  }
}

@media (max-width: 430px) {
  .admin-heading {
    display: block;
  }
  .pending-summary {
    display: inline-flex;
    margin-top: 14px;
  }
  .module-heading {
    flex-direction: column;
    gap: 8px;
  }
  .goods-review-card {
    grid-template-columns: 1fr;
  }
  .goods-review-image {
    width: 100%;
    height: 140px;
  }
  .detail-heading {
    flex-direction: column;
    gap: 6px;
  }
  .detail-fields {
    grid-template-columns: 1fr;
  }
}
</style>
