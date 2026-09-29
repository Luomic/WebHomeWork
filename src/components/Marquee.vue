<script setup lang="ts">
// computed：计算属性，依赖变了自动重算并触发视图更新
import { computed } from 'vue'

/*
 * 卡片无缝循环流动
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

// 张数直接进 CSS，保证增删图片时流速不变
// 注意：数组类型的默认值要写成工厂函数 () => []，不能直接 []（每个实例会共享同一个数组）
const count = computed(() => props.images.length)

// 把所有 props 转成 CSS 自定义属性（--marquee-*），模板 :style 绑定后样式表里就能引用。
// 逻辑放 JS、外观放 CSS，改动尺寸不用碰样式表
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
  <!-- class="marquee"：静态类；:class="{}"：动态类绑定——对象的键为类名、
       值为真值时该类生效（如 reverse 为 true 就挂上 is-reverse）。
       :style="rootStyle"：绑定上面的 CSS 变量对象 -->
  <div
    class="marquee"
    :class="{
      'is-reverse': reverse,        // 反向流动
      'is-pausable': pauseOnHover,  // 允许悬停暂停
      'is-idle': count === 0,       // 没图时静止
    }"
    :style="rootStyle"
  >
    <!-- 轨道：真正做位移动画的容器 -->
    <div class="marquee__track">
      <!-- v-for：循环渲染，images 有几张就生成几个 img（第一组）；
           :key：给每项唯一标识，Vue 靠它高效复用/更新 DOM；
           :src：绑定图片地址（冒号表示值是 JS 变量而非字符串"src"）；
           alt=""：装饰性图片置空，读屏软件跳过 -->
      <img
        v-for="src in images"
        :key="`head-${src}`"
        class="marquee__card"
        :src="src"
        alt=""
      />
      <!-- 第二组：一模一样的副本，用于无缝衔接——第一组滑出屏幕时
           第二组刚好顶上；aria-hidden 让读屏软件忽略这组重复图 -->
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
  --marquee-dur: calc(var(--marquee-count) * var(--marquee-sec));  /* calc：CSS 里做算术 */

  position: relative;   /* 作为内部绝对定位元素的参照 */
  width: 100%;
  overflow: hidden;     /* 滑出边界的卡片裁掉，形成"窗口"效果 */

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
  display: flex;        /* 弹性布局：卡片排成一行 */
  width: max-content;   /* 不许收缩，否则 -50% 对不上一个周期 */
  /* animation: 名字 时长 速度曲线 循环次数——linear 匀速、infinite 无限循环 */
  animation: marquee var(--marquee-dur) linear infinite;
  will-change: transform;  /* 提示浏览器 transform 会变，提前做合成层优化，滑动更顺 */
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
  flex: 0 0 var(--marquee-card-width);  /* 不放大、不缩小、固定基础宽度 */
  width: var(--marquee-card-width);
  margin-right: var(--marquee-gap);
  aspect-ratio: var(--marquee-aspect);  /* 由宽自动算高，保持比例 */
  object-fit: cover;                    /* 图片裁剪填满卡片不变形 */
  border-radius: var(--marquee-radius);
  display: block;                       /* 消除 img 底部默认的基线空隙 */
}

/* 后代选择器：.marquee 上有 is-reverse 类时，轨道反向播放 */
.marquee.is-reverse .marquee__track {
  animation-direction: reverse;
}

/* :hover：鼠标悬停在 .is-pausable 的 marquee 上时，轨道暂停 */
.marquee.is-pausable:hover .marquee__track {
  animation-play-state: paused;
}

/* 没有图片时不跑动画 */
.marquee.is-idle .marquee__track {
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .marquee__track {
    animation: none;
  }
}
</style>
