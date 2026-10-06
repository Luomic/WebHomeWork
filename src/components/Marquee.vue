<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    images: string[]          // 必传：图片地址数组（没有 ?）
    cardWidth?: string        // 卡片宽度
    gap?: string              // 卡片间距
    secondsPerCard?: number   // 单张滑过秒数
    fade?: string             // 两端渐隐宽度
    aspectRatio?: string      // 卡片宽高比
    borderRadius?: string     // 卡片圆角
    reverse?: boolean         // 是否反向流动
    pauseOnHover?: boolean    // 悬停是否暂停
  }>(),
  {
    images: () => [],
    cardWidth: '250px',
    gap: '48px',
    secondsPerCard: 7,
    fade: '14%',
    aspectRatio: '3 / 4',
    borderRadius: '10px',
    reverse: false,
    pauseOnHover: true,
  },
)

const count = computed(() => props.images.length)

const rootStyle = computed(() => ({
  '--marquee-count': String(count.value),
  '--marquee-card-width': props.cardWidth,
  '--marquee-gap': props.gap,
  '--marquee-sec': `${props.secondsPerCard}s`,   // 模板字符串：拼出 "7s" 这样的时间单位
  '--marquee-fade': props.fade,
  '--marquee-aspect': props.aspectRatio,
  '--marquee-radius': props.borderRadius,
}))
</script>

<template>
  <div
    class="marquee"
    :class="{
      'is-reverse': reverse,        // 反向流动
      'is-pausable': pauseOnHover,  // 允许悬停暂停
      'is-idle': count === 0,       // 没图时静止
    }"
    :style="rootStyle"
  >
    <div class="marquee__track">
      <img
        v-for="src in images"
        :key="`head-${src}`"
        class="marquee__card"
        :src="src"
        alt=""
      />
      <img
        v-for="src in images"
        :key="`tail-${src}`"
        class="marquee__card"
        :src="src"
        alt=""
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped>
.marquee {
  --marquee-dur: calc(var(--marquee-count) * var(--marquee-sec));  /* calc：CSS 里做算术 */

  position: relative;   /* 作为内部绝对定位元素的参照 */
  width: 100%;
  overflow: hidden;     /* 滑出边界的卡片裁掉，形成"窗口"效果 */

  --marquee-mask: linear-gradient(
    to right,
    transparent 0,
    #000 var(--marquee-fade),
    #000 calc(100% - var(--marquee-fade)),
    transparent 100%
  );
  -webkit-mask-image: var(--marquee-mask);
  mask-image: var(--marquee-mask);
}

.marquee__track {
  display: flex;        /* 弹性布局：卡片排成一行 */
  width: max-content;   /* 不许收缩，否则 -50% 对不上一个周期 */
  animation: marquee var(--marquee-dur) linear infinite;
  will-change: transform;  /* 提示浏览器 transform 会变，提前做合成层优化，滑动更顺 */
}

@keyframes marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

.marquee__card {
  flex: 0 0 var(--marquee-card-width);  /* 不放大、不缩小、固定基础宽度 */
  width: var(--marquee-card-width);
  margin-right: var(--marquee-gap);
  aspect-ratio: var(--marquee-aspect);  /* 由宽自动算高，保持比例 */
  object-fit: cover;                    /* 图片裁剪填满卡片不变形 */
  border-radius: var(--marquee-radius);
  display: block;                       /* 消除 img 底部默认的基线空隙 */
}

.marquee.is-reverse .marquee__track {
  animation-direction: reverse;
}

.marquee.is-pausable:hover .marquee__track {
  animation-play-state: paused;
}

.marquee.is-idle .marquee__track {
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .marquee__track {
    animation: none;
  }
}
</style>
