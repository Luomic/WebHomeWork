<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

/*
 * 背景点阵：Canvas 逐点渲染的斜向行波，传播方向指向左下
 *
 *  - dotSpacing : 点距（默认 52）
 *  - dotRadius  : 点半径（默认 1.5）
 *  - waveLength : 波长，控制波带疏密（默认 200）
 *  - waveGap    : 空窗阈值，越大空窗越宽（默认 -0.3）
 *  - waveSpeed  : 推进速度，越小越舒缓（默认 0.02）
 *  - waveLift   : 波带隆起幅度（默认 9）
 *  - waveDrift  : 叠加的缓速起伏幅度（默认 2.2）
 *  - bendAmount : 弯曲深度，0 则退回笔直斜线（默认 34）
 *  - bendFreq   : 沿波前方向的弯曲密度（默认 0.014）
 *  - bendSpeed  : 弯曲形状自身的变化速度（默认 0.015）
 *  - fade       : 底部渐隐遮罩，CSS 渐变字符串（默认见下）
 *
 * 点色取继承来的 color，跟随主题，无需另配。
 * 组件自带 Canvas 底板（`background: Canvas`），页面上的 mix-blend-mode 效果依赖它。
 *
 * 用法：
 *   <DotWave />
 *   <DotWave :wave-speed="0.01" :dot-spacing="64" />
 */
const props = withDefaults(
  defineProps<{
    dotSpacing?: number
    dotRadius?: number
    waveLength?: number
    waveGap?: number
    waveSpeed?: number
    waveLift?: number
    waveDrift?: number
    bendAmount?: number
    bendFreq?: number
    bendSpeed?: number
    fade?: string
  }>(),
  {
    dotSpacing: 52,
    dotRadius: 1.5,
    waveLength: 200,
    waveGap: -0.3,
    waveSpeed: 0.02,
    waveLift: 9,
    waveDrift: 2.2,
    bendAmount: 34,
    bendFreq: 0.014,
    bendSpeed: 0.015,
    fade: `linear-gradient(
      to bottom,
      black 0%,
      rgba(0, 0, 0, 0.7) 30%,
      rgba(0, 0, 0, 0.3) 65%,
      transparent 100%
    )`,
  },
)

const rootStyle = computed(() => ({ '--dot-wave-fade': props.fade }))

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

const DIR_X = -Math.SQRT1_2 // 传播方向单位向量，指向左下
const DIR_Y = Math.SQRT1_2

const MAX_DPR = 2 // 高分屏最多按 2 倍渲染，再往上只烧性能
const COLOR_SAMPLE_FRAMES = 30 // 每隔多少帧重新取一次主题色

let teardown: (() => void) | undefined

function mount(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) return
  const ctx: CanvasRenderingContext2D = context

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let width = 0
  let height = 0
  let frame = 0
  let ticking = false
  let dotColor = '#ffffff'
  let raf = 0

  function resize() {
    const rect = canvas.getBoundingClientRect()
    width = rect.width
    height = rect.height
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function draw() {
    const {
      dotSpacing,
      dotRadius,
      waveLength,
      waveGap,
      waveSpeed,
      waveLift,
      waveDrift,
      bendAmount,
      bendFreq,
      bendSpeed,
    } = props

    // 颜色从元素自身算出来，主题切了不用通知这里
    if (frame % COLOR_SAMPLE_FRAMES === 0) dotColor = getComputedStyle(canvas).color

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = dotColor

    const cols = Math.ceil(width / dotSpacing) + 1
    const rows = Math.ceil(height / dotSpacing) + 1

    for (let gy = 0; gy < rows; gy++) {
      const y0 = gy * dotSpacing
      for (let gx = 0; gx < cols; gx++) {
        const x0 = gx * dotSpacing

        // proj：沿传播轴的分量，决定波带的前后顺序
        // perp：沿波前方向的分量，用来把等相位线掰成曲线
        const proj = x0 * DIR_X + y0 * DIR_Y
        const perp = x0 * DIR_Y - y0 * DIR_X
        const bend = Math.sin(perp * bendFreq + frame * bendSpeed) * bendAmount
        const wave = Math.sin(((proj + bend) / waveLength) * Math.PI * 2 - frame * waveSpeed)

        // 只保留波形高于阈值的部分，波带之间便自然留出空窗
        let band = (wave - waveGap) / (1 - waveGap)
        if (band < 0) band = 0

        // 缓速交叉起伏 + 波带自身的隆起
        const dy =
          Math.sin(x0 * 0.012 + frame * 0.021) * waveDrift +
          Math.sin(y0 * 0.015 - frame * 0.017) * waveDrift +
          wave * waveLift

        ctx.globalAlpha = 0.09 + 0.91 * band
        ctx.beginPath()
        ctx.arc(x0, y0 + dy, dotRadius * (0.5 + 1.1 * band), 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  function loop() {
    frame++
    draw()
    raf = requestAnimationFrame(loop)
  }

  function start() {
    if (ticking || still) return
    ticking = true
    loop()
  }

  function stop() {
    ticking = false
    cancelAnimationFrame(raf)
  }

  resize()
  draw() // 先出一帧，关闭动效偏好时也有静态点阵

  const ro = new ResizeObserver(() => {
    resize()
    if (!ticking) draw()
  })
  ro.observe(canvas)

  // 滚出视口就停掉循环，避免在后台空转
  const io = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) start()
    else stop()
  })
  io.observe(canvas)

  return () => {
    stop()
    ro.disconnect()
    io.disconnect()
  }
}

onMounted(() => {
  if (canvasRef.value) teardown = mount(canvasRef.value)
})

onBeforeUnmount(() => {
  teardown?.()
})
</script>

<template>
  <canvas ref="canvas" class="dot-wave" :style="rootStyle" aria-hidden="true"></canvas>
</template>

<style scoped>
.dot-wave {
  --dot-wave-fade: linear-gradient(to bottom, black 0%, transparent 100%);

  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;

  /* 系统色 Canvas 随 color-scheme 自动明暗，同时充当混合效果的不透明底板 */
  background: Canvas;

  mask-image: var(--dot-wave-fade);
  -webkit-mask-image: var(--dot-wave-fade);
}
</style>
