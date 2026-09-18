<!--
  Grok 角色复刻 · 效果预览页
  独立演示页，不参与 App.vue 的欢迎页布局。

  本地跑起来后访问：http://localhost:5173/grok-demo.html
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import GrokCharacter from '@/components/GrokCharacter.vue'
import { GROK_GEO, GROK_META } from '@/grok'
import type { GrokSnapshot } from '@/grok/types'

/* ---------------------------------------------------------------- 面板状态 */

const state = ref('curious')
const mode = ref<'onboarding' | 'hold'>('hold')
const shape = ref('blob')
const color = ref('black')
const follow = ref(true)
const emphasis = ref(false)
const snap = ref<GrokSnapshot | null>(null)

type GrokCharacterApi = InstanceType<typeof GrokCharacter>

const main = useTemplateRef<GrokCharacterApi>('main')
const login = useTemplateRef<GrokCharacterApi>('login')

/* 读数里 spin / squash 是每帧都在变的，靠 change 事件拿不到，得轮询 */
let timer: number | undefined
onMounted(() => {
  timer = window.setInterval(() => {
    snap.value = main.value?.snapshot() ?? null
  }, 80)
})
onBeforeUnmount(() => {
  if (timer !== undefined) clearInterval(timer)
})

/* ------------------------------------------------------------------ 交互 */

function pickState(name: string) {
  mode.value = 'hold'
  state.value = name
}

function pickShape(id: string) {
  shape.value = id
}

function pickColor(id: string) {
  color.value = id
}

function forEachBot(fn: (bot: GrokCharacterApi | null) => void) {
  fn(main.value)
  fn(login.value)
}

const actions = [
  { label: '转一圈', run: () => forEachBot((b) => b?.spinOnce(1)) },
  { label: '跳一下', run: () => forEachBot((b) => b?.bounceOnce()) },
  { label: '粒子', run: () => forEachBot((b) => b?.burstOnce()) },
]

const shapes = Object.entries(GROK_GEO.shapes)
const palette = Object.entries(GROK_GEO.palette)
const overlays = Object.entries(GROK_META.overlays) as [string, string][]
</script>

<template>
  <div class="demo">
    <header class="demo__header">
      <h1>Grok Bot 角色 · 源码复刻</h1>
      <p>从 Grok Bot.app v0.18.0 抽出 · 个人学习用 · 请勿商用或再分发</p>
    </header>

    <main class="demo__body">
      <!-- ------------------------------------------------ 舞台 -->
      <aside class="demo__stage">
        <div class="demo__stage-row">
          <GrokCharacter
            ref="main"
            :state="state"
            :shape="shape"
            :color="color"
            :mode="mode"
            :follow-pointer="follow"
            :emphasis="emphasis"
            :size="180"
            plate="#f3efe6"
          />
          <div class="demo__login">
            <GrokCharacter
              ref="login"
              :state="state"
              :shape="shape"
              :color="color"
              :mode="mode"
              :follow-pointer="false"
              :size="64"
              plate="#f3efe6"
            />
            <span>登录 sizePx: 64</span>
          </div>
        </div>

        <div class="demo__row">
          <button :class="{ 'is-on': mode === 'onboarding' }" @click="mode = 'onboarding'">
            登录轮换
          </button>
          <button :class="{ 'is-on': mode === 'hold' }" @click="mode = 'hold'">锁定状态</button>
        </div>

        <div class="demo__row">
          <button :class="{ 'is-on': follow }" @click="follow = !follow">跟随指针</button>
          <button :class="{ 'is-on': emphasis }" @click="emphasis = !emphasis">emphasis</button>
          <button v-for="a in actions" :key="a.label" @click="a.run()">{{ a.label }}</button>
        </div>

        <dl class="demo__readout">
          <div><dt>状态</dt><dd>{{ snap?.state ?? '—' }}</dd></div>
          <div><dt>眼睛</dt><dd>{{ snap ? `${snap.eyeFrom} → ${snap.eyeTo}` : '—' }}</dd></div>
          <div><dt>旋转</dt><dd>{{ snap ? `${snap.spin.toFixed(2)}°` : '—' }}</dd></div>
          <div><dt>挤压</dt><dd>{{ snap ? snap.squash.toFixed(3) : '—' }}</dd></div>
          <div><dt>覆盖层</dt><dd>{{ snap?.overlay ?? '—' }}</dd></div>
        </dl>
      </aside>

      <!-- ------------------------------------------------ 面板 -->
      <div class="demo__panels">
        <section>
          <h2>情绪状态 · 源码 {{ Object.values(GROK_META.eyePlaylist).length }} 态</h2>
          <template v-for="group in GROK_META.groups" :key="group.label">
            <h3>{{ group.label }}</h3>
            <div class="demo__chips">
              <button
                v-for="s in group.states"
                :key="s"
                :class="{ 'is-on': mode === 'hold' && state === s }"
                @click="pickState(s)"
              >
                {{ s }}
              </button>
            </div>
          </template>
        </section>

        <section>
          <h2>身形 · Jo 几何生成器</h2>
          <div class="demo__shapes">
            <button
              v-for="[id, item] in shapes"
              :key="id"
              class="demo__shape"
              :class="{ 'is-on': shape === id }"
              :title="id"
              @click="pickShape(id)"
            >
              <svg viewBox="-15 -15 259 259" aria-hidden="true">
                <path :d="item.path" />
              </svg>
              <span>{{ item.label }}</span>
            </button>
          </div>
        </section>

        <section>
          <h2>墨色 · snt 调色板</h2>
          <div class="demo__swatches">
            <button
              v-for="[id, pal] in palette"
              :key="id"
              class="demo__swatch"
              :class="{ 'is-on': color === id }"
              :style="{ background: pal.light }"
              :title="id"
              @click="pickColor(id)"
            />
          </div>
        </section>

        <section>
          <h2>覆盖层 · 13 种</h2>
          <p class="demo__note">
            这些状态会切到覆盖层动画：<code
              v-for="[name, kind] in overlays"
              :key="name"
              >{{ name }}→{{ kind }}</code
            >
          </p>
        </section>

        <section>
          <h2>关于这次移植</h2>
          <p class="demo__note">
            引擎在 <code>src/grok/</code>：<code>math</code> / <code>tables</code> /
            <code>pose</code> / <code>tricks</code> / <code>eyes</code> / <code>fx</code> /
            <code>character</code> / <code>geometry</code>，由
            <code>port-to-vue.mjs</code> 从上游 IIFE 版本机械转换而来，没有重写任何逻辑。
            逐位一致性由 <code>verify-port.mjs</code> 的 56 项比对保证。上游更新后重跑这两个脚本即可同步。
          </p>
          <p class="demo__note">
            这不是截图描摹。thinking / orbit / writing / loading 等会切 overlay；celebrate 会
            <code>spinWild</code>；换身形走弹簧并轮换一记特技；眨眼、抛媚眼、视线游移都是独立的定时器。
            原版登录页是 <code>sizePx: 64</code>、<code>shape: 'blob'</code>、<code>color: 'black'</code>，
            每 1200ms 按 <code>pjn(n)</code> 轮换情绪；点「登录轮换」会按 <code>pjn(0)=idle</code> 从头来。
            源码里跟随指针默认是关的，这里的大预览默认开着。
          </p>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.demo {
  --line: color-mix(in oklab, CanvasText 14%, Canvas);
  --panel: color-mix(in oklab, CanvasText 5%, Canvas);
  --chip: color-mix(in oklab, CanvasText 9%, Canvas);
  --mute: color-mix(in oklab, CanvasText 55%, Canvas);
  --accent: #e8d7a4;

  min-height: 100%;
  padding-bottom: 56px;
  color: CanvasText;
  background: Canvas;
}

