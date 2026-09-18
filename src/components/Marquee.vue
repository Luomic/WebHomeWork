<script setup lang="ts">
import { computed } from 'vue'

/*
 * 卡片无缝循环流动（默认向左），两端渐隐
 *
 *  - images        : 图片地址数组，组件内部会复制一份首尾相接
 *  - cardWidth     : 卡片宽度（默认 '250px'）
 *  - gap           : 卡片间距（默认 '48px'，用 margin-right 实现，不能用 gap）
 *  - secondsPerCard: 一张卡片划过所需秒数，越大越慢（默认 7）
 *  - fade          : 两端渐隐宽度（默认 '14%'）
 *  - aspectRatio   : 卡片宽高比（默认 '3 / 4'）
 *  - borderRadius  : 卡片圆角（默认 '10px'）
 *  - reverse       : 反向流动（默认 false）
 *  - pauseOnHover  : 悬停暂停（默认 true）
 *
 * 用法：
 *   <Marquee :images="posters" :seconds-per-card="9" />
 */
const props = withDefaults(
  defineProps<{
    images: string[]
    cardWidth?: string
    gap?: string
    secondsPerCard?: number
    fade?: string
    aspectRatio?: string
    borderRadius?: string
    reverse?: boolean
    pauseOnHover?: boolean
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

// 张数直接进 CSS，保证增删图片时流速不变
const count = computed(() => props.images.length)

const rootStyle = computed(() => ({
  '--marquee-count': String(count.value),
  '--marquee-card-width': props.cardWidth,
  '--marquee-gap': props.gap,
  '--marquee-sec': `${props.secondsPerCard}s`,
  '--marquee-fade': props.fade,
  '--marquee-aspect': props.aspectRatio,
  '--marquee-radius': props.borderRadius,
}))
</script>

<template>
  <div
    class="marquee"
    :class="{
      'is-reverse': reverse,
      'is-pausable': pauseOnHover,
      'is-idle': count === 0,
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
  /* 一份列表的宽度 = 张数 × (卡宽 + 间距)，走完就是一个周期 */
  --marquee-dur: calc(var(--marquee-count) * var(--marquee-sec));

  position: relative;
  width: 100%;
  overflow: hidden;

  /* mask 里不透明黑表示保留，透明表示淡出 */
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
  display: flex;
  width: max-content; /* 不许收缩，否则 -50% 对不上一个周期 */
  animation: marquee var(--marquee-dur) linear infinite;
  will-change: transform;
}

/* 轨道总宽正好是一份列表的两倍，-50% 恰好首尾相接 */
@keyframes marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

/* 间距用 margin-right（含最后一张），保证轨道宽度严格是 2 个周期 */
.marquee__card {
  flex: 0 0 var(--marquee-card-width);
  width: var(--marquee-card-width);
  margin-right: var(--marquee-gap);
  aspect-ratio: var(--marquee-aspect);
  object-fit: cover;
  border-radius: var(--marquee-radius);
  display: block;
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
