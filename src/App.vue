<script setup lang="ts">
// script setup：Vue 3 的语法糖——这里声明的变量/函数在 <template> 里直接可用，不用 return
// lang="ts"：使用 TypeScript
// 从 vue 导入需要的 API：
//   onBeforeUnmount：组件卸载前触发的生命周期钩子（这里用来清理事件监听）
//   provide：向所有后代组件"提供"一个值（后代用 inject 取，不用一层层传 props）
//   ref：创建响应式数据（值变了页面自动跟着变；脚本里读写要 .value）
//   watch：监听某个响应式数据，变化时执行回调
import { onBeforeUnmount, provide, ref, watch } from 'vue'
// RouterView：路由出口组件，URL 匹配到的页面组件会渲染在它这个位置
import { RouterView } from 'vue-router'

// `.to-dark` 挂在 <html> 上而不是应用根节点：PrimeVue 会把 Dialog 等浮层传送到 body，
// 只有放在 html 上，这些浮层才能同时拿到 PrimeVue 暗色色板和下方的 --app-* 变量。
// 初始值由 index.html 中的内联脚本在首帧前写入，这里直接读取即可。
// documentElement 就是 <html> 根元素（比 document.body 更外层）
const root = document.documentElement
// ref(...)：包一层让它变成响应式；初始值 = 首帧前 index.html 脚本有没有给 html 加 to-dark
const isDark = ref(root.classList.contains('to-dark'))
// watch(要监听的数据, 回调)：isDark 一变，就同步给 <html> 加/减 to-dark 类
// 脚本里改 ref 必须写 .value；模板里不用——新手最容易错的就是这里
watch(isDark, value => root.classList.toggle('to-dark', value))

// 只有手动切换才写入 localStorage；未写入时持续跟随系统主题变化。
// matchMedia：向浏览器查询媒体查询结果，这里查询"系统是否为暗色模式"
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
// 系统主题切换时触发：只有用户从没手动选过主题（localStorage 里没存），才跟随系统
function followSystem(event: MediaQueryListEvent) {
  let saved = null
  // try/catch：隐私模式下读 localStorage 可能抛异常，吞掉
  try { saved = localStorage.getItem('jh-theme') } catch {}
  // event.matches：新的系统主题是否为暗色
  if (!saved) isDark.value = event.matches
}
// addEventListener 的第二个参数是回调函数；系统主题一变就调用 followSystem
systemDark.addEventListener('change', followSystem)
// 组件卸载前把监听器摘掉，防止重复注册（虽然 App 基本不会卸载，写上是好习惯）
onBeforeUnmount(() => systemDark.removeEventListener('change', followSystem))

// 向所有后代组件提供 isDark（后代 inject('isDark') 拿到的是同一个 ref）
provide('isDark', isDark)
// 提供切换主题的函数：取反 → 存进 localStorage（下次刷新以它为准）
provide('toggleTheme', () => {
  isDark.value = !isDark.value
  try { localStorage.setItem('jh-theme', isDark.value ? 'dark' : 'light') } catch {}
})
</script>

<template>
  <!-- class="app-shell"：应用外壳，配套样式在下面 <style> 里（铺背景色、占满视口高） -->
  <div class="app-shell">
    <RouterView v-slot="{ Component, route }">
      <Transition :name="String(route.meta.transition ?? 'page')">
        <div v-if="Component" :key="route.matched[0]?.path" class="route-page">
          <component :is="Component" />
        </div>
      </Transition>
    </RouterView>
  </div>
</template>

<!-- 注意：这里没有 scoped——下面的样式是全局的，因为要覆盖 PrimeVue
     传送到 body 的浮层（Dialog 等），scoped 样式够不到它们 -->
