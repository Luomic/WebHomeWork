<script setup>
import { computed, inject, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'

const openPost = inject('openPost')
const filter = ref('全部')
const selected = ref(null)
const finds = [
  { id: '01', title: '留一盏灯，给晚归的灵感。', name: '宿舍台灯', category: '生活', price: 25, note: '陪过几次期末周，也想陪你读下一本书。' },
  { id: '02', title: '翻过的书，还能有新故事。', name: '英语词典', category: '书籍', price: 12, note: '少量铅笔笔记，留给正在准备考试的你。' },
  { id: '03', title: '把下一行，敲给新生活。', name: '蓝牙键盘', category: '数码', price: 60, note: '轻巧的桌面搭档，想找一张新的自习桌。' },
]
const visibleFinds = computed(() => finds.filter(item => filter.value === '全部' || item.category === filter.value))
</script>

<template>
  <main class="main-page">
    <div class="edition"><span>孤独市集 / 校园生活小报</span><span>闲置 · 邀约 · 一次新的相遇</span></div>
    <section class="opening">
      <div class="headline"><p class="kicker">不赶时间，逛一会儿。</p><h1>你的闲置，<br>别人的<span>刚刚好。</span></h1><p class="intro">让用不上的东西继续被喜欢，<br>让想做的事情多一个人一起。</p></div>
      <aside class="invite-note"><span class="note-number">TO / 校园里的你</span><h2>这里还缺<br>你的一张便签。</h2><p>一件想转手的好物，<br>一个想约人一起的下午。</p><Button label="＋ 写个帖子" unstyled class="ink-button" @click="openPost()" /><small>闲置与邀约，都欢迎。</small></aside>
    </section>
    <section class="board">
      <div class="finds">
        <header class="section-heading"><div><span class="section-number">01 /</span><h2>闲置有下文</h2></div><RouterLink :to="{ name: 'home-map' }">到附近看看 ↗</RouterLink></header>
        <div class="filter-row"><div class="filters" aria-label="闲置分类"><button v-for="name in ['全部', '生活', '书籍', '数码']" :key="name" :aria-pressed="filter === name" @click="filter = name">{{ name }}</button></div><span>示例内容</span></div>
        <button v-for="item in visibleFinds" :key="item.id" class="find-row" :aria-expanded="selected === item.id" @click="selected = selected === item.id ? null : item.id">
          <span class="find-index">{{ item.id }}</span><div class="find-copy"><small>{{ item.category }} / {{ item.name }}</small><h3>{{ item.title }}</h3><p v-if="selected === item.id">{{ item.note }}<br>此为示例闲置，尚未接入商品详情。</p></div><span class="price">¥{{ item.price }}<small>{{ selected === item.id ? '收起 −' : '展开 ↗' }}</small></span>
        </button>
        <p class="footnote">旧物不旧，只是故事换了一个主角。</p>
      </div>
      <aside class="meetups"><header class="section-heading"><div><span class="section-number">02 /</span><h2>找个人，一起</h2></div></header><span class="sample-label">邀约灵感 · 非真实活动</span><article><small>傍晚 / 校园散步</small><h3>今天的晚风，<br>要不要一起吹？</h3><p>不必有目的地，走到天色慢慢暗下来。</p></article><article><small>周末 / 自习搭子</small><h3>各自努力，<br>休息时聊两句。</h3><p>带上那本一直没翻完的书。</p></article><Button label="发起我的邀约 ↗" unstyled class="text-button" @click="openPost('邀约')" /></aside>
    </section>
    <footer class="page-footer"><span>让物品流动，让相遇发生。</span><span>JH FAIR / 孤独市集</span></footer>
  </main>
</template>

<style scoped>
.main-page { flex: 1; min-height: 0; min-width: 0; overflow: auto; background: var(--app-bg, #f5f1e8); color: var(--app-text, #20201e); padding: 26px clamp(22px, 5vw, 72px) 20px; font-family: 'Round', system-ui, sans-serif; }
.edition { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid #b9b9b2; padding-bottom: 15px; font-size: 10px; color: #777; letter-spacing: 1px; }
.opening { display: grid; grid-template-columns: 1.5fr 1fr; gap: 40px; align-items: center; padding: 38px 0 42px; }
.kicker { font-size: 12px; color: #777; margin: 0 0 18px; }
h1 { font-family: 'Ding', system-ui, sans-serif; font-size: clamp(34px, 4.3vw, 62px); line-height: 1.4; font-weight: normal; margin: 0; letter-spacing: 1px; }
h1 span { border-bottom: 2px solid #aaa; padding-bottom: 3px; }.intro { font-size: 13px; line-height: 1.9; color: #777; margin: 20px 0 0; }
.invite-note { width: 100%; max-width: 310px; justify-self: end; background: color-mix(in srgb, var(--app-surface) 86%, var(--app-text)); border: 1px solid var(--app-border); padding: 26px; transform: rotate(2deg); position: relative; }
.invite-note::before { content: ''; position: absolute; width: 75px; height: 19px; background: color-mix(in srgb, var(--app-border) 70%, transparent); top: -10px; left: 36%; transform: rotate(-5deg); }
.note-number { font-size: 10px; letter-spacing: 1px; color: color-mix(in srgb, var(--app-text) 60%, transparent); }.invite-note h2 { font-size: 25px; font-weight: normal; line-height: 1.5; margin: 20px 0 12px; }.invite-note p { font-size: 12px; color: color-mix(in srgb, var(--app-text) 60%, transparent); line-height: 1.8; }.ink-button { margin-top: 14px; padding: 10px 18px; background: var(--app-text); color: var(--app-bg); border: 0; border-radius: 6px; font: inherit; font-size: 13px; cursor: pointer; }.invite-note > small { display: block; font-size: 10px; color: color-mix(in srgb, var(--app-text) 60%, transparent); margin-top: 14px; }
.board { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(220px, 1fr); gap: 36px; border-top: 2px solid #333; padding-top: 22px; }.section-heading { display: flex; justify-content: space-between; align-items: center; gap: 10px; }.section-heading > div { display: flex; align-items: baseline; gap: 12px; }.section-number { font-size: 11px; color: #999; }.section-heading h2 { font-size: 20px; font-weight: normal; margin: 0; }.section-heading a { color: #666; font-size: 11px; text-decoration: none; white-space: nowrap; }.filter-row { display: flex; align-items: center; justify-content: space-between; margin-top: 20px; }.filter-row > span, .sample-label { color: #999; font-size: 10px; }.filters { display: flex; gap: 16px; }.filters button { border: 0; border-bottom: 1px solid transparent; padding: 4px 0; background: none; color: #999; font: inherit; font-size: 12px; cursor: pointer; }.filters button[aria-pressed=true] { color: #111; border-color: #111; }
.find-row { display: flex; align-items: center; width: 100%; gap: 16px; text-align: left; padding: 23px 0; border: 0; border-bottom: 1px solid #d9d9d2; background: none; font: inherit; cursor: pointer; }.find-row:hover .find-copy h3 { text-decoration: underline; text-underline-offset: 5px; }.find-index { color: #aaa; font-size: 11px; }.find-copy { flex: 1; }.find-copy small { color: #888; font-size: 10px; }.find-copy h3 { font-size: 16px; font-weight: normal; line-height: 1.7; margin: 7px 0 0; }.find-copy p { font-size: 12px; color: #777; line-height: 1.8; }.price { font-size: 21px; }.price small { display: block; color: #999; font-size: 10px; margin-top: 6px; }.footnote { font-size: 11px; color: #999; margin-top: 18px; }
.meetups { border-left: 1px solid #d9d9d2; padding-left: 30px; }.sample-label { display: block; margin-top: 20px; }.meetups article { padding: 23px 0 18px; border-bottom: 1px dashed #ccc; }.meetups article small { font-size: 10px; color: #888; }.meetups h3 { font-size: 20px; line-height: 1.6; font-weight: normal; margin: 10px 0; }.meetups p { color: #888; font-size: 11px; line-height: 1.8; }.text-button { font: inherit; font-size: 12px; padding: 18px 0 0; border: 0; background: none; cursor: pointer; }.page-footer { display: flex; justify-content: space-between; gap: 15px; margin-top: 36px; padding-top: 18px; border-top: 1px solid #b9b9b2; font-size: 10px; color: #888; }
button:focus-visible, a:focus-visible { outline: 2px solid #999; outline-offset: 4px; }
@media(max-width: 750px) { .opening { grid-template-columns: 1fr; gap: 30px; }.invite-note { max-width: none; transform: none; }.board { grid-template-columns: 1fr; gap: 24px; }.meetups { padding-left: 0; border-left: 0; border-top: 1px solid #bbb; padding-top: 22px; }.edition span:last-child { display: none; }h1 { font-size: 42px; }.find-row { gap: 10px; }.page-footer { flex-wrap: wrap; } }
</style>