.demo__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 32px 32px 8px;
}

.demo__header h1 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.demo__header p {
  margin: 0;
  color: var(--mute);
  font-size: 12px;
}

.demo__body {
  display: grid;
  grid-template-columns: minmax(300px, 440px) 1fr;
  align-items: start;
  gap: 28px;
  padding: 12px 32px 0;
}

/* ---------------------------------------------------------------- 舞台 */

.demo__stage {
  position: sticky;
  top: 20px;
  padding: 24px 24px 20px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--panel);
}

.demo__stage-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: center;
  gap: 20px;
}

.demo__login {
  display: grid;
  justify-items: center;
}

.demo__login span {
  margin-top: 8px;
  color: var(--mute);
  font-size: 10px;
}

.demo__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.demo__readout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  margin: 18px 0 0;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.demo__readout div {
  display: contents;
}

.demo__readout dt {
  color: var(--mute);
}

.demo__readout dd {
  margin: 0;
  font-weight: 600;
}

/* ---------------------------------------------------------------- 按钮 */

button {
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--chip);
  color: inherit;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

button:hover {
  border-color: color-mix(in oklab, CanvasText 35%, Canvas);
}

button.is-on {
  border-color: var(--accent);
  background: var(--accent);
  color: #1a1916;
}

/* ---------------------------------------------------------------- 面板 */

.demo__panels section + section {
  margin-top: 28px;
}

.demo__panels h2 {
  margin: 0 0 10px;
  color: var(--mute);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.demo__panels h3 {
  margin: 14px 0 6px;
  color: var(--mute);
  font-size: 11px;
  font-weight: 500;
}

.demo__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.demo__shapes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 8px;
}

.demo__shape {
  padding: 8px 6px 6px;
  border-radius: 10px;
  text-align: center;
}

.demo__shape svg {
  display: block;
  width: 48px;
  height: 48px;
  margin: 0 auto 4px;
  fill: currentColor;
}

.demo__shape span {
  color: var(--mute);
  font-size: 10px;
}

.demo__shape.is-on span {
  color: #1a1916;
  font-weight: 600;
}

.demo__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.demo__swatch {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 2px solid color-mix(in oklab, CanvasText 25%, Canvas);
  border-radius: 50%;
}

.demo__swatch.is-on {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.demo__note {
  max-width: 68ch;
  margin: 0 0 10px;
  color: var(--mute);
  font-size: 12px;
  line-height: 1.7;
}

.demo__note code {
  margin: 0 2px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--chip);
  color: color-mix(in oklab, CanvasText 80%, Canvas);
  font-size: 11px;
}

@media (max-width: 900px) {
  .demo__body {
    grid-template-columns: 1fr;
  }

  .demo__stage {
    position: static;
  }
}
</style>