<style>
/* 全站颜色统一走这组变量，页面样式不再写死黑白色值，暗色只需在这里改一处。
 * --app-field：输入框、卡片、气泡等"纸面"；--app-muted / --app-faint：次要 / 更弱的文字；
 * --app-line：页面内分隔线；--app-hover：悬停与选中底色；--app-map-*：无地图 Key 时的校区示意图。
 * 需要反色强调（选中按钮、我方气泡）时直接用 --app-text 作底、--app-bg 作字。 */
/* :root = <html> 根元素；这里定义的变量全站可用（var(--app-xxx) 引用） */
:root {
  /* color-scheme：告诉浏览器当前是亮色，让滚动条/表单控件按亮色渲染 */
  color-scheme: light;
  --app-bg: #f7f5ef; --app-surface: #fcfbf8; --app-field: #fff; --app-text: #24231f;
  --app-muted: #777; --app-faint: #999; --app-border: #dedbd3; --app-line: #ddd; --app-hover: #ebebe7;
  --app-map-bg: #eeefea; --app-map-road: #dfdfdb; --app-map-river: #d4deda; --app-map-label: #92968e;
  --grok-plate: #f7f5ef;
  --app-shadow: rgb(0 0 0 / 8%);
}
/* :root.to-dark：html 上有 to-dark 类时（暗色模式）启用这组变量 */
:root.to-dark {
  color-scheme: dark;
  --app-bg: #1f1e1b; --app-surface: #292722; --app-field: #2f2d28; --app-text: #f2eee5;
  --app-muted: #aaa598; --app-faint: #8c877c; --app-border: #514d45; --app-line: #3e3b35; --app-hover: #3a3731;
  --app-map-bg: #262521; --app-map-road: #36342e; --app-map-river: #2e3835; --app-map-label: #7f7b71;
  --grok-plate: #292722;
  --app-shadow: rgb(0 0 0 / 24%);
}
/* PrimeVue 的输入框与次要按钮默认是冷色 zinc/slate 色板，改为引用上面的暖色变量。
 * PrimeVue 运行时注入的变量选择器是 `:root,:host` 且位置在后，这里用 html:root 提高优先级，避免被覆盖。
 * 另：PrimeVue 5 的色值使用 light-dark()，依赖上面 color-scheme 的切换。 */
/* html:root：等价于 html 匹配 :root，多写一层类选择器提高权重（0-1-1 > 0-1-0），
 * 确保盖过 PrimeVue 运行时注入的同名变量。 */
html:root {
  --p-form-field-background: var(--app-field); --p-form-field-color: var(--app-text);
  --p-form-field-border-color: var(--app-line); --p-form-field-hover-border-color: var(--app-faint);
  --p-form-field-placeholder-color: var(--app-faint);
  --p-button-secondary-background: var(--app-hover); --p-button-secondary-border-color: var(--app-hover); --p-button-secondary-color: var(--app-text);
  --p-button-secondary-hover-background: var(--app-line); --p-button-secondary-hover-border-color: var(--app-line); --p-button-secondary-hover-color: var(--app-text);
  --p-select-background: var(--app-field); --p-select-color: var(--app-text); --p-select-border-color: var(--app-border);
  --p-select-overlay-background: var(--app-surface); --p-select-overlay-color: var(--app-text); --p-select-overlay-border-color: var(--app-border);
  --p-select-option-color: var(--app-text); --p-select-option-focus-background: var(--app-hover); --p-select-option-focus-color: var(--app-text);
  --p-select-option-selected-background: var(--app-hover); --p-select-option-selected-color: var(--app-text);
  --p-select-option-selected-focus-background: var(--app-hover); --p-select-option-selected-focus-color: var(--app-text);
  --p-togglebutton-background: var(--app-surface); --p-togglebutton-color: var(--app-muted); --p-togglebutton-border-color: var(--app-border);
  --p-togglebutton-hover-background: var(--app-hover); --p-togglebutton-hover-color: var(--app-text);
  --p-togglebutton-checked-background: var(--app-text); --p-togglebutton-checked-color: var(--app-bg); --p-togglebutton-checked-border-color: var(--app-text);
  --p-togglebutton-content-checked-background: var(--app-text); --p-togglebutton-content-checked-shadow: none;
  --p-inputtext-background: var(--app-field); --p-inputtext-color: var(--app-text); --p-inputtext-border-color: var(--app-border);
  --p-textarea-background: var(--app-field); --p-textarea-color: var(--app-text); --p-textarea-border-color: var(--app-border);
}
/* html、body、#app 至少撑满视口高；body 铺底色和默认文字色 */
html, body, #app { min-height: 100%; }
body { background: var(--app-bg); color: var(--app-text); }
.app-shell { min-height: 100vh; background: var(--app-bg); color: var(--app-text); }
/* PrimeVue Sidebar 的 DOM 由组件内部生成，使用全局选择器覆盖其默认纯白背景。
 * 只匹配 sidebar 系列组件；[data-pc-section="root"] 会命中所有 PrimeVue 按钮，把它们的底色也盖掉。 */
