<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

const props = withDefaults(
  defineProps<{
    dotSpacing?: number    // 点距（像素）：越小点越密
    dotRadius?: number     // 点半径
    waveLength?: number    // 波长：波带疏密
    waveGap?: number       // 空窗阈值：波带间空白的宽度
    waveSpeed?: number     // 波推进速度
    waveLift?: number      // 波带隆起幅度
    waveDrift?: number     // 叠加缓速起伏的幅度
    bendAmount?: number    // 波前弯曲深度
    bendFreq?: number      // 沿波前方向的弯曲密度
    bendSpeed?: number     // 弯曲形状变化速度
    fade?: string          // 底部渐隐遮罩（CSS 渐变字符串）
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

let teardown: (() => void) | undefined   // 清理函数：组件卸载时调用，停动画、断开观察器

function mount(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) return
  const ctx: CanvasRenderingContext2D = context

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let width = 0        // 画布 CSS 宽度
  let height = 0       // 画布 CSS 高度
  let frame = 0        // 帧计数器：动画的"时间轴"
  let ticking = false  // 动画循环是否在跑
  let dotColor = '#24231f'  // 点的颜色（每 30 帧从主题重新采样一次）
  let raf = 0          // requestAnimationFrame 返回的 id，取消动画时要用

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

    if (frame % COLOR_SAMPLE_FRAMES === 0) dotColor = getComputedStyle(canvas).color

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = dotColor   // 之后画的点都用这个颜色填充

    const cols = Math.ceil(width / dotSpacing) + 1
    const rows = Math.ceil(height / dotSpacing) + 1

    for (let gy = 0; gy < rows; gy++) {
      const y0 = gy * dotSpacing   // 该行点的纵坐标
      for (let gx = 0; gx < cols; gx++) {
        const x0 = gx * dotSpacing // 该列点的横坐标

        const proj = x0 * DIR_X + y0 * DIR_Y
        const perp = x0 * DIR_Y - y0 * DIR_X
        const bend = Math.sin(perp * bendFreq + frame * bendSpeed) * bendAmount
        const wave = Math.sin(((proj + bend) / waveLength) * Math.PI * 2 - frame * waveSpeed)

        let band = (wave - waveGap) / (1 - waveGap)
        if (band < 0) band = 0

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
    frame++                                        // 时间轴前进一帧
    draw()                                         // 画当前帧
    raf = requestAnimationFrame(loop)              // 请求浏览器下一帧再调一次 loop（约 60fps）
  }

  function start() {
    if (ticking || still) return
    ticking = true
    loop()
  }

  function stop() {
    ticking = false
    cancelAnimationFrame(raf)   // 按 id 取消下一帧请求，循环停止
  }

  resize()
  draw() // 先出一帧，关闭动效偏好时也有静态点阵

  const ro = new ResizeObserver(() => {
    resize()
    if (!ticking) draw()
  })
  ro.observe(canvas)

  const io = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) start()
    else stop()
  })
  io.observe(canvas)

  return () => {
    stop()
    ro.disconnect()   // 断开尺寸监听
    io.disconnect()   // 断开视口监听
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

  position: absolute;  /* 绝对定位：相对最近的定位祖先铺满，不挤占文档流 */
  inset: 0;            /* top/right/bottom/left 全为 0 = 铺满祖先 */
  z-index: -1;         /* 压到内容下层，做背景 */
  width: 100%;
  height: 100%;

  background: transparent;
  color: var(--app-text, #24231f);

  mask-image: var(--dot-wave-fade);
  -webkit-mask-image: var(--dot-wave-fade);  /* -webkit- 前缀：兼容旧版 Safari/Chrome */
}
</style>
