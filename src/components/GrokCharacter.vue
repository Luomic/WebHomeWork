<!--
  Grok Bot 角色 —— 把 src/grok/ 里那套引擎包成 Vue 组件。

  引擎来自对 Grok Bot.app v0.18.0 登录页角色的学习复刻（grok-icon-study），
  移植后数值与上游逐位一致，详见仓库根目录 verify-port.mjs 的 56 项比对。

  用法：
    <GrokCharacter state="thinking" :size="96" />
    <GrokCharacter mode="onboarding" :size="64" plate="#f3efe6" follow-pointer />
    <GrokCharacter state="loading" :emphasis="true" @change="onSnap" />
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

// 引入 vendored 引擎本体（约定：src/grok/ 不手改，由 port-to-vue.mjs 生成）
import { GrokCharacter } from '@/grok'
import type { GrokMode, GrokScheme, GrokSnapshot } from '@/grok/types'

/*
 * size   : 角色 SVG 的边长（px）。默认 96。
 * plate  : 圆盘底板颜色；同时充当眼睛镂空的颜色。传 false 则不要底板，角色裸放在页面上。
 *          注意：角色本体默认是纯黑墨色，放在深色页面上必须给底板，否则会和背景糊在一起。
 * scheme : 决定 light-dark() 取哪一侧。'light' 是原版登录页的样子（黑身 + 米色眼），
 *          'dark' 会把墨色翻成浅色，'inherit' 交给页面。
 * mode   : 'onboarding' 复刻登录页每 1200ms 轮换情绪；'hold' 锁定在 state 指定的状态。
 */
const props = withDefaults(
  defineProps<{
    state?: string             // 表情状态名（idle/thinking/loading...）
    shape?: string             // 身体形状
    color?: string             // 身体颜色
    scheme?: GrokScheme        // 亮/暗配色方案（'light'|'dark'|'inherit'）
    mode?: GrokMode            // onboarding=自动轮换情绪；hold=锁定
    size?: number              // 角色 SVG 边长（px）
    plate?: string | false     // 圆盘底板颜色；false=不要底板
    followPointer?: boolean    // 眼睛跟随鼠标/触摸
    emphasis?: boolean         // 强调动效
    paused?: boolean           // 暂停动画
    badgeColor?: string        // 徽章颜色
    eyeColor?: string | null   // 眼睛颜色（null=默认）
    ariaLabel?: string         // 读屏文案
  }>(),
  {
    state: 'idle',
    shape: 'blob',
    color: 'black',
    scheme: 'light',
    mode: 'hold',
    size: 96,
    plate: '#f3efe6',
    followPointer: false,
    emphasis: false,
    paused: false,
    badgeColor: 'var(--gb-badge, #1d9bf0)',
    eyeColor: null,
    ariaLabel: 'Grok Bot 角色',
  },
)

// 声明对外事件：情绪变化时把引擎快照抛给父组件
const emit = defineEmits<{ change: [snapshot: GrokSnapshot] }>()

// 拿到模板里 ref="svg" 的 <svg> 元素；SVGSVGElement 是 SVG 元素的类型
const svgRef = useTemplateRef<SVGSVGElement>('svg')

// scheme 为 inherit 时不传给引擎（引擎自己跟随页面 light-dark()）
const engineScheme = () => (props.scheme === 'inherit' ? undefined : props.scheme)

// 组装根元素的 CSS 变量：尺寸 + 底板色；Record<string, string> 表示"键值都是字符串的对象"
const rootStyle = computed(() => {
  const style: Record<string, string> = {
    '--grok-size': `${props.size}px`,   // 模板字符串拼上单位
  }
  if (props.plate) {                    // 有底板才写这两个变量
    style['--grok-plate'] = props.plate
    style['--disk'] = props.plate      // 引擎内部用的变量名
  }
  // color-scheme 决定 CSS 的 light-dark() 函数取哪一侧
  if (props.scheme !== 'inherit') style['color-scheme'] = props.scheme
  return style
})

let bot: GrokCharacter | undefined   // 引擎实例（onMounted 里创建）

onMounted(() => {
  const svg = svgRef.value
  if (!svg) return
  // 实例化引擎：把 svg 元素和全部 props 交给它托管；onChange 里向父组件转发事件
  bot = new GrokCharacter(svg, {
    state: props.state,
    shape: props.shape,
    color: props.color,
    scheme: engineScheme(),
    mode: props.mode,
    loginWrap: true,   // 复刻登录页的包裹结构
    followPointer: props.followPointer,
    emphasis: props.emphasis,
    paused: props.paused,
    badgeColor: props.badgeColor,
    eyeColor: props.eyeColor ?? undefined,   // null 归一成 undefined
    onChange: (snapshot: GrokSnapshot) => emit('change', snapshot),
  })
})

