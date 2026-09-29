<!-- 本页面不处理任何实际数据，仅作欢迎页面（默认落地页，同步加载） -->
<!-- 响应式三档：≥900px 左右两栏；601–899px 与 ≤600px 单栏。
     单栏时 .hero 用 display:contents 拆掉布局层，再靠 order 重排视觉顺序
     （手机：标题 → slogan → 按钮一行两个 → Grok → 卡片流），DOM 嵌套不动。 -->

<script setup lang="ts">
// computed/inject/ref：响应式 API；useTemplateRef：拿模板元素（见下）
import { computed, inject, ref, useTemplateRef } from 'vue'
import Button from 'primevue/button'
// 项目自己的组件：@ 别名指向 src/
import Marquee from '@/components/Marquee.vue'
import DotWave from '@/components/DotWave.vue'
// PrimeIcons 图标组件：双箭头 / Github 标
import AngleDoubleRight from '@primeicons/vue/angle-double-right'
import Github from '@primeicons/vue/github'
import GrokCharacter from '@/components/GrokCharacter.vue'
// 路由实例：点按钮跳转用
import router from '@/router'


// 背板跟随全局主题，避免暗色模式下仍然保留一块刺眼的白圆盘。
// inject：取 App.vue provide 下来的 isDark（暗色开关）
const isDark = inject('isDark', ref(false))
// 底板颜色随主题切换
const plateColor = computed(() => isDark.value ? '#292722' : '#f7f5ef')
const grokScheme = computed(() => isDark.value ? 'dark' : 'light')

// 卡片流轮播的图片列表（public/placeholder 下的素材，/ 开头 = 站点根）
const posters = [
  '/placeholder/1.webp',
  '/placeholder/2.webp',
  '/placeholder/3.webp',
  '/placeholder/4.webp',
  '/placeholder/5.webp',
  '/placeholder/6.webp',
]
// 拿到模板里 ref="titleWrap" 的标题容器元素
const titleWrap = useTemplateRef<HTMLElement>('titleWrap')

// 标题聚光灯 + 轻微 3D 摆动：--x/--y 驱动白色 lamp 圆形裁切（mix-blend-mode:difference
// 在浅色底上反相成暗斑）；--title-* 驱动标题的位移与旋转。只在鼠标精确指针下生效，
// 触屏/减少动效偏好时直接收起（handleLeave 把灯移出画布）。
function handlePointer(e: PointerEvent) {
  const el = titleWrap.value
  if (!el) return
  // pointerType 不是 mouse（触屏/触控笔）或系统开了减少动效 → 不做效果
  if (e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) { handleLeave(); return }
  // rect：标题容器的位置尺寸；鼠标坐标减容器左上角 = 容器内相对坐标
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--x', `${e.clientX - rect.left}px`)
  el.style.setProperty('--y', `${e.clientY - rect.top}px`)
  // 测量静止的外层，只让内层标题轻微摆动，避免鼠标与变换互相追逐。
  // 把相对坐标归一成 -1~1：除以宽高 ×2 -1；Math.max/min 是"钳制"防止超出
  const x = Math.max(-1, Math.min(1, (e.clientX - rect.left) / rect.width * 2 - 1))
  const y = Math.max(-1, Math.min(1, (e.clientY - rect.top) / rect.height * 2 - 1))
  // setProperty：给元素写 CSS 变量，样式表里 var(--title-tx) 就跟着变
  el.style.setProperty('--title-tx', `${x * 2}px`)
  el.style.setProperty('--title-ty', `${y * 1.5}px`)
  el.style.setProperty('--title-rx', `${-y * 1.2}deg`)
  el.style.setProperty('--title-ry', `${x * 1.6}deg`)
}

function handleLeave() {
  const el = titleWrap.value
  if (!el) return
  // 灯挪到画布外（-200px 看不见）= 熄灭
  el.style.setProperty('--x', '-200px')
  el.style.setProperty('--y', '-200px')
  // 移除摆动变量，标题回正
  for (const name of ['--title-tx', '--title-ty', '--title-rx', '--title-ry']) el.style.removeProperty(name)
}
</script>

