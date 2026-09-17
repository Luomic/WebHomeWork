<!-- 本页面不处理任何实际数据，仅作欢迎页面 -->

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { Search } from 'lucide-vue-next'
import Button from 'primevue/button'
import Card from './components/Card.vue'
import SearchBar from './components/Search.vue'

const keyword = ref('')
const titleWrap = useTemplateRef<HTMLElement>('titleWrap')
const bgCanvas = useTemplateRef<HTMLCanvasElement>('bgCanvas')

function handleMouse(e: MouseEvent) {
  const el = titleWrap.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--x', `${e.clientX - rect.left}px`)
  el.style.setProperty('--y', `${e.clientY - rect.top}px`)
}

function handleLeave() {
  const el = titleWrap.value
  if (!el) return
  el.style.setProperty('--x', '-200px')
  el.style.setProperty('--y', '-200px')
}

/* ---------------- AI 波形算法 ---------------- */

const WAVE_LENGTH = 200 // 波长，控制波带疏密
const WAVE_GAP = -0.3 // 空窗阈值，越大空窗越宽
const WAVE_SPEED = 0.02 // 推进速度，越小越舒缓
const WAVE_LIFT = 9 // 波带隆起幅度
const WAVE_DRIFT = 2.2 // 叠加的缓速起伏幅度

const WAVE_BEND_AMOUNT = 34 // 弯曲深度，0 则退回笔直斜线
const WAVE_BEND_FREQ = 0.014 // 沿波前方向的弯曲密度
const WAVE_BEND_SPEED = 0.015 // 弯曲形状自身的变化速度

const DOT_SPACING = 52 // 点距，与原先的 background-size 一致
const DOT_RADIUS = 1.5 // 点半径，与原先的 radial-gradient 一致

const DIR_X = -Math.SQRT1_2 // 传播方向单位向量，指向左下
const DIR_Y = Math.SQRT1_2

let bgStop: (() => void) | undefined

function mountBackground(canvas: HTMLCanvasElement) {


  const context = canvas.getContext('2d')
  if (!context) return
  const ctx: CanvasRenderingContext2D = context

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
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
    if (frame % 30 === 0) dotColor = getComputedStyle(canvas).color

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = dotColor

    const cols = Math.ceil(width / DOT_SPACING) + 1
    const rows = Math.ceil(height / DOT_SPACING) + 1

    for (let gy = 0; gy < rows; gy++) {
      const y0 = gy * DOT_SPACING
      for (let gx = 0; gx < cols; gx++) {
        const x0 = gx * DOT_SPACING

        // proj：沿传播轴的分量，决定波带的前后顺序
        // perp：沿波前方向的分量，用来把等相位线掰成曲线
        const proj = x0 * DIR_X + y0 * DIR_Y
        const perp = x0 * DIR_Y - y0 * DIR_X
        const bend = Math.sin(perp * WAVE_BEND_FREQ + frame * WAVE_BEND_SPEED) * WAVE_BEND_AMOUNT
        const wave = Math.sin(((proj + bend) / WAVE_LENGTH) * Math.PI * 2 - frame * WAVE_SPEED)

        // 只保留波形高于阈值的部分，波带之间便自然留出空窗
        let band = (wave - WAVE_GAP) / (1 - WAVE_GAP)
        if (band < 0) band = 0

        // 缓速交叉起伏 + 波带自身的隆起
        const dy =
          Math.sin(x0 * 0.012 + frame * 0.021) * WAVE_DRIFT +
          Math.sin(y0 * 0.015 - frame * 0.017) * WAVE_DRIFT +
          wave * WAVE_LIFT

        ctx.globalAlpha = 0.09 + 0.91 * band
        ctx.beginPath()
        ctx.arc(x0, y0 + dy, DOT_RADIUS * (0.5 + 1.1 * band), 0, Math.PI * 2)
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
  if (bgCanvas.value) bgStop = mountBackground(bgCanvas.value)
})

onBeforeUnmount(() => {
  bgStop?.()
})
</script>

<template>
  <canvas ref="bgCanvas" class="background" aria-hidden="true"></canvas>

  <div
    ref="titleWrap"
    class="title-wrap"
    @mousemove="handleMouse"
    @mouseleave="handleLeave"
  >
    <p class="title-text">孤独市集</p>
    <div class="lamp"></div>
  </div>

  <div class="slogan">
    <p>我在工大很想你</p>
    <Button>Hello World</Button>
  </div>

  <div class="search">
    <SearchBar
      v-model="keyword"
      :icon="Search"
      type="text"
      background-color="#f2f3f5"
      border-color="none"
      border-radius="24px"
      height="50px"
      placeholder="搜索商品..."
    />
  </div>

  <!-- 卡片视图 -->
  <div class="first-card">
    <Card src="/placeholder/1.jpg" width="200px" />
    <Card src="/placeholder/2.jpg" width="200px" />
    <Card src="/placeholder/3.jpg" width="200px" />
  </div>
</template>

<style scoped>
.background {
  --fade: linear-gradient(
    to bottom,
    black 0%,
    rgba(0, 0, 0, 0.7) 30%,
    rgba(0, 0, 0, 0.3) 65%,
    transparent 100%
  );

  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  background: Canvas;
  mask-image: var(--fade);
  -webkit-mask-image: var(--fade);
}

.search {
  max-width: 720px;
  margin: 12px auto;
  padding: 0 20px;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.slogan {
  text-align: center;
  font-family: 'Round', system-ui, sans-serif;
  font-size: 16px;
}

.title-wrap {
  position: relative;
  display: grid;
  justify-items: center;
  margin-top: 32px;
}

.title-text {
  grid-area: 1 / 1;
  margin: 0;
  font-family: 'Ding', system-ui, sans-serif;
  font-size: 64px;
}

.lamp {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: #fff;
  mix-blend-mode: difference;
  clip-path: circle(40px at var(--x, -200px) var(--y, -200px));
}

.first-card {
  display: flex;
}
</style>
