// createApp：Vue 的应用工厂函数，用它创建一个应用实例，之后链式调用 use/mount
import { createApp } from "vue";
// PrimeVue 的配置组件（注意是 primevue/config，不是某个 UI 组件），作为插件安装后全局可用
import PrimeVue from "primevue/config";
// definePreset：基于一套现有主题生成"改过部分颜色"的新主题
import { definePreset } from "@primeuix/themes";
// Aura：PrimeVue 官方的基础主题，作为 NoirPreset 的底子
import Aura from "@primeuix/themes/aura";

// 根组件：整个应用的模板从 App.vue 开始渲染
import App from "./App.vue";
// 路由实例：来自 src/router/index.ts（import 目录名时自动找里面的 index.ts）
import router from "./router";
// 导入全局字体样式（@font-face 声明）；CSS 只有副作用没有导出，直接 import 即可
import "./assets/css/font.css";
// 导入 Tailwind CSS（里面还有 @import 嵌套引用，由插件展开）
import "./assets/css/tailwind.css";

/*
 * NoirPreset：把 PrimeVue 默认的蓝色 primary 换成黑色系，配合站内
 * --app-* 变量实现"白底黑字"的极简风格。改组件主色改这里（或用 preset 变量），
 * 不要去和 .p-button 等运行时注入的选择器拼权重——同权重时后注入的会赢。
 *
 * darkModeSelector: '.to-dark'：暗色模式的开关类名。App.vue 把它挂在 <html> 上，
 * Tailwind 侧的 dark: 变体也钉在同一个类（见 tailwind.css 的 @custom-variant），
 * 两套体系（PrimeVue 变量 + Tailwind 类）随同一个类切换。
 *
 * cssLayer：把 PrimeVue 样式放进 layer，控制它和 tailwind/base 的先后顺序。
 */
const NoirPreset = definePreset(Aura, {
  // semantic：语义色分组（primary / surface 等），组件内部统一引用这些语义名
  semantic: {
    // primary：主色，50 最浅 → 950 最深；这里把蓝色阶替换成灰色阶（黑色系）
    primary: {
      50: "#f7f7f7",
      100: "#ededed",
      200: "#e0e0e0",
      300: "#c9c9c9",
      400: "#a3a3a3",
      // 500 是主色本体：纯黑，按钮默认底色就是它
      500: "#000000",
      600: "#3a3a3a",
      700: "#262626",
      800: "#4d4d4d",
      900: "#666666",
      950: "#0a0a0a",
      // 引用上面的色阶：{primary.500} 是主题内的变量占位符写法
      color: "{primary.500}",
      // contrastColor：压在主色上面的文字/图标颜色（黑底上用白字）
      contrastColor: "#ffffff",
      // 悬停/按下时分别用更深一档的色阶
      hoverColor: "{primary.600}",
      activeColor: "{primary.700}",
    },
  },
});

// 创建应用 → 装插件 → 挂载到 index.html 里的 <div id="app">
createApp(App)
  // 安装 PrimeVue 插件并传入主题配置
  .use(PrimeVue, {
    theme: {
      // 使用上面定义的黑色系预设，不用默认 Aura 原样
      preset: NoirPreset,
      options: {
        // 当 <html> 上有 .to-dark 类时，PrimeVue 的暗色变量生效
        darkModeSelector: ".to-dark",
      },
      cssLayer: {
        // PrimeVue 样式打包进名为 primevue 的 CSS @layer
        name: "primevue",
        // layer 优先级：越靠后越高。primevue 排最后 → 覆盖 tailwind 的 base
        order: "theme, base, primevue",
      },
    },
    // 社区版许可密钥（PrimeVue 5 要求在应用初始化时传入）
    license:
      "eyJpZCI6IjRmYzFhZTZhLTZiMTItNGZhMi05YWNjLTgzMzU3ZjU4NDhmYSIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODk2NDcwNTAsImV4cCI6MTgyMTE4MzA1MH0.11ja55lut0HRzd-YIJXqaLNswCRCROdw9M_yS7og8y9Z0i6K5h03-HO3BGlusBX2gL02tfd84PA79jtwl76cDA",
  })
  // 安装 vue-router：之后模板里才能用 <RouterView>、<RouterLink>
  .use(router)

  // 把应用真正渲染进 index.html 的 #app 元素里（前面都只是"准备"，这一步才开始画）
  .mount("#app");
