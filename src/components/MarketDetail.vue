<script setup lang="ts">
// 商品/种草详情弹窗。visible 是个"桥接"：父级传 item 进来（有值=打开），
// 关闭时组件反向 emit('close') 让父级把 item 置空，两边状态保持一致。
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { MapPin, ImageOff } from 'lucide-vue-next'
import { priceLabel, type MarketItem } from '@/data/market'
// item：要展示的商品（null = 弹窗关闭）；showMap：是否显示"在地图查看"按钮
const props = withDefaults(defineProps<{ item: MarketItem | null; showMap?: boolean }>(), { showMap: true })
// close：关闭弹窗事件；map：点"在地图查看"时把商品抛给父级
const emit = defineEmits<{ close: []; map: [item: MarketItem] }>()
// computed 写成 get/set 形式：读 = item 有值就是打开；写（v-model:visible 改它）=
// 只有"改成关"才向父级 emit close。桥接组件状态和父级状态
const visible = computed({
  get: () => !!props.item,               // !!：把对象/null 转成 true/false
  set: value => { if (!value) emit('close') },
})
</script>
<template>
  <!-- item?.kind：?. 可选链——item 为 null 时不取 kind，整句返回 undefined 而不是报错 -->
  <Dialog v-model:visible="visible" modal :draggable="false" class="market-detail-dialog" :header="item?.kind === 'recommend' ? '种草详情' : '商品详情'" :style="{ width: '42rem', maxWidth: 'calc(100vw - 2rem)' }">
    <!-- v-if="item"：没数据时内部什么都不渲染 -->
    <article v-if="item" class="market-detail">
      <!-- 详情大图；object-fit 用 contain（完整显示不裁剪），背景垫色防留白突兀 -->
      <img v-if="item.image" class="detail-image" :src="item.image" :alt="item.title + '，项目示例素材'">
      <!-- 无图占位 -->
      <div v-else class="detail-missing"><ImageOff :size="30" aria-hidden="true" /><span>暂无实拍图片</span></div>
      <!-- 标题行：闲置品右侧跟价格 -->
      <div class="detail-heading"><h2>{{ item.title }}</h2><strong v-if="item.kind === 'idle'">{{ priceLabel(item.price) }}</strong></div>
      <p class="detail-author">{{ item.author }} · {{ item.kind === 'idle' ? item.category : '种草' }}</p>
      <p class="detail-description">{{ item.description }}</p>
      <!-- 地点信息块：图钉图标 + 小标签 + 地名 -->
      <div class="detail-location"><MapPin :size="18" aria-hidden="true" /><div><small>{{ item.kind === 'idle' ? '交接地点' : '推荐地点' }}</small><p>{{ item.place }}</p></div></div>
      <Message severity="secondary" :closable="false" size="small">示例内容，尚未接入商品或种草接口，不代表真实发布。</Message>
      <!-- 只在"闲置商品 + 允许显示地图"时出现；点击向父级抛 map 事件 -->
      <Button v-if="showMap && item.kind === 'idle'" class="ink-button" @click="emit('map', item)"><MapPin :size="16" aria-hidden="true" />在地图查看</Button>
    </article>
  </Dialog>
</template>
<style scoped>
/* 详情容器：flex 纵向排列，子元素间距 18px；font 简写同时设字号和行高 */
.market-detail{display:flex;flex-direction:column;gap:18px;font:14px/1.65 system-ui,sans-serif;color:var(--app-text)}
/* 图片 contain 模式：完整显示不裁剪；背景垫色兜住留白 */
.detail-image{width:100%;max-height:420px;object-fit:contain;background:var(--app-hover);border-radius:10px}
/* 无图占位块 */
.detail-missing{min-height:180px;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;background:var(--app-hover);border-radius:10px;color:var(--app-muted)}
/* 标题行：space-between 把价格推到最右；align-items:baseline 让文字底部对齐 */
.detail-heading{display:flex;gap:16px;justify-content:space-between;align-items:baseline}
.detail-heading h2{margin:0;font-size:20px;font-weight:600}
.detail-heading strong{font-size:24px;white-space:nowrap;font-variant-numeric:tabular-nums} /* 价格不换行、等宽数字 */
.detail-author{margin:0;color:var(--app-muted);font-size:12px}
/* pre-wrap：保留描述里的换行和空格；anywhere：长英文单词也允许断行，防止撑破容器 */
.detail-description{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
/* 地点信息块：图标和文字横排居中 */
.detail-location{display:flex;gap:10px;align-items:center;padding:14px;background:var(--app-hover);border-radius:8px}
.detail-location p{margin:2px 0 0}
.detail-location small{color:var(--app-muted)}
</style>

