<script setup lang="ts">
import { onMounted, provide, ref, watch } from 'vue'
import { RouterView } from 'vue-router'

// 主题状态集中在根节点，PrimeVue 会根据 `.to-dark` 自动切换组件色板。
const isDark = ref(false)
onMounted(() => { isDark.value = localStorage.getItem('jh-theme') === 'dark' })
watch(isDark, value => localStorage.setItem('jh-theme', value ? 'dark' : 'light'))
provide('isDark', isDark)
provide('toggleTheme', () => { isDark.value = !isDark.value })
</script>

<template>
  <div class="app-shell" :class="{ 'to-dark': isDark }">
    <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
    </RouterView>
  </div>
</template>

<style>
html, body, #app { min-height: 100%; }
body { background: var(--app-bg); color: var(--app-text); }
.app-shell { min-height: 100vh; --app-bg: #f7f5ef; --app-surface: #fcfbf8; --app-text: #24231f; --app-border: #dedbd3; --grok-plate: #f7f5ef; background: var(--app-bg); color: var(--app-text); }
.app-shell.to-dark { --app-bg: #1f1e1b; --app-surface: #292722; --app-text: #f2eee5; --app-border: #514d45; --grok-plate: #292722; }
/* PrimeVue Sidebar 的 DOM 由组件内部生成，使用全局选择器覆盖其默认纯白背景。 */
.app-shell :where([data-pc-name="sidebar"], .p-sidebar, [data-pc-section="root"]) { background: var(--app-surface) !important; color: var(--app-text); }
.app-shell :where([data-pc-name="sidebar"] *) { border-color: var(--app-border); }
/* 页面样式采用 scoped CSS，下面用页面根类统一覆盖仍写死为白色的旧卡片。 */
.app-shell.to-dark :where(.agent-page, .message-page) { background: var(--app-bg) !important; color: var(--app-text) !important; }
.app-shell.to-dark :where(.conversation-list, .conversation-search, .chat-back, .bubble, .compose, .agent-page article, .agent-page .agent-card) { background: var(--app-surface) !important; color: var(--app-text) !important; border-color: var(--app-border) !important; }
.app-shell.to-dark :where(.conversation, .compose textarea, .agent-page input, .agent-page textarea) { color: var(--app-text) !important; }
.app-shell.to-dark :where(.conversation.active, .item.active) { background: #3a3731 !important; }
/* Dialog 被 PrimeVue 传送到 body，必须在这里用非 scoped 规则统一亮暗色。 */
.app-shell :where(.p-dialog, .p-dialog-content, .p-dialog-header) { background: var(--app-surface) !important; color: var(--app-text) !important; border-color: var(--app-border) !important; }
.app-shell :where(.p-dialog-content input, .p-dialog-content textarea, .p-dialog-content select) { background: var(--app-bg) !important; color: var(--app-text) !important; border-color: var(--app-border) !important; }
.app-shell :where(.p-dialog-content input::placeholder, .p-dialog-content textarea::placeholder) { color: color-mix(in srgb, var(--app-text) 55%, transparent) !important; }
.app-shell :where(.post-form, .login-form) { color: var(--app-text); }
.app-shell :where(.post-form > p, .post-preview small, .login-intro p) { color: color-mix(in srgb, var(--app-text) 60%, transparent) !important; }
/* 顶部快捷按钮显式指定前景/背景，避免 PrimeVue contrast 色板在浅色主题下把文字和按钮都变成白色。 */
.app-shell :where(.header-action, .theme-action, .ink-button) { appearance: none; background: var(--app-text) !important; color: var(--app-bg) !important; border: 1px solid var(--app-text) !important; opacity: 1 !important; }
.app-shell :where(.header-action:hover, .theme-action:hover, .ink-button:hover) { filter: brightness(.9); }
.app-shell :where(.theme-action) { background: transparent !important; color: var(--app-text) !important; border-color: var(--app-border) !important; }
.app-shell :where(.p-dialog .header-action, .p-dialog .theme-action) { background: var(--app-text) !important; color: var(--app-bg) !important; }
.page-enter-active,
.page-leave-active {
  transition: opacity 0.25s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>
