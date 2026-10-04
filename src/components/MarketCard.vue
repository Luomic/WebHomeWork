<script setup lang="ts">
import Button from 'primevue/button'
import { ImageOff } from 'lucide-vue-next'
import { priceLabel, type MarketItem } from '@/data/market'
const props = defineProps<{ item: MarketItem }>()
// defineEmits：声明本组件会"抛出"哪些事件——子组件 emit('open', item)，
// 父组件用 @open="..." 接住并弹出详情
const emit = defineEmits<{ open: [item: MarketItem] }>()
console.log(JSON.stringify(props))
</script>
<template>
  <!-- unstyled：关掉 PrimeVue 自带外观，纯用自定义 class；
       :aria-label：给读屏软件的"卡片名称"（整卡可点但里面文字很多，统一朗读标题）；
       @click="emit('open', item)"：点击时向父组件抛 open 事件并携带整个商品对象 -->
  <Button unstyled class="market-card" :aria-label="'查看' + item.title" @click="emit('open', item)">
    <!-- :style 绑定对象语法：键是 CSS 属性、值是 JS 表达式——宽高比由数据动态决定 -->
    <div class="card-media" :style="{ aspectRatio: item.ratio }">
      <!-- 有图片地址时直接展示服务端图片。 -->
      <img v-if="item.image" :src="item.image" :alt="item.title" :style="{ objectPosition: item.imagePosition }" loading="lazy" decoding="async">
      <!-- v-else：紧跟 v-if 的"否则"分支；{{ }} 插值：把 JS 表达式的值渲染成文字 -->
      <div v-else class="media-empty"><ImageOff :size="26" aria-hidden="true" /><span>{{ '暂无商品实拍' }}</span></div>
      <span v-if="item.isExample" class="sample-mark">示例</span>
      <span v-if="item.images.length > 1" class="image-count">{{ item.images.length }} 张</span>
    </div>
    <div class="card-copy">
      <h2>{{ item.title }}</h2>
      <!-- 商品卡显示价格。 -->
      <p class="card-price">{{ priceLabel(item.price) }}</p>
      <!-- 末行元信息：作者 · 类别/地点；aria-hidden 的 · 纯装饰，读屏不念 -->
      <p class="card-meta">{{ item.author }}<span aria-hidden="true"> · </span>{{ item.category }}</p>
    </div>
  </Button>
</template>
<style scoped>
/* 卡片本体：把 Button 的默认样式全清掉（背景/边框/内边距），看起来就是普通卡片，
 * 但保留了 <button> 的键盘可点、可聚焦等无障碍能力 */
.market-card{display:block;width:100%;padding:0;text-align:left;border:0;background:none;color:var(--app-text);font:inherit;cursor:pointer;border-radius:12px;outline-offset:4px}
/* :focus-visible：键盘 Tab 到卡片时的聚焦描边（outline-offset 让描边离卡片留 4px 缝） */
.market-card:focus-visible{outline:2px solid var(--app-text)}
.card-media{position:relative;overflow:hidden;background:var(--app-hover);border:1px solid var(--app-border);border-radius:12px;transition:border-color .18s ease} /* overflow:hidden 裁掉图片出圆角的部分 */
.market-card:hover .card-media{border-color:var(--app-muted)} /* 悬停时图片框边加深 */
.card-media img{width:100%;height:100%;object-fit:cover} /* 裁剪填满不变形 */
.sample-mark,.image-count{position:absolute;bottom:9px;padding:2px 7px;background:var(--app-field);color:var(--app-muted);border:1px solid var(--app-border);border-radius:5px;font-size:10px}.sample-mark{left:9px}.image-count{right:9px}
.media-empty{height:100%;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;color:var(--app-muted);font-size:12px} /* 无图占位：图标+文字居中 */
.card-copy{padding:12px 2px 5px}
/* 标题最多两行：-webkit-line-clamp 需要 display:-webkit-box + box-orient + overflow 配合 */
.card-copy h2{font-size:14px;line-height:1.6;font-weight:500;margin:0 0 8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card-price{font-size:21px;line-height:1.3;font-weight:650;font-variant-numeric:tabular-nums;margin:0} /* tabular-nums：等宽数字，价格跳动时不抖 */
.card-place{display:flex;align-items:center;gap:5px;font-size:13px;margin:0;color:var(--app-muted)} /* 图钉图标和地名横排 */
.card-meta{font-size:11px;line-height:1.5;color:var(--app-muted);margin:9px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} /* nowrap+ellipsis：一行放不下时显示省略号 */
@media(prefers-reduced-motion:reduce){.card-media{transition:none}} /* 尊重系统"减少动效" */
</style>
