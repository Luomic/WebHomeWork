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
    state?: string
    shape?: string
    color?: string
    scheme?: GrokScheme
    mode?: GrokMode
    size?: number
    plate?: string | false
    followPointer?: boolean
    emphasis?: boolean
    paused?: boolean
    badgeColor?: string
    eyeColor?: string | null
    ariaLabel?: string
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

const emit = defineEmits<{ change: [snapshot: GrokSnapshot] }>()

const svgRef = useTemplateRef<SVGSVGElement>('svg')

const engineScheme = () => (props.scheme === 'inherit' ? undefined : props.scheme)

const rootStyle = computed(() => {
  const style: Record<string, string> = {
    '--grok-size': `${props.size}px`,
  }
  if (props.plate) {
    // --disk 会顺着继承被眼睛镂空路径读到（引擎把 --bg 设成了
    // var(--sand-bg-base, var(--disk, #f3efe6))）
    style['--grok-plate'] = props.plate
    style['--disk'] = props.plate
  }
  // color-scheme 只为了 light-dark() 有确定的取值方向；底板颜色是显式写的，不受它影响
  if (props.scheme !== 'inherit') style['color-scheme'] = props.scheme
  return style
})

let bot: GrokCharacter | undefined

onMounted(() => {
  const svg = svgRef.value
  if (!svg) return
  bot = new GrokCharacter(svg, {
    state: props.state,
    shape: props.shape,
    color: props.color,
    scheme: engineScheme(),
    mode: props.mode,
    loginWrap: true,
    followPointer: props.followPointer,
    emphasis: props.emphasis,
    paused: props.paused,
    badgeColor: props.badgeColor,
    eyeColor: props.eyeColor ?? undefined,
    onChange: (snapshot: GrokSnapshot) => emit('change', snapshot),
  })
})

onBeforeUnmount(() => {
  bot?.destroy()
  bot = undefined
})

watch(
  () => props.state,
  (v) => bot?.setState(v, { resetEyes: false }),
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
  () => bot?.setColor(props.color, engineScheme()),
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
    if (bot) bot.badgeColor = v
  },
)
watch(
  () => props.eyeColor,
  (v) => bot?.setEyeColor(v ?? undefined),
)

defineExpose({
  setState: (name: string, resetEyes = false) => bot?.setState(name, { resetEyes }),
  setShape: (name: string) => bot?.setShape(name),
  setColor: (id: string, scheme?: GrokScheme) =>
    bot?.setColor(id, scheme === 'inherit' ? undefined : scheme),
  setMode: (mode: GrokMode) => bot?.setMode(mode),
  setPaused: (v: boolean) => bot?.setPaused(v),
  setEmphasis: (v: boolean) => bot?.setEmphasis(v),
  setFollowPointer: (v: boolean) => bot?.setFollowPointer(v),
  /** 视线锁定到视口坐标上的某点（传 null 解除） */
  setGazeTarget: (pt: { x: number; y: number } | null) => bot?.setGazeTarget(pt),
  spinOnce: (turns = 1) => bot?.spinOnce(turns),
  bounceOnce: () => bot?.bounceOnce(),
  burstOnce: () => bot?.burstOnce(),
  snapshot: (): GrokSnapshot | undefined => bot?.snapshot(),
  /** 逃生舱：拿到引擎实例本身 */
  getEngine: () => bot,
})
</script>

<template>
  <div class="grok-character" :style="rootStyle">
    <div v-if="plate" class="grok-character__plate" aria-hidden="true"></div>
    <svg ref="svg" class="grok-character__svg" role="img" :aria-label="ariaLabel"></svg>
  </div>
</template>

<style scoped>
.grok-character {
  --grok-size: 96px;
  /* 原版登录页里角色约占圆盘的 68% */
  --grok-plate-size: calc(var(--grok-size) / 0.68);

  position: relative;
  display: inline-grid;
  place-items: center;
  inline-size: var(--grok-plate-size);
  block-size: var(--grok-plate-size);

  /* 尺寸由 size 决定，别让 flex 容器把圆盘压成椭圆 */
  flex: none;

  /* color-scheme 只为 light-dark() 定方向，显式清掉背景免得被它带出色块 */
  background: transparent;
}

.grok-character__plate {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--grok-plate, transparent);
  box-shadow: var(
    --grok-plate-shadow,
    inset 0 -8px 18px rgba(40, 30, 10, 0.08),
    0 12px 28px rgba(0, 0, 0, 0.3)
  );
}

.grok-character__svg {
  position: relative;
  inline-size: var(--grok-size);
  block-size: var(--grok-size);

  /* 引擎会把粒子、覆盖层画到 viewBox 外面去 */
  overflow: visible;
  background: transparent;
  /* 引擎自己写 style 上的 transform / --fg / --bg，这里不要碰 */
}
</style>
