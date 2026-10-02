// createRouter：创建路由器实例；createWebHistory：HTML5 history 模式（URL 不带 #）
import { createRouter, createWebHistory } from 'vue-router'

// 欢迎页是落地页，用普通 import 同步打进主包——打开网站第一眼就是它，不能等网络再加载
import Welcome from '@/views/Welcome.vue'

/*
 * 路由结构：
 *   /        → 欢迎页（同步加载，打进主包，保证落地即渲染）
 *   /home/*  → Home 外壳（侧栏布局）+ 四个子页面，全部懒加载成独立 chunk
 *              （构建时能看到 Home.vue 等各自生成一个 .js 文件）
 *
 * createWebHistory 是 HTML5 history 模式：URL 不带 #，但部署到静态服务器时
 * 刷新非根路径需要配置 rewrite（把所有路径指回 index.html），否则 404。
 */
const router = createRouter({
  // import.meta.env.BASE_URL：部署的基础路径（默认 '/'），保持路由和部署路径一致
  history: createWebHistory(import.meta.env.BASE_URL),
  // 路由表：URL 匹配到哪条，就把对应的组件渲染进 <RouterView>
  routes: [
    {
      path: '/',              // 浏览器地址栏是 / 时命中
      name: 'welcome',        // 路由名，编程式跳转 router.push({ name: 'welcome' }) 时用
      component: Welcome,     // 渲染这个组件
    },
    {
      path: '/home',          // /home 是外壳路由，自己不直接显示内容
      name: 'home',
      meta: { transition: 'welcome-route' },
      // 箭头函数 + import() = 懒加载：只有第一次访问 /home 才下载这个 js 文件（独立 chunk）
      component: () => import('@/views/Home.vue'),
      // 访问 /home 时立刻重定向到子路由 home-main（/home/main）
      redirect: { name: 'home-main' },
      // children：子路由，渲染在 Home.vue 内部嵌套的 <RouterView> 里
      children: [
        {
          // 子路由的 path 不带 / 开头，最终 URL = 父 path + 这里 = /home/main
          path: 'main',
          name: 'home-main',
          component: () => import('@/views/Main.vue'),
        },
        {
          path: 'message',
          name: 'home-message',
          component: () => import('@/views/Message.vue'),
        },
        {
          path: 'agent',
          name: 'home-agent',
          component: () => import('@/views/Agent.vue'),
        },
        {
          path: 'map',
          name: 'home-map',
          component: () => import('@/views/Map.vue'),
        },
        {
          path: 'admin',
          name: 'home-admin',
          component: () => import('@/views/Admin.vue'),
        },
      ],
    },
  ],
  // 每次切换路由后把页面滚动回顶部（默认会保留上一个页面的滚动位置）
  scrollBehavior: () => ({ top: 0 }),
})

// 导出路由器实例，main.ts 里 .use(router) 装进应用
export default router
