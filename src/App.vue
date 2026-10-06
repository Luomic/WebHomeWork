<script setup lang="ts">
import { onBeforeUnmount, provide, ref, watch } from 'vue'
import { RouterView } from 'vue-router'

const root = document.documentElement
const isDark = ref(root.classList.contains('to-dark'))
watch(isDark, value => root.classList.toggle('to-dark', value))
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
function followSystem(event: MediaQueryListEvent) {
  let saved = null
  try { saved = localStorage.getItem('jh-theme') } catch {}
  if (!saved) isDark.value = event.matches
}
systemDark.addEventListener('change', followSystem)
onBeforeUnmount(() => systemDark.removeEventListener('change', followSystem))

provide('isDark', isDark)
provide('toggleTheme', () => {
  isDark.value = !isDark.value
  try { localStorage.setItem('jh-theme', isDark.value ? 'dark' : 'light') } catch {}
})
</script>

<template>
  <div class="app-shell">
    <RouterView v-slot="{ Component, route }">
      <Transition :name="String(route.meta.transition ?? 'page')">
        <div v-if="Component" :key="route.matched[0]?.path" class="route-page">
          <component :is="Component" />
        </div>
      </Transition>
    </RouterView>
  </div>
</template>

<style>
:root {
  color-scheme: light;
  --app-bg: #f7f5ef; --app-surface: #fcfbf8; --app-field: #fff; --app-text: #24231f;
  --app-muted: #777; --app-faint: #999; --app-border: #dedbd3; --app-line: #ddd; --app-hover: #ebebe7;
  --app-map-bg: #eeefea; --app-map-road: #dfdfdb; --app-map-river: #d4deda; --app-map-label: #92968e;
  --grok-plate: #f7f5ef;
  --app-shadow: rgb(0 0 0 / 8%);
}
:root.to-dark {
  color-scheme: dark;
  --app-bg: #1f1e1b; --app-surface: #292722; --app-field: #2f2d28; --app-text: #f2eee5;
  --app-muted: #aaa598; --app-faint: #8c877c; --app-border: #514d45; --app-line: #3e3b35; --app-hover: #3a3731;
  --app-map-bg: #262521; --app-map-road: #36342e; --app-map-river: #2e3835; --app-map-label: #7f7b71;
  --grok-plate: #292722;
  --app-shadow: rgb(0 0 0 / 24%);
}
html:root {
  --p-form-field-background: var(--app-field); --p-form-field-color: var(--app-text);
  --p-form-field-border-color: var(--app-line); --p-form-field-hover-border-color: var(--app-faint);
  --p-form-field-placeholder-color: var(--app-faint);
  --p-button-secondary-background: var(--app-hover); --p-button-secondary-border-color: var(--app-hover); --p-button-secondary-color: var(--app-text);
  --p-button-secondary-hover-background: var(--app-line); --p-button-secondary-hover-border-color: var(--app-line); --p-button-secondary-hover-color: var(--app-text);
  --p-select-background: var(--app-field); --p-select-color: var(--app-text); --p-select-border-color: var(--app-border);
  --p-select-overlay-background: var(--app-surface); --p-select-overlay-color: var(--app-text); --p-select-overlay-border-color: var(--app-border);
  --p-select-option-color: var(--app-text); --p-select-option-focus-background: var(--app-hover); --p-select-option-focus-color: var(--app-text);
  --p-select-option-selected-background: var(--app-hover); --p-select-option-selected-color: var(--app-text);
  --p-select-option-selected-focus-background: var(--app-hover); --p-select-option-selected-focus-color: var(--app-text);
  --p-togglebutton-background: var(--app-surface); --p-togglebutton-color: var(--app-muted); --p-togglebutton-border-color: var(--app-border);
  --p-togglebutton-hover-background: var(--app-hover); --p-togglebutton-hover-color: var(--app-text);
  --p-togglebutton-checked-background: var(--app-text); --p-togglebutton-checked-color: var(--app-bg); --p-togglebutton-checked-border-color: var(--app-text);
  --p-togglebutton-content-checked-background: var(--app-text); --p-togglebutton-content-checked-shadow: none;
  --p-inputtext-background: var(--app-field); --p-inputtext-color: var(--app-text); --p-inputtext-border-color: var(--app-border);
  --p-textarea-background: var(--app-field); --p-textarea-color: var(--app-text); --p-textarea-border-color: var(--app-border);
}
html, body, #app { min-height: 100%; }
body { background: var(--app-bg); color: var(--app-text); }
.app-shell { min-height: 100vh; background: var(--app-bg); color: var(--app-text); }
.app-shell :where([data-pc-name^="sidebar"], .p-sidebar) { background: var(--app-surface) !important; color: var(--app-text); }
.app-shell :where([data-pc-name="sidebar"] *) { border-color: var(--app-border); }
:where(.p-dialog) { background: var(--app-surface) !important; color: var(--app-text) !important; border-color: var(--app-border) !important; }
:where(.p-dialog-content input, .p-dialog-content textarea, .p-dialog-content select) { background: var(--app-bg) !important; color: var(--app-text) !important; border-color: var(--app-border) !important; }
:where(.p-dialog-content input::placeholder, .p-dialog-content textarea::placeholder) { color: color-mix(in srgb, var(--app-text) 55%, transparent) !important; }
:where(.post-form, .login-form) { color: var(--app-text); }
:where(.post-form > p, .post-preview small, .login-intro p) { color: color-mix(in srgb, var(--app-text) 60%, transparent) !important; }
:where(.header-action, .theme-action, .ink-button) { appearance: none; background: var(--app-text) !important; color: var(--app-bg) !important; border: 1px solid var(--app-text) !important; }
:where(.header-action:hover, .theme-action:hover, .ink-button:hover) { filter: brightness(.9); }
:where(.theme-action) { background: transparent !important; color: var(--app-text) !important; border-color: var(--app-border) !important; }
:where(.ink-button:disabled, .header-action:disabled) { opacity: .5; }
.market-price-pin { border: 1px solid var(--app-muted); border-radius: 22px; padding: 7px 13px; background: var(--app-field); color: var(--app-text); font: 600 13px/1.3 system-ui,sans-serif; white-space: nowrap; cursor: pointer; box-shadow: 0 2px 6px var(--app-shadow); transition: background .16s,color .16s; }
.market-price-pin.is-selected { background: var(--app-text); color: var(--app-bg); border-color: var(--app-text); }
.market-price-pin:focus-visible { outline: 2px solid var(--app-text); outline-offset: 3px; }
.post-composer-dialog, .place-picker-dialog, .market-detail-dialog { font-family: system-ui,sans-serif; }
.p-select-overlay { color: var(--app-text); background: var(--app-surface); }
@media(max-width:600px) {
  .post-composer-dialog, .place-picker-dialog { width: 100vw !important; max-width: 100vw !important; height: 100dvh; max-height: 100dvh !important; margin: 0; border-radius: 0 !important; }
  .post-composer-dialog .p-dialog-content, .place-picker-dialog .p-dialog-content { flex: 1; padding: 0 16px 20px; }
  .post-composer-dialog .p-dialog-header, .place-picker-dialog .p-dialog-header { padding: 18px 16px; }
  .post-composer-dialog .p-dialog-footer, .place-picker-dialog .p-dialog-footer { padding: 12px 16px max(12px,env(safe-area-inset-bottom)); border-top: 1px solid var(--app-border); }
}
.route-page { min-height: 100dvh; background: var(--app-bg); }
.page-leave-active, .welcome-route-leave-active { position: absolute; inset: 0; pointer-events: none; }
.page-enter-active, .welcome-route-enter-active { position: relative; z-index: 1; }
.page-enter-active,
.page-leave-active { transition: opacity .3s ease, transform .3s ease; }

