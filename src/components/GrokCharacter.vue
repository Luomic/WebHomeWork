<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { GrokCharacter } from '@/grok'
import type { GrokMode, GrokScheme, GrokSnapshot } from '@/grok/types'

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

const emit = defineEmits<{ change: [snapshot: GrokSnapshot] }>()

const svgRef = useTemplateRef<SVGSVGElement>('svg')

const engineScheme = () => (props.scheme === 'inherit' ? undefined : props.scheme)

const rootStyle = computed(() => {
  const style: Record<string, string> = {
    '--grok-size': `${props.size}px`,   // 模板字符串拼上单位
  }
  if (props.plate) {                    // 有底板才写这两个变量
    style['--grok-plate'] = props.plate
    style['--disk'] = props.plate      // 引擎内部用的变量名
  }
  if (props.scheme !== 'inherit') style['color-scheme'] = props.scheme
  return style
})

let bot: GrokCharacter | undefined   // 引擎实例（onMounted 里创建）

onMounted(() => {
  const svg = svgRef.value
  if (!svg) return
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
  bot?.destroy()
  bot = undefined
})

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
  <div class="grok-character" :style="rootStyle">
    <div v-if="plate" class="grok-character__plate" aria-hidden="true"></div>
    <svg ref="svg" class="grok-character__svg" role="img" :aria-label="ariaLabel"></svg>
  </div>
</template>

<style scoped>
.grok-character {
  --grok-size: 96px;
  --grok-plate-size: calc(var(--grok-size) / 0.68);

  position: relative;   /* 底板绝对定位的参照 */
  display: inline-grid; /* 行内网格：内容天然居中且不占一整行 */
  place-items: center;  /* 水平垂直居中 */
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
