<!-- 本页面不处理任何实际数据，仅作欢迎页面 -->

<script setup lang="ts">
import { ref } from 'vue'
import { Search } from 'lucide-vue-next'
import SearchVue from './components/Search.vue'

const keyword = ref('')

function handleMouse(e: MouseEvent) {
  const lit = document.querySelector('.text-hid') as HTMLElement
  const r = lit.getBoundingClientRect()
  lit.style.setProperty('--x', `${e.clientX - r.left}px`)
  lit.style.setProperty('--y', `${e.clientY - r.top}px`)
}
function handleLeave() {
  const lit = document.querySelector('.text-hid') as HTMLElement
  lit.style.setProperty('--x', '-100px')
  lit.style.setProperty('--y', '-100px')
}

</script>

<template>
  <div class="background"></div>
  <div class="title-wrap" @mousemove="handleMouse" @mouseleave="handleLeave">
    <p class="title-text">孤独市集</p>
    <p class="title-text text-hid">孤独市集</p>
  </div>
  <div style="text-align: center;">
    <p style="font-family: 'Ding', system-ui, sans-serif;font-size: 16px;">我在工大很想你</p>
  </div>
  <div class="search">
    <SearchVue v-model="keyword" :icon="Search" type="text" background-color="#f2f3f5" border-color="none" border-radius="24px" height="50px" placeholder="搜索商品..." />
  </div>
  
</template>

<style scoped>
.background {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: radial-gradient(circle,
      currentColor 1.5px,
      transparent 1.5px);

  background-size: 52px 52px;

  /* 逐渐透明 */
  mask-image: linear-gradient(to bottom,
      black 0%,
      rgba(0, 0, 0, 0.7) 30%,
      rgba(0, 0, 0, 0.3) 65%,
      transparent 100%);

  -webkit-mask-image: linear-gradient(to bottom,
      black 0%,
      rgba(0, 0, 0, 0.7) 30%,
      rgba(0, 0, 0, 0.3) 65%,
      transparent 100%);
}

.search {
  max-width: 720px;
  margin: 12px auto;
  padding: 0 20px;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.title-wrap {
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

.text-hid {
  width: 70%;
  text-align: center;
  grid-area: 1 / 1;
  margin: 0;
  font-family: 'Ding', system-ui, sans-serif;
  font-size: 64px;
  color: #fff;
  background: #111;
  clip-path: circle(40px at var(--x, -100px) var(--y, -100px));
  pointer-events: none;
}
</style>