.page-enter-from { opacity: 0; transform: translateY(10px); }
.page-leave-to { opacity: 0; transform: translateY(-8px); }

.welcome-route-enter-active,
.welcome-route-leave-active {
  transition: opacity .62s cubic-bezier(.22, 1, .36, 1), transform .72s cubic-bezier(.22, 1, .36, 1), clip-path .72s cubic-bezier(.22, 1, .36, 1), filter .5s ease;
  will-change: opacity, transform, clip-path;
  clip-path: inset(0 round 0px);
}
.welcome-route-enter-from { opacity: 0; transform: translate3d(6vw, 0, 0) scale(.985); clip-path: inset(0 0 0 12% round 28px); filter: blur(4px); }
.welcome-route-leave-to { opacity: 0; transform: translate3d(-2vw, 0, 0) scale(1.015); clip-path: inset(0 10% 0 0 round 28px); filter: blur(2px); }

@media (prefers-reduced-motion: reduce) {
  .app-shell *, .p-dialog *, .p-select-overlay *, .market-price-pin, .p-dialog, .p-dialog-mask {
    animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important;
  }
  .page-enter-active,
  .page-leave-active,
  .welcome-route-enter-active,
  .welcome-route-leave-active {
    transition: none;
  }
  .page-enter-from, .page-leave-to, .welcome-route-enter-from, .welcome-route-leave-to {
    opacity: 1; transform: none; clip-path: none; filter: none;
  }
}
</style>
