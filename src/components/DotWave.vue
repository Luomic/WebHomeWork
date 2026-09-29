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
// withDefaults + defineProps：定义组件的 props 及默认值。
// 类型里带 ? 的表示可不传；使用方写 <DotWave :dot-spacing="64"> 传进来。
// 注意模板里写小写连字符 dot-spacing，TS 里是驼峰 dotSpacing——Vue 自动转换
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

// computed：计算属性——依赖（props.fade）不变就缓存结果，变了才重算。
// 这里把 fade 渐变包成 CSS 变量对象，绑到模板的 :style 上
const rootStyle = computed(() => ({ '--dot-wave-fade': props.fade }))

// useTemplateRef：拿到模板里 ref="canvas" 那个 DOM 元素（Vue 3.5 的新写法，
// 老写法是 ref(null) + 模板同名）。泛型 <HTMLCanvasElement> 声明元素类型，后面有代码提示
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

const DIR_X = -Math.SQRT1_2 // 传播方向单位向量，指向左下
const DIR_Y = Math.SQRT1_2

const MAX_DPR = 2 // 高分屏最多按 2 倍渲染，再往上只烧性能
const COLOR_SAMPLE_FRAMES = 30 // 每隔多少帧重新取一次主题色

let teardown: (() => void) | undefined   // 清理函数：组件卸载时调用，停动画、断开观察器

function mount(canvas: HTMLCanvasElement) {
  // getContext('2d')：取得 Canvas 的 2D 绘图上下文，之后所有的画都靠它
  const context = canvas.getContext('2d')
  // 理论上拿不到（老浏览器）就放弃初始化
  if (!context) return
  const ctx: CanvasRenderingContext2D = context

  // devicePixelRatio：屏幕物理像素/CSS 像素之比（高分屏=2 或 3）；按比例渲染才不模糊
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  // 检测系统是否开了"减少动态效果"：开了就只画静态一帧
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let width = 0        // 画布 CSS 宽度
  let height = 0       // 画布 CSS 高度
  let frame = 0        // 帧计数器：动画的"时间轴"
  let ticking = false  // 动画循环是否在跑
  let dotColor = '#24231f'  // 点的颜色（每 30 帧从主题重新采样一次）
  let raf = 0          // requestAnimationFrame 返回的 id，取消动画时要用

  function resize() {
    // getBoundingClientRect：元素在页面上的实际尺寸（CSS 像素）
    const rect = canvas.getBoundingClientRect()
    width = rect.width
    height = rect.height
    // 画布的物理像素尺寸设为 CSS 尺寸 × dpr，保证高分屏清晰
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    // setTransform：把坐标系缩放 dpr 倍，之后照常按 CSS 像素画，不用自己乘
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function draw() {
    // 解构赋值：把 props 里的数值一次取出来，下面写起来短一些
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

    // clearRect：清掉上一帧的画面（Canvas 不会自动清，不清会叠影）
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = dotColor   // 之后画的点都用这个颜色填充

    // 网格能覆盖整个画布所需的列数/行数（+1 补边缘）；Math.ceil 向上取整
    const cols = Math.ceil(width / dotSpacing) + 1
    const rows = Math.ceil(height / dotSpacing) + 1

    // 双层 for 遍历每个网格点：gy 是行、gx 是列
    for (let gy = 0; gy < rows; gy++) {
      const y0 = gy * dotSpacing   // 该行点的纵坐标
      for (let gx = 0; gx < cols; gx++) {
        const x0 = gx * dotSpacing // 该列点的横坐标

        // proj：沿传播轴的分量，决定波带的前后顺序
        // perp：沿波前方向的分量，用来把等相位线掰成曲线
        const proj = x0 * DIR_X + y0 * DIR_Y
        const perp = x0 * DIR_Y - y0 * DIR_X
        // Math.sin：正弦函数，输入随距离/帧数连续变化 → 输出在 -1~1 间连续起伏 = 波
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

        // globalAlpha：画这个点时的不透明度，0.09~1 之间，波峰亮波谷几乎看不见
        ctx.globalAlpha = 0.09 + 0.91 * band
        // beginPath + arc + fill：开一条新路径 → 画一个圆（圆心 x,y 半径 r，0 到 2π 整圆）→ 填色
        ctx.beginPath()
        // 半径也随波形微缩放：0.5r ~ 1.6r，波峰的点更大
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
    // 已在跑、或用户要求减少动效，就不启动
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

  // ResizeObserver：监听元素尺寸变化（窗口拉伸等），变了就重设画布并补一帧
  const ro = new ResizeObserver(() => {
    resize()
    if (!ticking) draw()
  })
  ro.observe(canvas)

  // 滚出视口就停掉循环，避免在后台空转
  // IntersectionObserver：监听元素是否进入视口
  const io = new IntersectionObserver((entries) => {
    // isIntersecting：true = 可见，开动画；false = 滚出屏幕，停动画省 CPU
    if (entries[0]?.isIntersecting) start()
    else stop()
  })
  io.observe(canvas)

  // 返回清理函数：给 onBeforeUnmount 用
  return () => {
    stop()
    ro.disconnect()   // 断开尺寸监听
    io.disconnect()   // 断开视口监听
  }
}

// onMounted：组件挂载（DOM 已生成）后执行；这时才能拿到 canvas 元素
onMounted(() => {
  // canvasRef.value：ref 的实际值放 .value 里（模板里不用 .value）
  if (canvasRef.value) teardown = mount(canvasRef.value)
})

// 组件卸载前执行清理，防止定时器/观察器残留
onBeforeUnmount(() => {
  // ?. 可选链：teardown 未定义时不调用，不报错
  teardown?.()
})
</script>

<template>
  <!-- canvas：画布元素，位图由 JS 逐帧绘制。
       ref="canvas"：给元素起名，脚本里用 useTemplateRef('canvas') 拿到它；
       class="dot-wave"：配套样式在下方 <style scoped>；
       :style="rootStyle"：冒号=绑定 JS 表达式，把 CSS 变量对象挂上去；
       aria-hidden="true"：告诉读屏软件"这是纯装饰，别读出来"（无障碍） -->
  <canvas ref="canvas" class="dot-wave" :style="rootStyle" aria-hidden="true"></canvas>
</template>

<!-- scoped：样式只作用于本组件的元素（编译时给元素加 data-v-xxx 属性并改写选择器） -->
<style scoped>
.dot-wave {
  /* 默认的渐隐遮罩，会被脚本里的 rootStyle 传进来的同名变量覆盖 */
  --dot-wave-fade: linear-gradient(to bottom, black 0%, transparent 100%);

  position: absolute;  /* 绝对定位：相对最近的定位祖先铺满，不挤占文档流 */
  inset: 0;            /* top/right/bottom/left 全为 0 = 铺满祖先 */
  z-index: -1;         /* 压到内容下层，做背景 */
  width: 100%;
  height: 100%;

  background: transparent;
  /* 点的颜色继承 --app-text 主题变量；后面 JS 用 getComputedStyle 采样这个 color */
  color: var(--app-text, #24231f);

  /* mask-image：遮罩——渐变里"不透明处显示、透明处隐藏"，做出底部渐隐 */
  mask-image: var(--dot-wave-fade);
  -webkit-mask-image: var(--dot-wave-fade);  /* -webkit- 前缀：兼容旧版 Safari/Chrome */
}
</style>