/* :where()：括号里的选择器权重按 0 计算，方便以后用普通类覆盖；
 * [data-pc-name^="sidebar"]：属性选择器，^= 表示"以 sidebar 开头"，
 * 命中 PrimeVue 渲染出的 sidebar 系列组件（PrimeVue 会在 DOM 上标记组件名） */
.app-shell :where([data-pc-name^="sidebar"], .p-sidebar) { background: var(--app-surface) !important; color: var(--app-text); }
/* [data-pc-name="sidebar"] * ：sidebar 组件内所有元素，统一分隔线颜色 */
.app-shell :where([data-pc-name="sidebar"] *) { border-color: var(--app-border); }
/* Dialog 被 PrimeVue 传送到 body、位于 .app-shell 之外，所以这里不能加 .app-shell 前缀。 */
/* 只给根节点上色：header/content 是直角，若也铺背景会盖住根节点的圆角。 */
:where(.p-dialog) { background: var(--app-surface) !important; color: var(--app-text) !important; border-color: var(--app-border) !important; }
:where(.p-dialog-content input, .p-dialog-content textarea, .p-dialog-content select) { background: var(--app-bg) !important; color: var(--app-text) !important; border-color: var(--app-border) !important; }
/* ::placeholder：输入框占位文字的伪元素；color-mix：把文字色混入 55% 透明度做出弱化灰 */
:where(.p-dialog-content input::placeholder, .p-dialog-content textarea::placeholder) { color: color-mix(in srgb, var(--app-text) 55%, transparent) !important; }
:where(.post-form, .login-form) { color: var(--app-text); }
:where(.post-form > p, .post-preview small, .login-intro p) { color: color-mix(in srgb, var(--app-text) 60%, transparent) !important; }
/* 顶部快捷按钮显式指定前景/背景，避免 PrimeVue contrast 色板在浅色主题下把文字和按钮都变成白色。 */
:where(.header-action, .theme-action, .ink-button) { appearance: none; background: var(--app-text) !important; color: var(--app-bg) !important; border: 1px solid var(--app-text) !important; }
/* :hover：鼠标悬停时触发；brightness(.9)：滤镜把亮度降一档，做出"按下去变暗"效果 */
:where(.header-action:hover, .theme-action:hover, .ink-button:hover) { filter: brightness(.9); }
:where(.theme-action) { background: transparent !important; color: var(--app-text) !important; border-color: var(--app-border) !important; }
/* :disabled：禁用状态的按钮降透明度，视觉上"不可点" */
:where(.ink-button:disabled, .header-action:disabled) { opacity: .5; }
/* 地图 SDK 与弹层不处于页面 scoped 样式范围，统一引用根节点主题变量。 */
/* transition: background .16s, color .16s：背景和文字色变化用 0.16 秒过渡，不生硬跳变 */
.market-price-pin { border: 1px solid var(--app-muted); border-radius: 22px; padding: 7px 13px; background: var(--app-field); color: var(--app-text); font: 600 13px/1.3 system-ui,sans-serif; white-space: nowrap; cursor: pointer; box-shadow: 0 2px 6px var(--app-shadow); transition: background .16s,color .16s; }
/* .is-selected：JS 里给选中元素加上的类（BEM 常见的 is- 前缀表示状态） */
.market-price-pin.is-selected { background: var(--app-text); color: var(--app-bg); border-color: var(--app-text); }
/* :focus-visible：键盘 Tab 聚焦时才显示的描边（鼠标点击不显示），无障碍必备 */
.market-price-pin:focus-visible { outline: 2px solid var(--app-text); outline-offset: 3px; }
.post-composer-dialog, .place-picker-dialog, .market-detail-dialog { font-family: system-ui,sans-serif; }
.p-select-overlay { color: var(--app-text); background: var(--app-surface); }
/* @media(max-width:600px)：媒体查询——手机档（视口宽 ≤600px）才应用大括号里的规则 */
@media(max-width:600px) {
  /* 100vw = 视口全宽；100dvh = 动态视口高（手机地址栏收起/展开会自动修正）；
   * !important：强行压过 PrimeVue 自带的弹窗宽高限制，做成全屏弹层 */
  .post-composer-dialog, .place-picker-dialog { width: 100vw !important; max-width: 100vw !important; height: 100dvh; max-height: 100dvh !important; margin: 0; border-radius: 0 !important; }
  /* flex: 1：让内容区吃掉弹窗剩余高度；env(safe-area-inset-bottom)：避开 iPhone 底部小黑条 */
  .post-composer-dialog .p-dialog-content, .place-picker-dialog .p-dialog-content { flex: 1; padding: 0 16px 20px; }
  .post-composer-dialog .p-dialog-header, .place-picker-dialog .p-dialog-header { padding: 18px 16px; }
  .post-composer-dialog .p-dialog-footer, .place-picker-dialog .p-dialog-footer { padding: 12px 16px max(12px,env(safe-area-inset-bottom)); border-top: 1px solid var(--app-border); }
}
.route-page { min-height: 100dvh; background: var(--app-bg); }
.page-leave-active, .welcome-route-leave-active { position: absolute; inset: 0; pointer-events: none; }
.page-enter-active, .welcome-route-enter-active { position: relative; z-index: 1; }
.page-enter-active,
.page-leave-active { transition: opacity .3s ease, transform .3s ease; }

