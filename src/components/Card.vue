<script setup lang="ts">
import { computed, useSlots, type Component } from 'vue'

/*
 *
 *  - src          : 图片地址（不传则不渲染图片区域）
 *  - alt          : 图片描述文本
 *  - imgHeight    : 图片区域高度（默认 'auto'，即按原始比例）
 *  - width        : 卡片宽度（任意 CSS 值，默认 'fit-content'）
 *  - height       : 卡片高度（默认自适应 'auto'）
 *  - borderRadius : 圆角（默认 '16px'）
 *  - backgroundColor : 卡片背景色
 *  - borderColor     : 边框颜色，传 'none' 则无边框
 *  - padding      : 内边距
 *  - hoverable    : 是否显示悬停浮起效果
 *  - shadow       : 是否显示默认阴影
 *
 * 用法：
 *   <Card src="/img.jpg" width="320px">内容写在这里</Card>
 *   内容通过默认插槽传入，支持任意标签与组件
 */
const props = withDefaults(
  defineProps<{
    src?: string
    alt?: string
    imgHeight?: string
    width?: string
    height?: string
    borderRadius?: string
    backgroundColor?: string
    borderColor?: string
    padding?: string
    hoverable?: boolean
    shadow?: boolean
    component?: Component
  }>(),
  {
    src: '',
    alt: '',
    imgHeight: 'auto',
    width: 'fit-content',
    height: 'auto',
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    borderColor: '#e2e5ea',
    padding: '16px',
    hoverable: false,
    shadow: false,
    component: undefined,
  },
)

// 没内容则纯图模式
const slots = useSlots()
const hasContent = computed(() => !!slots.default)

const hasImg = computed(() => props.src.length > 0)

const rootStyle = computed(() => ({
  '--card-width': props.width,
  '--card-height': props.height,
  '--card-radius': props.borderRadius,
  '--card-bg': props.backgroundColor,
  '--card-border': props.borderColor,
  '--card-padding': props.padding,
  '--card-img-height': props.imgHeight,
}))
</script>

<template>
  <div
    class="card"
    :class="{ 'is-hoverable': hoverable, 'has-shadow': shadow }"
    :style="rootStyle"
  >
    <img v-if="hasImg" class="card__img" :src="src" :alt="alt" loading="lazy" />
    <div v-if="hasContent" class="card__body">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: var(--card-width);
  height: var(--card-height);
  background: var(--card-bg);
  border: 1.5px solid var(--card-border);
  border-radius: var(--card-radius);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card.has-shadow {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card.is-hoverable:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.card__img {
  width: 100%;
  max-width: 100%;
  height: var(--card-img-height);
  object-fit: cover;
  flex-shrink: 0;
  display: block;
}

.card__body {
  flex: 1;
  padding: var(--card-padding);
}
</style>
