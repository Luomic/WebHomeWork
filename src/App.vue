<script setup lang="ts">
import { ref } from 'vue'
import { Search } from 'lucide-vue-next'
import SearchVue from './components/Search.vue'

const keyword = ref('')
</script>

<template>
  <div class="background"></div>
  <div style="text-align: center; margin-top: 20px;">
    <p class="title-text">孤独市集</p>
  </div>
  <div class="demo">
    <SearchVue v-model="keyword" :icon="Search" type="text" background-color="#f2f3f5" border-color="none"
      border-radius="32px" height="64px" placeholder="搜索商品..." />
  </div>
</template>

<style scoped>
.background {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: radial-gradient(
    circle,
    currentColor 1.5px,
    transparent 1.5px
  );

  background-size: 48px 48px;

  /* 从上到下逐渐透明 */
  mask-image: linear-gradient(
    to bottom,
    black 0%,
    rgba(0, 0, 0, 0.7) 30%,
    rgba(0, 0, 0, 0.3) 65%,
    transparent 100%
  );

  -webkit-mask-image: linear-gradient(
    to bottom,
    black 0%,
    rgba(0, 0, 0, 0.7) 30%,
    rgba(0, 0, 0, 0.3) 65%,
    transparent 100%
  );
}
.demo {
  max-width: 720px;
  margin: 48px auto;
  padding: 0 20px;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.demo section {
  margin-bottom: 32px;
}

.title-text {
  font-family: 'Ding', system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: 64px;
}
</style>