.page-enter-from { opacity: 0; transform: translateY(10px); }
.page-leave-to { opacity: 0; transform: translateY(-8px); }

.welcome-route-enter-active,
.welcome-route-leave-active {
  transition: opacity .62s cubic-bezier(.22, 1, .36, 1), transform .72s cubic-bezier(.22, 1, .36, 1), clip-path .72s cubic-bezier(.22, 1, .36, 1), filter .5s ease;
  will-change: opacity, transform, clip-path;
  clip-path: inset(0 round 0px);
}
.welcome-route-enter-from { opacity: 0; transform: translate3d(6vw, 0, 0) scale(.985); clip-path: inset(0 0 0 12% round 28px); filter: blur(4px); }
.welcome-route-leave-to { opacity: 0; transform: translate3d(-2vw, 0, 0) scale(1.015); clip-path: inset(0 10% 0 0 round 28px); filter: blur(2px); }

/* prefers-reduced-motion：尊重系统"减少动态效果"设置，把所有动画压到接近 0 */
@media (prefers-reduced-motion: reduce) {
  .app-shell *, .p-dialog *, .p-select-overlay *, .market-price-pin, .p-dialog, .p-dialog-mask {
    animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important;
  }
  .page-enter-active,
  .page-leave-active,
  .welcome-route-enter-active,
  .welcome-route-leave-active {
    transition: none;
  }
  .page-enter-from, .page-leave-to, .welcome-route-enter-from, .welcome-route-leave-to {
    opacity: 1; transform: none; clip-path: none; filter: none;
  }
}
</style>
