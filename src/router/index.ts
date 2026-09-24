import { createRouter, createWebHistory } from 'vue-router'

import Welcome from '@/views/Welcome.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'welcome',
      component: Welcome,
    },
    {
      path: '/home',
      name: 'home',
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
      ],
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
