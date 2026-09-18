<!-- 本页面不处理任何实际数据，仅作欢迎页面 -->

<script setup lang="ts">
import { ref,useTemplateRef } from 'vue'
import Button from 'primevue/button'
import Marquee from './components/Marquee.vue'
import DotWave from './components/DotWave.vue'
import AngleDoubleRight from '@primeicons/vue/angle-double-right'
import Github from '@primeicons/vue/github'
import GrokCharacter from './components/GrokCharacter.vue'

const whiteColor = ref('#fff')

const posters = [
  '/placeholder/1.jpg',
  '/placeholder/2.jpg',
  '/placeholder/3.jpg',
  '/placeholder/4.jpg',
  '/placeholder/5.jpg',
  '/placeholder/6.jpg',
]
const titleWrap = useTemplateRef<HTMLElement>('titleWrap')

// spotLight 跟踪逻辑
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
</script>

<template>

  <!--这个是背景波纹-->
  <DotWave />

  <div ref="titleWrap" class="title-wrap" @mousemove="handleMouse" @mouseleave="handleLeave">
    <p class="title-text">孤独市集</p>
    <div class="lamp"></div>
  </div>

  <div class="slogan">
    <p>你说得对，但是 孤独市集 是一个非常神秘的网站。</p>

  </div>
  
  <div style="display: flex;justify-content: center;margin-top: 32px;">
    <GrokCharacter mode="onboarding" :size="120" :plate="whiteColor"/>
  </div>

  <div style="display:flex;justify-content: center;margin-top: 32px;flex-direction: row;">
    <Button rounded style="width: 130px; height: 40px;">
      <AngleDoubleRight :size="22" />
      Get Start
    </Button>
    <Button rounded style="width: 130px; height: 40px;margin-left: 8px;">
      <Github :size="22" />
      Github
    </Button>
  </div>
  
  <!-- 卡片视图：无缝向左循环流动 -->
  <Marquee class="marquee-row" :images="posters" :seconds-per-card="7" />
</template>

<style scoped>
.marquee-row {
  margin-top: 48px;
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
</style>