<template>
  <!-- 页面根元素：单根节点是路由过渡动画（App.vue 的 Transition）的前提 -->
  <div class="welcome">
    <!--这个是背景波纹-->
    <DotWave />
    <!-- 顶部按钮组 -->
    <div class="button-group">
      <!-- @click="$router.push('./home')"：$router 是模板里直接可用的路由实例，
           push 跳转到 /home；模板里不用写 import -->
      <Button rounded class="button-get" @click="$router.push('./home')">
        <AngleDoubleRight :size="22" />
        逛市集
      </Button>
      <Button rounded class="button-gett">
        <Github :size="22" />
        Github
      </Button>
    </div>
    <div class="hero">
      <div class="left-title">
        <!-- ref="titleWrap"：把元素交给脚本；@pointermove 等：指针移动/移出/取消事件 -->
        <div ref="titleWrap" class="title-wrap" @pointermove="handlePointer" @pointerleave="handleLeave" @pointercancel="handleLeave">
          <div class="title-motion">
          <p class="title-text">孤独市集</p>
          <!-- lamp：跟随鼠标的"聚光灯"，纯 CSS 变量驱动 -->
          <div class="lamp"></div>
          </div>
        </div>

        <div class="slogan">
          欢迎来到孤独市集，
          一个人也可以逛的校园二手市集。<br>
          这里有一些闲置的东西，
          一些正在寻找新主人的东西。<br>
          或许......可能还会有一些神秘的珍藏？随便看看，说不定就能淘到点好玩的。
        </div>
      </div>

      <div class="right-title">
        <!-- Grok 角色：onboarding 模式自动轮换情绪；size/scheme/plate 都是它的 props -->
        <GrokCharacter mode="onboarding" :size="120" :scheme="grokScheme" :plate="plateColor" style="margin-top: 16px;" />
        <div class="re-text">
          <p class="re-content">其实，我想说：</p>
          <br>
          <!-- <b>：加粗（语义上更推荐 strong，这里沿用原写法） -->
          <p class="re-content"><b>一个人逛，也挺好的。</b></p>
        </div>
      </div>
    </div>

    <!-- 卡片流：images 传海报数组，7 秒一张，圆角 20px -->
    <Marquee class="marquee-row" :images="posters" :seconds-per-card="7" borderRadius="20px" />
  </div>
</template>

