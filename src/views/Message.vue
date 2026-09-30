<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Bell, Heart, MessageCircle, PackageCheck } from 'lucide-vue-next'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

type ReminderType = '互动' | '交易' | '系统'
type Reminder = { id: string; type: ReminderType; title: string; content: string; time: string; date: string; unread: boolean; icon: typeof Bell }
const reminders = ref<Reminder[]>([
  { id: 'like-1', type: '互动', title: '有人喜欢了你的帖子', content: '小林收藏了你的「九成新台灯」，你的分享被看见了。', time: '14:32', date: '今天', unread: true, icon: Heart },
  { id: 'comment-1', type: '互动', title: '你的帖子有新评论', content: '阿禾评论了你的「英语词典」：请问还在出吗？', time: '11:08', date: '今天', unread: true, icon: MessageCircle },
  { id: 'trade-1', type: '交易', title: '有人想要你的闲置', content: '周同学对你的「宿舍收纳盒」感兴趣，记得及时查看。', time: '昨天', date: '昨天', unread: false, icon: PackageCheck },
  { id: 'system-1', type: '系统', title: '欢迎来到孤独市集', content: '在这里发现校园闲置商品，也别忘了照顾好自己。', time: '周三', date: '2026年9月28日', unread: false, icon: Bell },
])
const query = ref('')
const selectedId = ref(reminders.value[0]?.id ?? '')
const detailOpen = ref(false)
const listEl = ref<HTMLElement | null>(null)
const detailEl = ref<HTMLElement | null>(null)
const selected = computed<Reminder>(() => reminders.value.find(item => item.id === selectedId.value) ?? reminders.value[0]!)
const unreadCount = computed(() => reminders.value.filter(item => item.unread).length)
const filteredReminders = computed(() => { const term = query.value.trim().toLowerCase(); return term ? reminders.value.filter(item => [item.type, item.title, item.content].join(' ').toLowerCase().includes(term)) : reminders.value })
async function selectReminder(id: string) { selectedId.value = id; const reminder = reminders.value.find(item => item.id === id); if (reminder) reminder.unread = false; detailOpen.value = true; await nextTick(); detailEl.value?.focus() }
async function backToList() { detailOpen.value = false; await nextTick(); listEl.value?.querySelector<HTMLElement>('.reminder.active')?.focus() }
function markAllRead() { reminders.value.forEach(item => { item.unread = false }) }
</script>

