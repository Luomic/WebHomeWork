<script setup>
import { computed, nextTick, ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const conversations = [
  { id: 'lin', name: '小林', avatar: '林', time: '14:32', topic: '关于闲置 · 九成新台灯', messages: [
    { text: '你好，想问问这盏台灯还在吗？', mine: true },
    { text: '还在的～暖光和白光都可以调，放宿舍桌上刚刚好。' },
    { text: '太好了，方便在图书馆门口看看吗？', mine: true },
    { text: '可以呀，你什么时候方便？' },
  ] },
  { id: 'he', name: '阿禾', avatar: '禾', time: '昨天', topic: '关于闲置 · 英语词典', messages: [
    { text: '你好，请问词典里面有很多笔记吗？', mine: true },
    { text: '只有前几页有铅笔标记，其他都很干净。' },
    { text: '好的，谢谢你，我再确认一下版本。', mine: true },
  ] },
  { id: 'zhou', name: '周同学', avatar: '周', time: '周三', topic: '关于邀约 · 周末校园散步', messages: [
    { text: '周末想一起在校园走走吗？' },
    { text: '好呀，傍晚应该很舒服。', mine: true },
    { text: '那我们出发前再确认时间～' },
  ] },
]
const query = ref('')
const selectedId = ref(conversations[0].id)
const selected = computed(() => conversations.find(item => item.id === selectedId.value))
const drafts = ref({})
const draft = computed({
  get: () => drafts.value[selectedId.value] || '',
  set: value => { drafts.value[selectedId.value] = value },
})
const filteredConversations = computed(() => {
  const term = query.value.trim().toLowerCase()
  return conversations.filter(item =>
    [item.name, item.topic, ...item.messages.map(message => message.text)].join(' ').toLowerCase().includes(term),
  )
})
const chatOpen = ref(false)
const inputEl = ref(null)
const listEl = ref(null)
const historyEl = ref(null)
const status = ref('示例聊天记录 · 消息服务尚未接入')

async function selectConversation(id) {
  selectedId.value = id
  chatOpen.value = true
  status.value = '示例聊天记录 · 消息服务尚未接入'
  await nextTick()
  if (historyEl.value) historyEl.value.scrollTop = 0
  inputEl.value?.focus()
}

async function backToList() {
  chatOpen.value = false
  await nextTick()
  listEl.value?.querySelector('.conversation.active')?.focus()
}

function submit() {
  status.value = draft.value.trim()
    ? '消息尚未发送：消息服务未接入，输入内容已保留。'
    : '请先输入消息内容。'
}
</script>

<template>
  <section class="message-page" aria-label="消息">
    <div class="message-layout" :class="{ 'chat-open': chatOpen }">
      <section ref="listEl" class="conversation-list" aria-label="会话列表">
        <h2>消息</h2>
        <label class="search-label" for="conversation-search">搜索联系人或聊天内容</label>
        <InputText id="conversation-search" v-model="query" class="conversation-search" type="search"
          placeholder="找找那段对话……" unstyled />
        <button v-for="conversation in filteredConversations" :key="conversation.id" type="button"
          class="conversation" :class="{ active: selectedId === conversation.id }"
          :aria-pressed="selectedId === conversation.id" @click="selectConversation(conversation.id)">
          <span class="avatar">{{ conversation.avatar }}</span>
          <span class="conversation-text">
            <span class="conversation-heading"><span>{{ conversation.name }}</span><time>{{ conversation.time }}</time></span>
            <span class="conversation-snippet">{{ conversation.messages[conversation.messages.length - 1].text }}</span>
          </span>
        </button>
        <p v-if="!filteredConversations.length" class="list-note" role="status">没有找到相关会话，换个关键词试试。</p>
        <p class="list-note">每一段对话，<br>都是一次相遇的开始。</p>
      </section>
      <section class="chat" aria-label="会话预览">
        <header class="chat-header">
          <Button class="chat-back" type="button" label="← 返回" unstyled @click="backToList" />
          <div><h3>{{ selected.name }}</h3><p>{{ selected.topic }}</p></div>
        </header>
        <div ref="historyEl" class="chat-history">
          <p class="chat-date">以下为示例对话</p>
          <div v-for="(message, index) in selected.messages" :key="`${selected.id}-${index}`" class="chat-line"
            :class="{ mine: message.mine }">
            <div class="bubble" :aria-label="`${message.mine ? '我' : selected.name}：${message.text}`">{{ message.text }}</div>
          </div>
        </div>
        <form class="chat-form" @submit.prevent="submit">
          <div class="compose">
            <label for="message-input">消息内容</label>
            <textarea id="message-input" ref="inputEl" v-model="draft" rows="2" maxlength="1000"
              aria-describedby="message-status" placeholder="打个招呼吧……"></textarea>
            <div class="compose-bottom">
              <span>友好沟通，让相遇更简单</span>
              <Button class="send-preview" type="submit" label="预览发送 ↑" unstyled />
            </div>
          </div>
          <p id="message-status" class="preview-status" role="status">{{ status }}</p>
        </form>
      </section>
    </div>
  </section>
</template>
<style scoped>
  .message-layout { display: flex; flex: 1; min-height: 0; }
  .conversation-list { width: 270px; flex-shrink: 0; background: #fafafa; border-right: 1px solid #ddd; padding: 24px 12px; overflow: auto; }
  .conversation-list h2 { margin: 0 10px 20px; font-family: 'Ding', system-ui, sans-serif; font-size: 30px; font-weight: normal; }
  .search-label { display: block; font-size: 11px; color: #777; margin: 0 10px 6px; }
  .conversation-search { width: calc(100% - 20px); margin: 0 10px 18px; padding: 10px 12px; border: 1px solid #ddd; border-radius: 10px; font: inherit; font-size: 12px; background: #fff; }
  .conversation { display: flex; gap: 10px; width: 100%; padding: 14px 10px; border: 0; border-radius: 12px; background: transparent; text-align: left; font: inherit; cursor: pointer; color: #111; }
  .conversation.active { background: #e9e9e9; }
  .avatar { width: 38px; height: 38px; flex-shrink: 0; border-radius: 12px; display: grid; place-items: center; background: #e2e2e2; color: #555; font-size: 15px; }
  .conversation.active .avatar { background: #111; color: #fff; }
  .conversation-text { flex: 1; min-width: 0; }
  .conversation-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; }
  .conversation-heading time { color: #888; font-size: 10px; }
  .conversation-snippet { margin: 7px 0 0; font-size: 11px; color: #777; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .list-note { color: #888; font-size: 11px; margin: 20px 10px; line-height: 1.8; }
  .chat { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .chat-header { padding: 20px 24px; border-bottom: 1px solid #ddd; display: flex; align-items: center; gap: 12px; }
  .chat-header h3 { font-size: 14px; margin: 0 0 5px; font-weight: normal; }
  .chat-header p { font-size: 11px; margin: 0; color: #888; }
  .chat-back { display: none; border: 1px solid #ddd; border-radius: 8px; padding: 8px; background: #fff; font: inherit; font-size: 12px; cursor: pointer; }
  .chat-history { flex: 1; min-height: 0; padding: 24px; overflow: auto; }
  .chat-date { text-align: center; font-size: 10px; color: #888; margin: 0 0 28px; }
  .chat-line { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 20px; }
  .bubble { max-width: 80%; border: 1px solid #e0e0e0; background: #fff; padding: 12px 16px; border-radius: 0 14px 14px; font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; }
  .chat-line.mine { justify-content: flex-end; }
  .mine .bubble { background: #171717; color: #fff; border-color: #171717; border-radius: 14px 0 14px 14px; }
  .chat-form { padding: 0 24px 18px; }
  .compose { padding: 14px; border: 1px solid #d8d8d8; background: #fff; border-radius: 18px; }
  .compose:focus-within { border-color: #aaa; }
  .compose label { display: block; font-size: 11px; color: #777; margin-bottom: 8px; }
  .compose textarea { display: block; width: 100%; resize: vertical; min-height: 52px; max-height: 140px; border: 0; background: transparent; color: #111; font: inherit; font-size: 14px; line-height: 1.7; }
  .compose-bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; }
  .compose-bottom span { color: #999; font-size: 11px; }
  .send-preview { border: 0; background: #111; color: #fff; border-radius: 30px; padding: 9px 18px; font: inherit; font-size: 12px; cursor: pointer; }
  .preview-status { margin: 10px 0 0; min-height: 18px; font-size: 11px; color: #777; text-align: center; }
  button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid #777; outline-offset: 3px; }
  .compose textarea:focus { outline: none; }
.message-page { display: flex; flex: 1; min-height: 0; min-width: 0; overflow: hidden; background: #f2f2f2; color: #111; font-family: 'Round', system-ui, sans-serif; }
.conversation-snippet { display: block; }
.chat-header, .chat-form { flex-shrink: 0; }
.send-preview { flex-shrink: 0; }
@media (max-width: 900px) {
  .conversation-list { width: 220px; }
}
@media (max-width: 640px) {
  .conversation-list { width: 100%; border-right: 0; }
  .message-layout .chat { display: none; }
  .message-layout.chat-open .conversation-list { display: none; }
  .message-layout.chat-open .chat { display: flex; }
  .chat-back { display: block; }
  .chat-header, .chat-history { padding: 18px; }
  .chat-form { padding: 0 14px 16px; }
}
@media (max-height: 520px) {
  .chat { overflow-y: auto; }
  .chat-history { flex: 1 0 150px; }
}
</style>
