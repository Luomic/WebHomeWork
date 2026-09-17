<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { Search, X } from 'lucide-vue-next'

/*
 *
 *  - modelValue      : v-model 绑定值
 *  - placeholder     : 占位文本
 *  - icon            : 左侧图标（传入任意 lucide-vue-next 图标组件）
 *  - clearable       : 是否显示清除按钮
 *  - backgroundColor : 背景色
 *  - borderRadius    : 圆角（任意 CSS 值，如 '12px'，默认胶囊形）
 *  - height          : 高度（默认 '44px'）
 *  - iconColor / textColor : 图标与文字颜色
 *  - borderColor     : 边框颜色，传 'none' 则无边框
 *  - focusColor      : 聚焦颜色
 *  - disabled        : 禁用状态
 *
 * 事件：update:modelValue、search（回车触发）、clear、focus、blur
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    icon?: Component
    clearable?: boolean
    backgroundColor?: string
    borderRadius?: string
    height?: string
    iconColor?: string
    textColor?: string
    borderColor?: string
    focusColor?: string
    disabled?: boolean
    type?: 'text' | 'search' | 'url' | 'tel' | 'email' | 'password'
  }>(),
  {
    modelValue: '',
    placeholder: '搜索...',
    icon: () => Search,
    clearable: true,
    backgroundColor: '#ffffff',
    borderRadius: '9999px',
    height: '44px',
    iconColor: '#8a8f99',
    textColor: '#1f2329',
    borderColor: '#e2e5ea',
    focusColor: '#409eff',
    disabled: false,
    type: 'text',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search', value: string): void
  (e: 'clear'): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const focused = ref(false)

const inputModel = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})

const hasValue = computed(() => props.modelValue.length > 0)

const rootStyle = computed(() => ({
  '--search-height': props.height,
  '--search-radius': props.borderRadius,
  '--search-bg': props.backgroundColor,
  '--search-text': props.textColor,
  '--search-icon': props.iconColor,
  '--search-border': props.borderColor,
  '--search-focus': props.focusColor,
}))

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') emit('search', props.modelValue)
}

function onClear() {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <div
    class="search"
    :class="{ 'is-focused': focused, 'is-disabled': disabled, 'has-value': hasValue }"
    :style="rootStyle"
  >
    <component :is="props.icon" class="search__icon" :size="18" :stroke-width="2" aria-hidden="true" />

    <input
      v-model="inputModel"
      class="search__input"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      @keydown="onKeydown"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />

    <button
      v-if="clearable && hasValue && !disabled"
      class="search__clear"
      type="button"
      aria-label="清除"
      @click="onClear"
      @mousedown.prevent
    >
      <X :size="14" :stroke-width="2.5" />
    </button>
  </div>
</template>

<style scoped>
.search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: var(--search-height);
  padding: 0 14px;
  width: 100%;
  box-sizing: border-box;
  background: var(--search-bg);
  border: 1.5px solid var(--search-border);
  border-radius: var(--search-radius);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search__icon {
  flex-shrink: 0;
  color: var(--search-icon);
}

.search__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--search-text);
  font-size: 14px;
}

.search__input::placeholder {
  color: var(--search-icon);
  opacity: 0.85;
}

.search.is-focused {
  border-color: var(--search-focus);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--search-focus) 18%, transparent);
}

.search.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.search__clear {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--search-icon);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.search__clear:hover {
  background: color-mix(in srgb, var(--search-icon) 15%, transparent);
  color: var(--search-text);
}
</style>
