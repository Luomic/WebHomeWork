<!-- 本页面不处理任何实际数据，仅作欢迎页面 -->

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import Button from 'primevue/button'
import Marquee from '@/components/Marquee.vue'
import DotWave from '@/components/DotWave.vue'
import AngleDoubleRight from '@primeicons/vue/angle-double-right'
import Github from '@primeicons/vue/github'
import GrokCharacter from '@/components/GrokCharacter.vue'


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

function handlePointer(e: PointerEvent) {
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
  <div class="button-group">
    <Button rounded class="button-get">
      <AngleDoubleRight :size="22" />
      逛市集
    </Button>
    <Button rounded class="button-gett">
      <Github :size="22" />
      Github
    </Button>
  </div>
  <div class="hero">
    <div class="left-title">
      <div ref="titleWrap" class="title-wrap" @pointermove="handlePointer" @pointerleave="handleLeave">
        <p class="title-text">孤独市集</p>
        <div class="lamp"></div>
      </div>

      <div class="slogan">
        欢迎来到孤独市集，
        一个人也可以逛的校园二手市集。<br>
        这里有一些闲置的东西，
        一些正在寻找新主人的东西。<br>
        或许......可能还会有一些神秘的珍藏？随便看看，说不定就能淘到点好玩的。
      </div>
    </div>

    <div class="right-title">
      <GrokCharacter mode="onboarding" :size="120" :plate="whiteColor" style="margin-top: 16px;" />
      <div class="re-text">
        <p class="re-content">其实，我想说：</p>
        <br>
        <p class="re-content"><b>一个人逛，也挺好的。</b></p>
      </div>
    </div>
  </div>

  <!-- 卡片视图：无缝向左循环流动 -->
  <Marquee class="marquee-row" :images="posters" :seconds-per-card="7" borderRadius="20px" />
</template>

<style scoped>

.hero {
  display: flex;
  flex-direction: row;
}

.button-group {
  display: flex;
  flex-direction: row;
  margin-top: 16px;
}

.button-get,
.button-gett {
  width: 140px;
  height: 45px;
}

.button-get {
  margin-left: auto;
}

.button-gett {
  margin-left: 16px;
  margin-right: 16px;
}

.left-title {
  display: flex;
  flex-direction: column;
  width: 50%;
}

.marquee-row {
  margin-top: 64px;
  margin-left: 32px;
}

.right-title {
  display: flex;
  justify-content: center;
  align-content: center;
  margin-top: 32px;
}
.re-text {
  display: contents;
}

.slogan {
  width: 100%;
  margin-left: 128px;
  margin-top: 16px;
  font-family: 'Round', system-ui, sans-serif;
  display: flex;
  font-size: 18px;
  flex-direction: column;
}

.re-content {
  font-family: 'Round', system-ui, sans-serif;
  font-size: 20px;
  margin-top: 16px;
  align-content: center;
}

.title-wrap {
  position: relative;
  display: grid;
  margin-left: 128px;
  margin-top: 16px;
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

@media (min-width: 601px) and (max-width: 899px) {
  :global(body) {
    margin: 0;
  }

  :global(#app) {
    display: flex;
    flex-direction: column;
    padding-bottom: 40px;
  }

  .hero {
    display: contents;
  }

  .button-group,
  .left-title,
  .right-title {
    padding-left: 40px;
    padding-right: 40px;
  }

  .left-title {
    width: 100%;
  }

  .title-wrap {
    margin-left: 0;
    margin-top: 24px;
  }

  .title-text {
    font-size: 48px;
  }

  .slogan {
    margin-left: 0;
    margin-top: 12px;
    font-size: 17px;
    line-height: 1.75;
  }

  .right-title {
    margin-top: 32px;
    flex-wrap: wrap;
    gap: 14px;
  }

  .re-content {
    font-size: 18px;
  }

  .right-title .grok-character {
    --grok-size: 104px !important;
  }

  .marquee-row {
    margin-top: 56px;
    margin-left: 0;
  }

  .marquee-row :deep(.marquee__card) {
    flex: 0 0 200px;
    width: 200px;
    margin-right: 32px;
    border-radius: 16px;
  }
}

@media (max-width: 600px) {
  :global(body) {
    margin: 0;
  }

  :global(#app) {
    display: flex;
    flex-direction: column;
    padding-bottom: 32px;
  }

  :global(#app .dot-wave) {
    position: fixed;
  }

  .hero {
    display: contents;
  }

  .left-title {
    order: 1;
  }
  .button-group {
    order: 2;
  }
  .right-title {
    order: 3;
  }
  .marquee-row {
    order: 4;
  }

  .button-group,
  .left-title,
  .right-title {
    padding-left: 20px;
    padding-right: 20px;
  }

  .left-title {
    width: 100%;
  }

  .title-wrap {
    margin-left: 0;
    margin-top: 28px;
  }

  .title-text {
    font-size: clamp(34px, 9vw, 56px);
  }

  .lamp {
    clip-path: circle(28px at var(--x, -200px) var(--y, -200px));
  }

  .slogan {
    margin-left: 0;
    margin-top: 12px;
    font-size: 16px;
    line-height: 1.75;
  }

  .button-group {
    margin-top: 24px;
    gap: 12px;
  }

  .button-group .button-get,
  .button-group .button-gett {
    width: auto;
    height: 44px;
    flex: 1 1 0;
    margin: 0;
  }

  .right-title {
    margin-top: 28px;
    flex-wrap: wrap;
    gap: 14px;
    align-items: center;
  }

  .right-title .grok-character {
    --grok-size: 96px !important;
  }

  .re-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .re-text br {
    display: none;
  }

  .re-content {
    font-size: 17px;
    margin-top: 0;
  }

  .marquee-row {
    margin-top: 48px;
    margin-left: 0;
  }

  .marquee-row :deep(.marquee__card) {
    flex: 0 0 176px;
    width: 176px;
    margin-right: 24px;
    border-radius: 16px;
  }
}
</style>
