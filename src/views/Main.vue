<!-- 首页子页：Welcome 风格 —— 黑底点阵 + 聚光灯标题 + 海报流（按 subpages-draft.html 已确认稿实现） -->

<script setup>
import { useTemplateRef } from 'vue'
import Marquee from '@/components/Marquee.vue'
import DotWave from '@/components/DotWave.vue'
import Plus from '@primeicons/vue/plus'

const posters = Array.from({ length: 6 }, (_, i) => `/placeholder/${i + 1}.webp`)

</script>

<template>
  <div class="main-page">
    <DotWave />

    <div class="hero">
      <div class="title-wrap">
        <p class="title-text">逛市集</p>
      </div>

      <p class="slogan">
        欢迎回来。<br>
        校园里还有些好东西在等你翻一翻。
      </p>

      <div class="actions">
        <button class="pill solid" type="button"><Plus :size="16" />发布闲置</button>
        <button class="pill ghost" type="button">随便逛逛</button>
      </div>
    </div>

    <Marquee
      class="marquee-row"
      :images="posters"
      card-width="172px"
      gap="24px"
      aspect-ratio="43 / 52"
      border-radius="18px"
      :seconds-per-card="7"
    />
  </div>
</template>

<style scoped>
.main-page {
  position: relative;
  flex: 1;
  min-height: 0;
  isolation: isolate; 
  overflow: hidden;
  background: #f2f2f2;
  color: #111;
  font-family: 'Round', system-ui, sans-serif;
}

.main-page :deep(.dot-wave) {
  background: transparent !important;
}

.hero {
  position: relative;
  z-index: 1;
  padding: 48px 48px 0 56px;
}

.title-wrap {
  position: relative;
  display: grid;
  width: fit-content;
  cursor: default;
}

.title-text {
  grid-area: 1 / 1;
  margin: 0;
  font-family: 'Ding', system-ui, sans-serif;
  font-size: 52px;
  letter-spacing: 2px;
}


.slogan {
  margin: 14px 0 0;
  max-width: 460px;
  font-size: 15px;
  line-height: 1.8;
  color: #666;
}

.slogan b {
  color: #111;
}

.actions {
  margin-top: 22px;
  display: flex;
  gap: 12px;
}

.pill {
  height: 40px;
  padding: 0 24px;
  border: none;
  border-radius: 999px;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.pill.solid {
  background: #111;
  color: #fff;
}

.pill.ghost {
  background: #fff;
  color: #111;
  border: 1px solid #ddd;
}

.marquee-row {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 44px;
}

.marquee-row :deep(.marquee__card) {
  box-shadow: 0 2px 12px rgba(17, 17, 17, 0.08);
}
</style>
