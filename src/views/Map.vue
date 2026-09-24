<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Search from '@primeicons/vue/search'

const key = import.meta.env.VITE_AMAP_KEY ?? ''
const securityJsCode = import.meta.env.VITE_AMAP_SECURITY_CODE ?? ''

const center = [120.165741, 30.293231]
const CAMPUS_NAME = '浙工大朝晖校区'

const mapEl = ref(null)
const ready = ref(false)
let map = null

function loadAmap() {
  return new Promise((resolve, reject) => {
    if (window.AMap) return resolve()
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

onMounted(async () => {
  if (!key) return 
  try {
    if (securityJsCode) window._AMapSecurityConfig = { securityJsCode }
    await loadAmap()
    map = new window.AMap.Map(mapEl.value, {
      mapStyle: 'amap://styles/whitesmoke',
      center,
      zoom: 16,
      zooms: [13, 19],
    })
    // 校区标记
    map.add(new window.AMap.Marker({ position: center, title: CAMPUS_NAME }))
    ready.value = true
  } catch {
    // key 无效或网络失败，继续显示示意图
  }
})

onBeforeUnmount(() => {
  map?.destroy?.()
  map = null
})
</script>

<template>
  <div class="map-page">
    <!-- 真实地图（有 key 时） -->
    <div v-show="ready" ref="mapEl" class="amap-box"></div>

    <!-- 示意底图（没配 key / 加载失败时） -->
    <div v-if="!ready" class="mock-stage">
      <svg class="roads" viewBox="0 0 900 640" preserveAspectRatio="xMidYMid slice">
        <g stroke="#e2e2e2" stroke-width="10" fill="none" stroke-linecap="round">
          <path d="M-20 180 C 200 160, 380 260, 920 210" />
          <path d="M-20 430 C 260 470, 520 380, 920 440" />
          <path d="M180 -20 C 200 220, 140 460, 200 660" />
          <path d="M640 -20 C 620 200, 700 420, 660 660" />
        </g>
        <g stroke="#eaeaea" stroke-width="4" fill="none">
          <path d="M-20 300 L 920 320" />
          <path d="M420 -20 L 450 660" />
          <path d="M-20 520 L 920 540" />
          <path d="M90 -20 L 60 660" />
          <path d="M790 -20 L 820 660" />
        </g>
        <path d="M-20 240 C 240 230, 480 300, 920 270" stroke="#d8e6ee" stroke-width="16" fill="none" />
      </svg>

      <div class="pin" style="left: 48%; top: 44%">
        <span class="dot"></span><span class="tag">浙工大朝晖校区</span>
      </div>
      <div class="pin live" style="left: 56%; top: 38%">
        <span class="dot"></span><span class="tag">刚刚上架 · 台灯</span>
      </div>
      <div class="pin" style="left: 30%; top: 56%">
        <span class="dot"></span><span class="tag">英语词典</span>
      </div>
      <div class="pin" style="left: 70%; top: 64%">
        <span class="dot"></span><span class="tag">蓝牙键盘</span>
      </div>

      <p class="map-note">未配置</p>
    </div>

    <div class="map-search">
      <Search />
      <span>搜搜附近的闲置……</span>
    </div>

    <div class="map-card">
      <h3>附近的闲置</h3>
      <div class="row">
        <div class="thumb"><img src="/placeholder/2.webp" alt=""></div>
        <div>九成新台灯 ¥25<em>· 300m 内 · 2 分钟前</em></div>
      </div>
      <div class="row">
        <div class="thumb"><img src="/placeholder/4.webp" alt=""></div>
        <div>考研英语词典 ¥12<em>· 500m 内 · 1 小时前</em></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-page {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #f2f2f2;
  color: #111;
  font-family: 'Round', system-ui, sans-serif;
}

.amap-box {
  position: absolute;
  inset: 0;
}

/* ---------- 示意底图 ---------- */
.mock-stage {
  position: absolute;
  inset: 0;
}

.roads {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.pin {
  position: absolute;
}

.pin .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #111;
  border: 2px solid #fff;
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.12), 0 2px 6px rgba(17, 17, 17, 0.25);
}

.pin.live .dot {
  background: #f5a623;
}

.pin .tag {
  position: absolute;
  left: 18px;
  top: -4px;
  white-space: nowrap;
  background: #fff;
  border: 1px solid #e5e5e5;
  color: #555;
  font-size: 11px;
  border-radius: 8px;
  padding: 3px 8px;
  box-shadow: 0 2px 8px rgba(17, 17, 17, 0.06);
}

.map-note {
  position: absolute;
  right: 24px;
  bottom: 24px;
  margin: 0;
  font-size: 11px;
  color: #999;
  max-width: 230px;
  text-align: right;
  line-height: 1.7;
}

/* ---------- 浮层 ---------- */
.map-search {
  position: absolute;
  z-index: 2;
  top: 26px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e3e3e3;
  border-radius: 999px;
  padding: 10px 20px;
  width: 320px;
  font-size: 13px;
  color: #999;
  box-shadow: 0 4px 16px rgba(17, 17, 17, 0.08);
  backdrop-filter: blur(6px);
}

.map-card {
  position: absolute;
  z-index: 2;
  left: 28px;
  bottom: 28px;
  width: 250px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #ececec;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(17, 17, 17, 0.1);
  backdrop-filter: blur(6px);
}

.map-card h3 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 700;
}

.map-card .row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 7px 0;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #555;
}

.map-card .row:first-of-type {
  border-top: none;
}

.map-card .thumb {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  flex: 0 0 38px;
  overflow: hidden;
  background: #f2f2f2;
}

.map-card .thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.map-card .row em {
  font-style: normal;
  color: #999;
  font-size: 11px;
  display: block;
  margin-top: 2px;
}
</style>