onBeforeUnmount(() => {
  // 必须销毁引擎，停掉内部动画循环；?. 防止没初始化过时崩溃
  bot?.destroy()
  bot = undefined
})

// 每个 prop 一条 watch：prop 变化时同步调用引擎的对应 setter（引擎实例不在 Vue 响应式体系里，得手动桥接）
watch(
  () => props.state,     // 监听"函数返回值"= props.state
  (v) => bot?.setState(v, { resetEyes: false }),  // 换状态不重置眼睛
)
watch(
  () => props.shape,
  (v) => bot?.setShape(v),
)
watch(
  () => props.color,
  (v) => bot?.setColor(v, engineScheme()),
)
watch(
  () => props.scheme,
  () => bot?.setColor(props.color, engineScheme()),  // 配色变了要连颜色一起重设
)
watch(
  () => props.mode,
  (v) => bot?.setMode(v),
)
watch(
  () => props.followPointer,
  (v) => bot?.setFollowPointer(v),
)
watch(
  () => props.emphasis,
  (v) => bot?.setEmphasis(v),
)
watch(
  () => props.paused,
  (v) => bot?.setPaused(v),
)
watch(
  () => props.badgeColor,
  (v) => {
    if (bot) bot.badgeColor = v   // 徽章色是普通属性，直接赋值
  },
)
watch(
  () => props.eyeColor,
  (v) => bot?.setEyeColor(v ?? undefined),
)

// defineExpose：把方法暴露给父组件——父拿 ref="xxx" 后可以调 xxxRef.value.setState(...)
defineExpose({
  setState: (name: string, resetEyes = false) => bot?.setState(name, { resetEyes }),
  setShape: (name: string) => bot?.setShape(name),
  setColor: (id: string, scheme?: GrokScheme) =>
    bot?.setColor(id, scheme === 'inherit' ? undefined : scheme),
  setMode: (mode: GrokMode) => bot?.setMode(mode),
  setPaused: (v: boolean) => bot?.setPaused(v),
  setEmphasis: (v: boolean) => bot?.setEmphasis(v),
  setFollowPointer: (v: boolean) => bot?.setFollowPointer(v),
  setGazeTarget: (pt: { x: number; y: number } | null) => bot?.setGazeTarget(pt),
  spinOnce: (turns = 1) => bot?.spinOnce(turns),   // 转一圈
  bounceOnce: () => bot?.bounceOnce(),             // 弹跳一次
  burstOnce: () => bot?.burstOnce(),               // 爆炸特效一次
  snapshot: (): GrokSnapshot | undefined => bot?.snapshot(),
  getEngine: () => bot,   // 拿到原始引擎实例（万全之策）
})
</script>

<template>
  <!-- 根容器：:style 挂尺寸/底板 CSS 变量 -->
  <div class="grok-character" :style="rootStyle">
    <!-- 底板圆盘：纯装饰所以 aria-hidden；v-if：传了 plate 才渲染 -->
    <div v-if="plate" class="grok-character__plate" aria-hidden="true"></div>
    <!-- 角色本体：引擎会往这个 svg 里画图形；
         role="img"：告诉读屏"这是张图片"；:aria-label：图片名字 -->
    <svg ref="svg" class="grok-character__svg" role="img" :aria-label="ariaLabel"></svg>
  </div>
</template>

<style scoped>
.grok-character {
  --grok-size: 96px;
  /* 盘子大小：角色 size 除以 0.68，让角色占盘子约 68%，四周留白 */
  --grok-plate-size: calc(var(--grok-size) / 0.68);

  position: relative;   /* 底板绝对定位的参照 */
  display: inline-grid; /* 行内网格：内容天然居中且不占一整行 */
  place-items: center;  /* 水平垂直居中 */
  /* inline-size/block-size 是 width/height 的逻辑属性写法（随书写方向变化） */
  inline-size: var(--grok-plate-size);
  block-size: var(--grok-plate-size);

  flex: none;  /* 在父级 flex 容器里不被拉伸/压缩 */

  background: transparent;
}

.grok-character__plate {
  position: absolute;
  inset: 0;           /* 铺满容器 */
  border-radius: 50%; /* 圆形 */
  background: var(--grok-plate, transparent);

}

.grok-character__svg {
  position: relative;   /* 浮在底板之上 */
  inline-size: var(--grok-size);
  block-size: var(--grok-size);
  overflow: visible;    /* 动效粒子超出 svg 边界也不裁剪 */
  background: transparent;
}
</style>
