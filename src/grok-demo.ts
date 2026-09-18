/**
 * grok-demo.html 的入口 —— Grok 角色复刻演示页。
 * 与 src/main.ts 平级，互不影响（App.vue 的欢迎页保持原样）。
 */
import { createApp } from 'vue'

import GrokDemo from './views/GrokDemo.vue'
import './assets/css/font.css'

createApp(GrokDemo).mount('#app')
