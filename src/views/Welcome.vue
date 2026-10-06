<script setup lang="ts">
import { computed, inject, ref, useTemplateRef } from 'vue'
import Button from 'primevue/button'
import Marquee from '@/components/Marquee.vue'
import DotWave from '@/components/DotWave.vue'
import AngleDoubleRight from '@primeicons/vue/angle-double-right'
import Github from '@primeicons/vue/github'
import GrokCharacter from '@/components/GrokCharacter.vue'
import { useRouter } from 'vue-router'


// 背板跟随全局主题，避免暗色模式下仍然保留一块刺眼的白圆盘。
// inject：取 App.vue provide 下来的 isDark（暗色开关）
const router = useRouter()
const isDark = inject('isDark', ref(false))
// 底板颜色随主题切换
const plateColor = computed(() => isDark.value ? '#292722' : '#f7f5ef')
const grokScheme = computed(() => isDark.value ? 'dark' : 'light')

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
  if (e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) { handleLeave(); return }
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--x', `${e.clientX - rect.left}px`)
  el.style.setProperty('--y', `${e.clientY - rect.top}px`)
  const x = Math.max(-1, Math.min(1, (e.clientX - rect.left) / rect.width * 2 - 1))
  const y = Math.max(-1, Math.min(1, (e.clientY - rect.top) / rect.height * 2 - 1))
  // setProperty：给元素写 CSS 变量，样式表里 var(--title-tx) 就跟着变
  el.style.setProperty('--title-tx', `${x * 8}px`)
  el.style.setProperty('--title-ty', `${y * 6}px`)
  el.style.setProperty('--title-rx', `${-y * 1.2}deg`)
  el.style.setProperty('--title-ry', `${x * 1.6}deg`)
}

function handleLeave() {
  const el = titleWrap.value
  if (!el) return
  el.style.setProperty('--x', '-200px')
  el.style.setProperty('--y', '-200px')
  for (const name of ['--title-tx', '--title-ty', '--title-rx', '--title-ry']) el.style.removeProperty(name)
}
function goGithub(){
  window.location.href = "https://github.com/Luomic/WebHomeWork"
}
</script>

<template>
  <div class="welcome">
    <DotWave />
    <div class="button-group">
      <Button rounded class="button-get" @click="router.push({ name: 'home-main' })">
        <AngleDoubleRight :size="22" />
        逛市集
      </Button>
      <Button rounded class="button-gett" @click="goGithub">
        <Github :size="22" />
        Github
      </Button>
    </div>
    <div class="hero">
      <div class="left-title">
        <div ref="titleWrap" class="title-wrap" @pointermove="handlePointer" @pointerleave="handleLeave" @pointercancel="handleLeave">
          <div class="title-motion">
          <p class="title-text">孤独市集</p>
          <div class="lamp"></div>
          </div>
        </div>

        <div class="slogan">
          JhFair | 一个人也能逛的校园二手市集<br>
          旧物寻新主，闲逛遇珍藏<br>
          在这里，在身边，逛市集 ~<br>
          我们在这里，等着你......
        </div>
      </div>

      <div class="right-title">
        <GrokCharacter mode="onboarding" :size="120" :scheme="grokScheme" :plate="plateColor" style="margin-top: 16px;margin-right: 16px;" />
        <div class="re-text">
          <p class="re-content">其实，我想说：</p>
          <br>
          <p class="re-content"><b>一个人逛，也挺好的。</b></p>
        </div>
      </div>
    </div>
    <Marquee class="marquee-row" :images="posters" :seconds-per-card="7" borderRadius="20px" />
  </div>
</template>

<style scoped>
.welcome { min-height: 100vh; box-sizing: border-box; overflow: hidden; background: var(--app-bg, #f7f5ef); color: var(--app-text, #24231f); }

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
  background: var(--app-text);
  color: var(--app-bg);
  border-color: var(--app-text);
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
  margin-top: 128px;
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

.title-motion {
  position: relative;
  display: grid;
  transform: perspective(900px) translate3d(var(--title-tx, 0px), var(--title-ty, 0px), 0) rotateX(var(--title-rx, 0deg)) rotateY(var(--title-ry, 0deg));
  transition: transform .3s cubic-bezier(.2,.7,.2,1);   /* 变化平滑过渡，不跟手抖动 */
}
@media (prefers-reduced-motion: reduce), (pointer: coarse) {
  .title-motion { transform: none; transition: none; }
  .lamp { display: none; }
}

.title-text {
  grid-area: 1 / 1; 
  margin: 0;
  font-family: 'Ding', system-ui, sans-serif;   /* 标题字体，font.css 注册的 Ding */
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

  /* 整页变纵向排列 */
  .welcome {
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

  .welcome {
    display: flex;
    flex-direction: column;
    padding-bottom: 32px;
  }

  :global(.welcome .dot-wave) {
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