<style scoped>
/* 页面根：至少一屏高；border-box 让 padding 算进尺寸；overflow:hidden 防波纹溢出滚动 */
.welcome { min-height: 100vh; box-sizing: border-box; overflow: hidden; background: var(--app-bg, #f7f5ef); color: var(--app-text, #24231f); }

/* 主区：左右两栏 */
.hero {
  display: flex;
  flex-direction: row;
}

.button-group {
  display: flex;
  flex-direction: row;
  margin-top: 16px;
}

/* 主按钮：反色（文字色当底、页面底色当字） */
.button-get,
.button-gett {
  width: 140px;
  height: 45px;
  background: var(--app-text);
  color: var(--app-bg);
  border-color: var(--app-text);
}

.button-get {
  margin-left: auto;   /* 推到右边，实现"按钮右对齐" */
}

.button-gett {
  margin-left: 16px;
  margin-right: 16px;
}

.left-title {
  display: flex;
  flex-direction: column;
  width: 50%;
}

.marquee-row {
  margin-top: 128px;
  margin-left: 32px;
}

.right-title {
  display: flex;
  justify-content: center;
  align-content: center;
  margin-top: 32px;
}
.re-text {
  display: contents;
}

.slogan {
  width: 100%;
  margin-left: 128px;
  margin-top: 16px;
  font-family: 'Round', system-ui, sans-serif;
  display: flex;
  font-size: 18px;
  flex-direction: column;
}

.re-content {
  font-family: 'Round', system-ui, sans-serif;
  font-size: 20px;
  margin-top: 16px;
  align-content: center;
}

.title-wrap {
  position: relative;
  display: grid;
  margin-left: 128px;
  margin-top: 16px;
}

.title-motion {
  position: relative;
  display: grid;
  /* perspective：透视（近大远小）；translate3d 位移；rotateX/Y 旋转——
   * 数值全部来自 JS 写入的 CSS 变量，默认 0 = 静止 */
  transform: perspective(900px) translate3d(var(--title-tx, 0px), var(--title-ty, 0px), 0) rotateX(var(--title-rx, 0deg)) rotateY(var(--title-ry, 0deg));
  transition: transform .3s cubic-bezier(.2,.7,.2,1);   /* 变化平滑过渡，不跟手抖动 */
}
/* 触屏（pointer: coarse）/ 减少动效：不做摆动也不显示灯 */
@media (prefers-reduced-motion: reduce), (pointer: coarse) {
  .title-motion { transform: none; transition: none; }
  .lamp { display: none; }
}

.title-text {
  grid-area: 1 / 1;   /* 和 .lamp 叠在同一个网格格子里，实现"文字上叠灯" */
  margin: 0;
  font-family: 'Ding', system-ui, sans-serif;   /* 标题字体，font.css 注册的 Ding */
  font-size: 64px;
}

.lamp {
  position: absolute;
  inset: 0;
  pointer-events: none;   /* 不挡鼠标事件（否则会干扰 pointermove） */
  background: #fff;
  mix-blend-mode: difference;   /* 混合模式：与下层反相——白灯在浅底上变暗斑 */
  /* clip-path: circle：只显示一个圆形区域，圆心跟随 --x/--y（JS 写入的鼠标位置） */
  clip-path: circle(40px at var(--x, -200px) var(--y, -200px));
}

/* ── 平板档（601–899px）：单栏重排 ─────────────────────────── */
@media (min-width: 601px) and (max-width: 899px) {
  /* :global：scoped 样式默认作用不到全局元素，这样写才能改到 body */
  :global(body) {
    margin: 0;
  }

  /* 整页变纵向排列 */
  .welcome {
    display: flex;
    flex-direction: column;
    padding-bottom: 40px;
  }

  /* display: contents：让 .hero 自身"消失"，子元素直接参与 .welcome 的纵向排列 */
  .hero {
    display: contents;
  }

  .button-group,
  .left-title,
  .right-title {
    padding-left: 40px;
    padding-right: 40px;
  }

  .left-title {
    width: 100%;
  }

  .title-wrap {
    margin-left: 0;
    margin-top: 24px;
  }

  .title-text {
    font-size: 48px;
  }

  .slogan {
    margin-left: 0;
    margin-top: 12px;
    font-size: 17px;
    line-height: 1.75;
  }

  .right-title {
    margin-top: 32px;
    flex-wrap: wrap;
    gap: 14px;
  }

  .re-content {
    font-size: 18px;
  }

  .right-title .grok-character {
    --grok-size: 104px !important;
  }

  .marquee-row {
    margin-top: 56px;
    margin-left: 0;
  }

  .marquee-row :deep(.marquee__card) {
    flex: 0 0 200px;
    width: 200px;
    margin-right: 32px;
    border-radius: 16px;
  }
}

/* ── 手机档（≤600px）：单栏 + 视觉顺序重排 ─────────────────── */
@media (max-width: 600px) {
  :global(body) {
    margin: 0;
  }

  .welcome {
    display: flex;
    flex-direction: column;
    padding-bottom: 32px;
  }

  /* 点阵背景改成 fixed：滚动时背景不动 */
  :global(.welcome .dot-wave) {
    position: fixed;
  }

  .hero {
    display: contents;
  }

  /* order：flex 排列顺序——DOM 顺序没变，视觉顺序变成 标题→按钮→角色→卡片流 */
  .left-title {
    order: 1;
  }
  .button-group {
    order: 2;
  }
  .right-title {
    order: 3;
  }
  .marquee-row {
    order: 4;
  }

  .button-group,
  .left-title,
  .right-title {
    padding-left: 20px;
    padding-right: 20px;
  }

  .left-title {
    width: 100%;
  }

  .title-wrap {
    margin-left: 0;
    margin-top: 28px;
  }

  .title-text {
    /* clamp(最小, 首选, 最大)：字号随视口宽度 9vw 伸缩，限制在 34–56px 之间 */
    font-size: clamp(34px, 9vw, 56px);
  }

  .lamp {
    clip-path: circle(28px at var(--x, -200px) var(--y, -200px));
  }

  .slogan {
    margin-left: 0;
    margin-top: 12px;
    font-size: 16px;
    line-height: 1.75;
  }

  .button-group {
    margin-top: 24px;
    gap: 12px;
  }

  .button-group .button-get,
  .button-group .button-gett {
    width: auto;
    height: 44px;
    flex: 1 1 0;   /* flex-grow:1 → 两个按钮等分一行剩余宽度 */
    margin: 0;
  }

  .right-title {
    margin-top: 28px;
    flex-wrap: wrap;
    gap: 14px;
    align-items: center;
  }

  .right-title .grok-character {
    --grok-size: 96px !important;
  }

  .re-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .re-text br {
    display: none;
  }

  .re-content {
    font-size: 17px;
    margin-top: 0;
  }

  .marquee-row {
    margin-top: 48px;
    margin-left: 0;
  }

  .marquee-row :deep(.marquee__card) {
    flex: 0 0 176px;
    width: 176px;
    margin-right: 24px;
    border-radius: 16px;
  }
}
</style>
