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
  '/placeholder/1.webp',
  '/placeholder/2.webp',
  '/placeholder/3.webp',
  '/placeholder/4.webp',
  '/placeholder/5.webp',
  '/placeholder/6.webp',
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
    <p>欢迎来到孤独市集！这里是一个人也可以逛的校园二手市集。</p>
    <p>有一些闲置的东西，一些正在寻找新主人的东西，</p>
    <p>还有一些……不知道为什么会出现在这里的东西。随便看看，说不定就能淘到点好玩的。</p>
  </div>
  
  <div style="display: flex;justify-content: center;margin: 32px;">
    <GrokCharacter mode="onboarding" :size="120" :plate="whiteColor"/>
    <p style="font-size: 20px;margin-top: 16px;align-content: center;"><b>其实，我想说：<br>一个人逛，也挺好的。</b></p>
  </div>

  <div style="display:flex;justify-content: center;margin-top: 32px;flex-direction: row;">
    <Button rounded style="width: 130px; height: 40px;">
      <AngleDoubleRight :size="22" />
      逛市集
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

.slogan p{
  margin: 0;
}
.slogan {
  margin: 16px;
  text-align: center;
  font-family: 'Round', system-ui, sans-serif;
  display: flex;
  font-size: 16px;
  flex-direction: column;
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
