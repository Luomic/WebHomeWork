import { createRouter, createWebHistory } from 'vue-router'

import Welcome from '@/views/Welcome.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
      component: () => import('@/views/Home.vue'),
      redirect: { name: 'home-main' },
      children: [
        {
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
  scrollBehavior: () => ({ top: 0 }),
})

export default router