<template>
  <section class="message-page" aria-label="提醒">
    <div class="message-layout" :class="{ 'detail-open': detailOpen }">
      <section ref="listEl" class="reminder-list" aria-label="提醒列表">
        <div class="list-heading"><div><h2>提醒</h2><p>和你有关的动态，都在这里。</p></div><span v-if="unreadCount" class="unread-count" aria-label="未读提醒数量">{{ unreadCount }}</span></div>
        <div class="list-toolbar"><label class="search-label" for="reminder-search">搜索提醒</label><InputText id="reminder-search" v-model="query" class="reminder-search" type="search" placeholder="搜索标题或内容" unstyled /><Button v-if="unreadCount" class="read-all" type="button" label="全部已读" unstyled @click="markAllRead" /></div>
        <div class="reminders">
          <button v-for="reminder in filteredReminders" :key="reminder.id" type="button" class="reminder" :class="{ active: selectedId === reminder.id, unread: reminder.unread }" :aria-label="`${reminder.unread ? '未读，' : ''}${reminder.title}`" :aria-pressed="selectedId === reminder.id" @click="selectReminder(reminder.id)">
            <span class="reminder-icon"><component :is="reminder.icon" :size="17" aria-hidden="true" /></span><span class="reminder-text"><span class="reminder-heading"><strong>{{ reminder.title }}</strong><time>{{ reminder.time }}</time></span><span class="reminder-snippet">{{ reminder.content }}</span><span class="reminder-type">{{ reminder.type }}</span></span><span v-if="reminder.unread" class="unread-dot" aria-label="未读"></span>
          </button>
        </div>
        <p v-if="!filteredReminders.length" class="list-note" role="status">没有找到相关提醒，换个关键词试试。</p><p class="list-note">提醒不是私信，<br>这里只记录与你有关的动态。</p>
      </section>
      <section ref="detailEl" class="reminder-detail" tabindex="-1" aria-label="提醒详情">
        <header class="detail-header"><Button class="detail-back" type="button" label="← 返回" unstyled @click="backToList" /><div class="detail-icon"><component :is="selected.icon" :size="20" aria-hidden="true" /></div><div><span class="detail-type">{{ selected.type }}提醒</span><h3>{{ selected.title }}</h3></div><time>{{ selected.date }} · {{ selected.time }}</time></header>
        <article class="detail-content"><div class="detail-mark"><Bell :size="18" aria-hidden="true" /></div><p>{{ selected.content }}</p><small>这是系统提醒，不支持直接回复。</small></article><p class="api-note"><Bell :size="14" aria-hidden="true" />提醒数据暂未接入 API，当前展示为示例内容。</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.message-page{display:flex;flex:1;min-height:0;min-width:0;overflow:hidden;background:var(--app-bg);color:var(--app-text);font-family:'Round',system-ui,sans-serif}.message-layout{display:flex;flex:1;min-height:0}.reminder-list{width:360px;flex-shrink:0;background:var(--app-surface);border-right:1px solid var(--app-line);padding:26px 14px;overflow:auto}.list-heading{display:flex;align-items:flex-start;justify-content:space-between;margin:0 10px 20px}.list-heading h2{margin:0;font-family:'Ding',system-ui,sans-serif;font-size:30px;font-weight:400}.list-heading p{margin:6px 0 0;color:var(--app-muted);font-size:11px}.unread-count{display:grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:20px;background:var(--app-text);color:var(--app-bg);font-size:11px}.search-label{display:block;margin:0 10px 6px;color:var(--app-muted);font-size:11px}.reminder-search{width:calc(100% - 20px);margin:0 10px;padding:10px 12px;border:1px solid var(--app-line);border-radius:10px;background:var(--app-field);color:var(--app-text);font:inherit;font-size:12px}.read-all{display:block;margin:9px 10px 0;border:0;background:transparent;color:var(--app-muted);font:inherit;font-size:11px;cursor:pointer}.reminders{display:flex;flex-direction:column;gap:3px;margin-top:14px}.reminder{position:relative;display:flex;align-items:flex-start;gap:11px;width:100%;padding:14px 10px;border:0;border-radius:12px;background:transparent;color:var(--app-text);text-align:left;font:inherit;cursor:pointer}.reminder:hover,.reminder.active{background:var(--app-hover)}.reminder-icon{display:grid;place-items:center;width:36px;height:36px;flex-shrink:0;border-radius:11px;background:var(--app-hover);color:var(--app-muted)}.reminder.active .reminder-icon{background:var(--app-text);color:var(--app-bg)}.reminder-text{display:block;min-width:0;flex:1}.reminder-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px}.reminder-heading strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}.reminder-heading time{flex-shrink:0;color:var(--app-faint);font-size:10px}.reminder-snippet{display:block;margin-top:6px;overflow:hidden;color:var(--app-muted);font-size:11px;line-height:1.55;text-overflow:ellipsis;white-space:nowrap}.reminder-type{display:inline-block;margin-top:7px;color:var(--app-faint);font-size:10px}.unread-dot{width:6px;height:6px;flex-shrink:0;margin-top:5px;border-radius:50%;background:var(--app-text)}.list-note{margin:20px 10px;color:var(--app-faint);font-size:11px;line-height:1.8}.reminder-detail{display:flex;flex:1;min-width:0;flex-direction:column;outline:none}.detail-header{display:flex;align-items:center;gap:12px;padding:24px;border-bottom:1px solid var(--app-line)}.detail-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:var(--app-text);color:var(--app-bg)}.detail-header h3{margin:4px 0 0;font-size:15px;font-weight:500}.detail-type{color:var(--app-muted);font-size:11px}.detail-header>time{margin-left:auto;color:var(--app-faint);font-size:10px}.detail-back{display:none}.detail-content{width:min(560px,calc(100% - 48px));margin:70px auto 0;padding:30px;border:1px solid var(--app-line);border-radius:18px;background:var(--app-field);text-align:center}.detail-mark{display:grid;place-items:center;width:38px;height:38px;margin:0 auto 18px;border:1px solid var(--app-line);border-radius:50%;color:var(--app-muted)}.detail-content p{margin:0;color:var(--app-text);font-size:14px;line-height:1.9}.detail-content small{display:block;margin-top:18px;color:var(--app-faint);font-size:11px}.api-note{display:flex;align-items:center;justify-content:center;gap:6px;margin:18px auto;color:var(--app-faint);font-size:11px}@media(max-width:900px){.reminder-list{width:300px}}@media(max-width:640px){.reminder-list{width:100%;border-right:0}.message-layout .reminder-detail{display:none}.message-layout.detail-open .reminder-list{display:none}.message-layout.detail-open .reminder-detail{display:flex}.detail-back{display:block;padding:8px;border:1px solid var(--app-line);border-radius:8px;background:var(--app-field);color:var(--app-text);font:inherit;font-size:12px}.detail-header{padding:18px}.detail-header>time{display:none}.detail-content{width:calc(100% - 28px);margin:28px auto 0;padding:24px}.api-note{padding:0 16px;text-align:center;line-height:1.6}}button:focus-visible,input:focus-visible{outline:2px solid var(--app-muted);outline-offset:3px}
</style>
