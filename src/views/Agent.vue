<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  CircleAlert,
  History,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Square,
  User,
  X,
} from 'lucide-vue-next'
import LoginDialog from '@/components/LoginDialog.vue'
import { renderMarkdown } from '@/utils/markdown'
import {
  archiveAgentSession,
  authState,
  createAgentSession,
  currentUserId,
  getAgentMessages,
  getAgentSessions,
  isLoggedIn,
  streamAgentChat,
} from '@/api/client'

const input = ref('')
const markdown = (value) => renderMarkdown(value)
const inputEl = ref(null)
const chatEl = ref(null)
const loginVisible = ref(false)
const historyOpen = ref(false)
const sessions = ref([])
const selectedSession = ref(null)
const messages = ref([])
const listLoading = ref(false)
const historyLoading = ref(false)
const creating = ref(false)
const sending = ref(false)
const checkingHistory = ref(false)
const archiveBusy = ref(false)
const archiveTarget = ref(null)
const listError = ref('')
const historyError = ref('')
const status = ref('')
const followLatest = ref(true)
const historyCount = ref(0)
const busy = computed(
  () => sending.value || creating.value || historyLoading.value || archiveBusy.value || listLoading.value,
)
const canSend = computed(() => isLoggedIn.value && !busy.value && !historyError.value && !!input.value.trim())
const sessionTitle = computed(() => selectedSession.value?.title || '和 JhFair 聊聊')
const characterCount = computed(() => Array.from(input.value).length)
const archiveVisible = computed({
  get: () => !!archiveTarget.value,
  set: (visible) => {
    if (!visible && !archiveBusy.value) archiveTarget.value = null
  },
})

// 只在内存保留本页收到的 trace，不伪造历史接口没有返回的调用记录。
const traces = new Map()
let epoch = 0
let listVersion = 0
let historyVersion = 0
let streamController = null
let disposed = false

const suggestions = [
  {
    icon: Search,
    title: '帮我找件好物',
    description: '搜索市集里的在售闲置',
    prompt: '想找一盏适合宿舍的台灯，预算 50 元以内。',
  },
  {
    icon: User,
    title: '看看我的成长',
    description: '查询等级、经验和签到',
    prompt: '我现在几级，还差多少经验升级，连续签到了几天？',
  },
  {
    icon: Plus,
    title: '给闲置写段介绍',
    description: '一起整理，不代替你发布',
    prompt: '我想出一本九成新的英语词典，帮我整理一段闲置描述。',
  },
]
const traceLabels = { search_goods: '搜索在售商品', get_my_profile: '查询我的等级与经验' }

function valid(turn) {
  return !disposed && turn === epoch && isLoggedIn.value
}
function errorText(error, fallback) {
  return error instanceof Error ? error.message : fallback
}
function selectionKey() {
  return currentUserId.value ? 'jhfair_session_' + currentUserId.value : ''
}
function rememberSession(id) {
  const key = selectionKey()
  if (!key) return
  try {
    sessionStorage.setItem(key, String(id || 0))
  } catch {
    /* 禁止存储时仍可正常聊天 */
  }
}
function recalledSession() {
  try {
    const value = sessionStorage.getItem(selectionKey())
    if (value === null) return null
    const id = Number(value)
    return Number.isSafeInteger(id) && id >= 0 ? id : null
  } catch {
    return null
  }
}
function formatTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf())
    ? ''
    : new Intl.DateTimeFormat('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
}
function messageId() {
  // getRandomValues 在非 HTTPS 环境也可用，避免依赖安全上下文中的 randomUUID。
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}
function choosePrompt(prompt) {
  input.value = prompt
  nextTick(() => inputEl.value?.focus())
}
function trackScroll() {
  const el = chatEl.value
  if (el) followLatest.value = el.scrollHeight - el.scrollTop - el.clientHeight < 90
}
async function scrollToLatest(force = false) {
  await nextTick()
  if ((force || followLatest.value) && chatEl.value) {
    chatEl.value.scrollTop = chatEl.value.scrollHeight
    followLatest.value = true
  }
}
function handleKeydown(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  if (canSend.value) void submit()
}

async function refreshSessions() {
  if (!isLoggedIn.value) return false
  const turn = epoch
  const version = ++listVersion
  listLoading.value = true
  listError.value = ''
  try {
    const list = await getAgentSessions()
    if (!valid(turn) || version !== listVersion) return false
    sessions.value = Array.isArray(list) ? list : []
    const current = sessions.value.find((item) => item.id === selectedSession.value?.id)
    if (current) selectedSession.value = current
    return true
  } catch (error) {
    if (valid(turn) && version === listVersion) listError.value = errorText(error, '获取会话列表失败')
    return false
  } finally {
    if (valid(turn) && version === listVersion) listLoading.value = false
  }
}

async function loadHistory(session, closeHistory = true) {
  if (busy.value || !isLoggedIn.value) return
  const turn = epoch
  const version = ++historyVersion
  const sameSession = selectedSession.value?.id === session.id
  selectedSession.value = session
  rememberSession(session.id)
  if (!sameSession) messages.value = []
  historyCount.value = 0
  historyError.value = ''
  status.value = ''
  historyLoading.value = true
  if (closeHistory) historyOpen.value = false
  try {
    const list = await getAgentMessages(session.id)
    if (!valid(turn) || version !== historyVersion) return
    historyCount.value = Array.isArray(list) ? list.length : 0
    messages.value = (Array.isArray(list) ? list : [])
      .filter((item) => item.role === 'user' || item.role === 'assistant')
      .map((item, index, all) => ({
        ...item,
        key: 'saved-' + item.id,
        trace: traces.get(item.id) || [],
        // 历史失败记录可能包含内部错误，只展示面向用户的状态。
        notice: item.status === 'failed' ? '这次回答未完成。可重新提问，或稍后再试。' : '',
        prompt:
          item.role === 'assistant'
            ? all
                .slice(0, index)
                .reverse()
                .find((row) => row.role === 'user')?.content || ''
            : '',
      }))
    await scrollToLatest(true)
  } catch (error) {
    if (valid(turn) && version === historyVersion) historyError.value = errorText(error, '获取历史消息失败')
  } finally {
    if (valid(turn) && version === historyVersion) historyLoading.value = false
  }
}

async function newSession() {
  if (!isLoggedIn.value) {
    loginVisible.value = true
    return
  }
  if (busy.value) return
  const turn = epoch
  creating.value = true
  status.value = ''
  try {
    const session = await createAgentSession()
    if (!valid(turn)) return
    selectedSession.value = session
    sessions.value = [session, ...sessions.value.filter((item) => item.id !== session.id)].slice(0, 20)
    messages.value = []
    input.value = ''
    historyError.value = ''
    historyCount.value = 0
    rememberSession(session.id)
    historyOpen.value = false
    nextTick(() => inputEl.value?.focus())
  } catch (error) {
    if (valid(turn)) status.value = errorText(error, '创建会话失败')
  } finally {
    if (valid(turn)) creating.value = false
  }
}

async function confirmArchive() {
  if (!archiveTarget.value || busy.value || !isLoggedIn.value) return
  const turn = epoch
  const target = archiveTarget.value
  archiveBusy.value = true
  status.value = ''
  try {
    await archiveAgentSession(target.id)
    if (!valid(turn)) return
    sessions.value = sessions.value.filter((item) => item.id !== target.id)
    if (selectedSession.value?.id === target.id) {
      selectedSession.value = null
      messages.value = []
      historyError.value = ''
      historyCount.value = 0
      rememberSession(0)
    }
    status.value = '会话已归档，服务端仍保留记录。'
    archiveTarget.value = null
    void refreshSessions()
  } catch (error) {
    if (valid(turn)) {
      status.value = errorText(error, '归档失败')
      archiveTarget.value = null
    }
  } finally {
    if (valid(turn)) archiveBusy.value = false
  }
}

async function submit() {
  if (!isLoggedIn.value) {
    loginVisible.value = true
    return
  }
  if (!canSend.value) return
  const prompt = input.value.trim()
  if (Array.from(prompt).length > 1000) {
    status.value = '每条提问不能超过 1000 字。'
    return
  }
  const turn = epoch
  const controller = new AbortController()
  streamController = controller
  sending.value = true
  status.value = ''
  let assistant = null
  let request = null
  let userMessage = null
  let receivedDone = false
  try {
    // 先获得服务端会话 ID，即使首次提问断开，也能再次查询这段历史。
    if (!selectedSession.value) {
      const session = await createAgentSession(Array.from(prompt).slice(0, 20).join(''))
      if (!valid(turn)) return
      selectedSession.value = session
      sessions.value = [session, ...sessions.value.filter((item) => item.id !== session.id)].slice(0, 20)
      rememberSession(session.id)
    }
    if (controller.signal.aborted) return
    request = { session_id: selectedSession.value.id, message: prompt, client_msg_id: messageId() }
    const createdAt = new Date().toISOString()
    messages.value.push({
      key: request.client_msg_id,
      role: 'user',
      content: prompt,
      status: 'sending',
      created_at: createdAt,
    })
    userMessage = messages.value[messages.value.length - 1]
    messages.value.push({
      key: request.client_msg_id + '-answer',
      role: 'assistant',
      content: '',
      status: 'streaming',
      trace: [],
      prompt,
      created_at: createdAt,
      notice: '',
    })
    assistant = messages.value[messages.value.length - 1]
    input.value = ''
    await scrollToLatest(true)
    await streamAgentChat(
      request,
      (event) => {
        if (!valid(turn) || controller.signal.aborted) return
        if (event.type === 'start') status.value = 'JhFair 正在处理你的提问…'
        if (event.type === 'delta') {
          assistant.content += event.text
          status.value = '正在接收回答…'
          void scrollToLatest()
        }
        if (event.type === 'done') {
          receivedDone = true
          request.session_id = event.session_id
          selectedSession.value = { ...selectedSession.value, id: event.session_id }
          rememberSession(event.session_id)
          assistant.trace = event.trace
          assistant.status = 'done'
          userMessage.status = 'done'
        }
      },
      controller.signal,
    )
    if (!valid(turn)) return
    checkingHistory.value = true
    status.value = '回答已结束，正在核对已保存的消息…'
    // done 不含正文，幂等命中甚至没有 delta；以对应 client_msg_id 的历史回答为准。
    // 同时去掉工具多轮调用中流出的中间话语，最终展示服务端保存的回答。
    try {
      const history = await getAgentMessages(request.session_id)
      if (!valid(turn)) return
      const rows = Array.isArray(history) ? history : []
      historyCount.value = rows.length
      const userIndex = rows.findIndex((item) => item.role === 'user' && item.client_msg_id === request.client_msg_id)
      const next = userIndex < 0 ? null : rows[userIndex + 1]
      const saved = next?.role === 'assistant' ? next : null
      if (userIndex >= 0) Object.assign(userMessage, { id: rows[userIndex].id, status: 'done' })
      if (saved) {
        Object.assign(assistant, {
          id: saved.id,
          content: saved.content,
          status: saved.status,
          created_at: saved.created_at,
        })
        traces.set(saved.id, assistant.trace)
        if (saved.status !== 'done') assistant.notice = '服务端记录显示这次回答未完成，请重新提问。'
        status.value = saved.status === 'done' ? '回答已完成。' : '这次回答未完成。'
      } else {
        assistant.notice = '暂未从历史接口取到本次完整回答，当前显示已收到的片段。'
        status.value = '流式已结束，可稍后核对历史。'
      }
    } catch {
      if (valid(turn)) {
        assistant.notice = '回答已结束，但历史核对失败；当前显示流式内容，可稍后核对历史。'
        status.value = '历史核对失败，已保留收到的内容。'
      }
    }
  } catch (error) {
    if (!valid(turn)) return
    const stopped = controller.signal.aborted
    if (assistant) {
      assistant.status = stopped ? 'stopped' : 'failed'
      assistant.notice = stopped
        ? '已停止接收，以上内容可能不完整。服务端保存状态请通过“核对历史”确认。'
        : errorText(error, '连接失败，请稍后重试') + '。已保留收到的片段，请先核对历史，避免重复提问。'
    }
    if (userMessage && !receivedDone) userMessage.status = 'unconfirmed'
    status.value = stopped ? '已停止接收。' : errorText(error, '提问失败，请稍后重试')
  } finally {
    if (valid(turn)) {
      sending.value = false
      checkingHistory.value = false
      streamController = null
      void refreshSessions()
      void scrollToLatest()
    }
  }
}

function stopReceiving() {
  streamController?.abort()
  status.value = '已请求停止接收；服务端是否保存请核对历史。'
}

watch(
  () => [authState.token, isLoggedIn.value, currentUserId.value],
  async () => {
    const turn = ++epoch
    streamController?.abort()
    streamController = null
    sessions.value = []
    selectedSession.value = null
    messages.value = []
    traces.clear()
    listLoading.value = historyLoading.value = creating.value = sending.value = archiveBusy.value = false
    checkingHistory.value = false
    listError.value = historyError.value = status.value = ''
    archiveTarget.value = null
    historyCount.value = 0
    input.value = ''
    if (!isLoggedIn.value) return
    const recalled = recalledSession()
    const loaded = await refreshSessions()
    if (!valid(turn) || !loaded || busy.value || selectedSession.value) return
    if (recalled === 0) return
    const session = recalled
      ? sessions.value.find((item) => item.id === recalled) || { id: recalled, title: '历史会话' }
      : sessions.value[0]
    if (session) await loadHistory(session, false)
  },
  { immediate: true, flush: 'sync' },
)

onBeforeUnmount(() => {
  disposed = true
  epoch++
  streamController?.abort()
  traces.clear()
})
</script>

<template>
  <section class="agent-page" aria-label="JhFair 市集助手">
    <aside id="agent-history" class="history-panel" :class="{ 'is-open': historyOpen }" aria-label="历史会话">
      <div class="history-heading">
        <h2><History :size="17" aria-hidden="true" />历史会话</h2>
        <Button
          class="plain-button mobile-history-close"
          aria-label="收起历史会话"
          unstyled
          @click="historyOpen = false"
          ><X :size="18"
        /></Button>
      </div>
      <Button class="new-session" :disabled="busy" unstyled @click="newSession"
        ><Plus :size="16" aria-hidden="true" />{{ creating ? '正在创建…' : '新建会话' }}</Button
      >
      <div class="history-caption">
        <span>最近 20 个会话</span>
        <Button
          class="plain-button"
          :disabled="listLoading || busy || !isLoggedIn"
          aria-label="刷新会话列表"
          unstyled
          @click="refreshSessions"
          ><RefreshCw :size="14"
        /></Button>
      </div>
      <p v-if="!isLoggedIn" class="panel-note">登录后查看你的会话记录。</p>
      <p v-else-if="listLoading && !sessions.length" class="panel-note" role="status">正在加载会话…</p>
      <div v-if="listError" class="panel-note" role="alert">
        {{ listError }}
        <button type="button" class="text-button" :disabled="listLoading || busy" @click="refreshSessions">重试</button>
      </div>
      <p v-else-if="isLoggedIn && !listLoading && !sessions.length" class="panel-note">
        还没有会话，从一个问题开始吧。
      </p>
      <ul class="session-list">
        <li v-for="session in sessions" :key="session.id" :class="{ selected: selectedSession?.id === session.id }">
          <button
            type="button"
            class="session-select"
            :disabled="busy"
            :aria-current="selectedSession?.id === session.id ? 'true' : undefined"
            @click="loadHistory(session)"
          >
            <strong>{{ session.title || '新会话' }}</strong>
            <small>{{ formatTime(session.last_msg_at) }}</small>
          </button>
          <Button
            class="plain-button archive-button"
            :disabled="busy"
            :aria-label="'归档会话：' + session.title"
            unstyled
            @click="archiveTarget = session"
            ><Archive :size="15"
          /></Button>
        </li>
      </ul>
      <p class="history-footnote">归档后不再列出，记录由服务端保留。</p>
    </aside>

    <div class="agent-main">
      <header class="chat-header">
        <Button
          class="plain-button history-toggle"
          :aria-expanded="historyOpen"
          aria-controls="agent-history"
          aria-label="展开历史会话"
          unstyled
          @click="historyOpen = !historyOpen"
          ><History :size="20"
        /></Button>
        <div class="chat-heading">
          <strong>{{ sessionTitle }}</strong
          ><small>与 JhFair 一起，探索孤独市集</small>
        </div>
        <Button
          v-if="selectedSession"
          class="plain-button"
          :disabled="busy"
          aria-label="核对历史消息"
          title="核对历史"
          unstyled
          @click="loadHistory(selectedSession)"
          ><RefreshCw :size="17" /><span class="refresh-label">核对历史</span></Button
        >
        <Button
          v-if="selectedSession"
          class="plain-button"
          :disabled="busy"
          aria-label="归档当前会话"
          title="归档当前会话"
          unstyled
          @click="archiveTarget = selectedSession"
          ><Archive :size="17"
        /></Button>
      </header>

      <div ref="chatEl" class="chat-scroll" :aria-busy="historyLoading" @scroll="trackScroll">
        <div v-if="historyLoading" class="empty-note" role="status">正在读取会话记录…</div>
        <div v-else-if="historyError" class="empty-note" role="alert">
          <CircleAlert :size="24" aria-hidden="true" />
          <p>{{ historyError }}</p>
          <Button class="new-session" :disabled="busy" unstyled @click="loadHistory(selectedSession)">重新加载</Button>
        </div>
        <div v-else-if="!messages.length" class="agent-welcome">
          <div class="agent-mark" aria-hidden="true"><Sparkles :size="25" /></div>
          <h2>让闲置，遇见刚刚好。</h2>
          <p class="agent-intro">
            找点好物，整理闲置。
          </p>
          <div class="suggestions">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion.title"
              class="suggestion"
              type="button"
              :disabled="busy"
              @click="choosePrompt(suggestion.prompt)"
            >
              <component :is="suggestion.icon" :size="19" aria-hidden="true" />
              <strong>{{ suggestion.title }}</strong
              ><small>{{ suggestion.description }}</small>
            </button>
          </div>
          <p class="scope-note">助手提供查询和建议。</p>
          <Button v-if="!isLoggedIn" class="new-session" unstyled @click="loginVisible = true">登录后开始聊天</Button>
        </div>
        <ol v-else class="message-list" aria-label="会话消息">
          <li v-for="message in messages" :key="message.key" class="chat-message" :class="message.role">
            <div class="message-meta">
              <Sparkles v-if="message.role === 'assistant'" :size="15" aria-hidden="true" />
              <span>{{ message.role === 'assistant' ? 'JhFair' : '你' }}</span>
              <time>{{ formatTime(message.created_at) }}</time>
              <small v-if="message.status === 'unconfirmed'">保存状态待核对</small>
            </div>
            <div class="message-bubble">
              <div v-if="message.content" class="message-content" v-html="markdown(message.content)"></div>
              <p v-else-if="message.status === 'streaming'" class="thinking">正在思考，可能需要查询市集信息…</p>
              <p v-else class="thinking">
                {{ message.status === 'done' ? '暂未取到回答正文，请核对历史。' : '本次未收到完整回答。' }}
              </p>
              <span v-if="message.status === 'streaming' && message.content" class="stream-indicator">正在生成…</span>
            </div>
            <details v-if="message.trace?.length" class="trace-details">
              <summary>本次接口调用 · {{ message.trace.length }} 项</summary>
              <ul>
                <li v-for="(trace, index) in message.trace" :key="index">
                  <div class="trace-row">
                    <Check v-if="trace.ok" :size="14" aria-hidden="true" /><CircleAlert
                      v-else
                      :size="14"
                      aria-hidden="true"
                    /><strong>{{ traceLabels[trace.name] || '接口调用' }}</strong
                    ><span>{{ trace.ok ? '成功' : '失败' }} · {{ trace.cost_ms }} ms</span>
                  </div>
                  <code>{{ trace.name }}</code>
                  <p v-if="!trace.ok && trace.err_msg">{{ trace.err_msg }}</p>
                </li>
              </ul>
            </details>
            <p v-if="message.notice" class="message-notice" role="status">{{ message.notice }}</p>
            <button
              v-if="message.role === 'assistant' && ['failed', 'stopped'].includes(message.status) && message.prompt"
              class="text-button"
              type="button"
              :disabled="busy"
              @click="choosePrompt(message.prompt)"
            >
              重新编辑提问
            </button>
          </li>
        </ol>
        <p v-if="historyCount >= 200" class="history-limit">
          历史接口最多返回最早 200 条消息，后续消息可能无法在刷新后显示。建议新建会话继续。
        </p>
      </div>

      <div class="composer-area">
        <Button v-if="!followLatest && messages.length" class="latest-button" unstyled @click="scrollToLatest(true)"
          ><ArrowDown :size="14" aria-hidden="true" />回到最新</Button
        >
        <form class="agent-form" @submit.prevent="submit">
          <div class="compose">
            <label for="agent-input">想让 JhFair 帮你做什么？</label>
            <textarea
              id="agent-input"
              ref="inputEl"
              v-model="input"
              rows="2"
              maxlength="1000"
              :disabled="!isLoggedIn"
              aria-describedby="agent-status agent-input-hint"
              placeholder="比如：帮我找一盏 50 元以内的台灯……"
              @keydown="handleKeydown"
            ></textarea>
            <div class="compose-bottom">
              <span id="agent-input-hint">{{ characterCount }}/1000</span>
              <Button
                v-if="sending"
                class="send-button"
                type="button"
                :disabled="checkingHistory"
                unstyled
                @click="stopReceiving"
                ><Square :size="13" aria-hidden="true" />{{ checkingHistory ? '核对中…' : '停止接收' }}</Button
              >
              <Button v-else-if="!isLoggedIn" class="send-button" type="button" unstyled @click="loginVisible = true"
                >登录后提问</Button
              >
              <Button v-else class="send-button" type="submit" :disabled="!canSend" unstyled
                >发送<ArrowUp :size="16" aria-hidden="true"
              /></Button>
            </div>
          </div>
          <p id="agent-status" class="agent-status" role="status">
            {{
              !isLoggedIn
                ? '请先登录，会话仅对本人可见。'
                : status || '内容由AI生成，请仔细甄别'
            }}
          </p>
        </form>
      </div>
    </div>

    <Dialog
      v-model:visible="archiveVisible"
      header="归档这段会话？"
      modal
      :closable="!archiveBusy"
      :close-on-escape="!archiveBusy"
      :style="{ width: 'min(420px, 92vw)' }"
    >
      <p class="archive-description">
        “{{ archiveTarget?.title }}”将从历史列表移除，服务端仍保留消息。
      </p>
      <template #footer
        ><Button label="取消" severity="secondary" :disabled="archiveBusy" @click="archiveTarget = null" /><Button
          :label="archiveBusy ? '正在归档…' : '确认归档'"
          :disabled="archiveBusy"
          @click="confirmArchive"
      /></template>
    </Dialog>
    <LoginDialog v-model:visible="loginVisible" />
  </section>
</template>

<style scoped>
.agent-page {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background: var(--app-bg);
  color: var(--app-text);
  font-family: 'Round', system-ui, sans-serif;
}
.history-panel {
  display: flex;
  flex-direction: column;
  width: 224px;
  flex-shrink: 0;
  min-height: 0;
  padding: 22px 14px 16px;
  border-right: 1px solid var(--app-line);
  background: var(--app-field);
}
.history-heading,
.history-heading h2,
.history-caption,
.plain-button,
.new-session,
.send-button,
.latest-button {
  display: flex;
  align-items: center;
  gap: 8px;
}
.history-heading {
  justify-content: space-between;
  margin-bottom: 20px;
}
.history-heading h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}
.plain-button {
  justify-content: center;
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: var(--app-muted);
  padding: 8px;
  border-radius: 9px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
.plain-button:hover:not(:disabled) {
  background: var(--app-surface);
  color: var(--app-text);
}
.new-session {
  justify-content: center;
  padding: 10px 14px;
  border: 1px solid var(--app-line);
  border-radius: 12px;
  background: var(--app-bg);
  color: var(--app-text);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.history-caption {
  justify-content: space-between;
  margin: 16px 0 5px;
  color: var(--app-muted);
  font-size: 11px;
}
.panel-note,
.history-footnote {
  color: var(--app-muted);
  font-size: 11px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.history-footnote {
  margin: auto 2px 0;
  padding-top: 14px;
}
.session-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
  overflow-y: auto;
  min-height: 0;
}
.session-list li {
  display: flex;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 12px;
  margin: 4px 0;
}
.session-list li.selected {
  border-color: var(--app-line);
  background: var(--app-bg);
}
.session-select {
  flex: 1;
  min-width: 0;
  padding: 12px 8px;
  border: 0;
  background: transparent;
  color: var(--app-text);
  text-align: left;
  font: inherit;
  cursor: pointer;
}
.session-select strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: normal;
}
.session-select small {
  display: block;
  color: var(--app-muted);
  font-size: 10px;
  margin-top: 6px;
}
.archive-button {
  margin-right: 3px;
}
.agent-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
}
.chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 28px;
  border-bottom: 1px solid var(--app-line);
  flex-shrink: 0;
}
.chat-heading {
  min-width: 0;
  flex: 1;
}
.chat-heading strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
}
.chat-heading small {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  color: var(--app-muted);
}
.chat-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 28px 32px;
}
.agent-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 760px;
  margin: 26px auto 0;
}
.agent-mark {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border: 1px solid var(--app-line);
  background: var(--app-field);
  border-radius: 18px;
}
.agent-welcome h2 {
  font-family: 'Ding', system-ui, sans-serif;
  font-size: 36px;
  font-weight: normal;
  margin: 18px 0 10px;
  text-align: center;
}
.agent-intro {
  color: var(--app-muted);
  font-size: 13px;
  line-height: 1.9;
  text-align: center;
  margin: 0;
}
.suggestions {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 28px 0 14px;
}
.suggestion {
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  background: var(--app-field);
  border: 1px solid var(--app-line);
  border-radius: 16px;
  padding: 16px 12px;
  cursor: pointer;
  color: var(--app-text);
  font: inherit;
}
.suggestion:hover:not(:disabled) {
  background: var(--app-surface);
  border-color: var(--app-faint);
}
.suggestion strong {
  font-size: 13px;
  font-weight: normal;
}
.suggestion small {
  color: var(--app-muted);
  font-size: 10px;
  line-height: 1.7;
}
.scope-note {
  color: var(--app-muted);
  font-size: 11px;
  text-align: center;
  line-height: 1.8;
}
.empty-note {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 40px 12px;
  color: var(--app-muted);
  font-size: 13px;
  text-align: center;
}
.message-list {
  display: flex;
  flex-direction: column;
  gap: 26px;
  max-width: 760px;
  list-style: none;
  padding: 0;
  margin: 0 auto;
}
.chat-message {
  max-width: 95%;
  min-width: 0;
  align-self: flex-start;
}
.chat-message.user {
  align-self: flex-end;
  max-width: 85%;
}
.message-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  font-size: 11px;
  color: var(--app-muted);
  margin-bottom: 8px;
}
.message-meta time,
.message-meta small {
  font-size: 10px;
}
.user .message-meta {
  justify-content: flex-end;
}
.message-bubble {
  padding: 14px 17px;
  border-radius: 16px;
  border: 1px solid var(--app-line);
  background: var(--app-field);
}
.user .message-bubble {
  background: var(--app-surface);
}
.message-content {
  overflow-wrap: anywhere;
  font-size: 14px;
  line-height: 1.9;
  margin: 0;
}
.message-content :deep(p) { margin: 0 0 8px; }
.message-content :deep(p:last-child) { margin-bottom: 0; }
.message-content :deep(h1), .message-content :deep(h2), .message-content :deep(h3) { margin: 8px 0 5px; font-size: 1em; font-weight: 650; }
.message-content :deep(ul) { margin: 4px 0 8px; padding-left: 20px; }
.message-content :deep(code) { padding: 1px 4px; border-radius: 4px; background: var(--app-hover); font-size: .92em; }
.message-content :deep(a) { color: inherit; text-decoration: underline; }
.thinking,
.stream-indicator {
  color: var(--app-muted);
  font-size: 12px;
  line-height: 1.8;
  margin: 0;
}
.stream-indicator {
  display: block;
  margin-top: 8px;
}
.trace-details {
  padding: 10px 2px 0;
  font-size: 11px;
  color: var(--app-muted);
  overflow-wrap: anywhere;
}
.trace-details summary {
  cursor: pointer;
  width: fit-content;
}
.trace-details ul {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
}
.trace-details li {
  border-left: 2px solid var(--app-line);
  padding: 8px 12px;
  margin-top: 8px;
}
.trace-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.trace-row strong {
  font-weight: normal;
  color: var(--app-text);
}
.trace-details code {
  display: block;
  margin-top: 5px;
  font-size: 10px;
}
.trace-details p {
  margin: 5px 0 0;
}
.message-notice,
.history-limit {
  color: var(--app-muted);
  font-size: 11px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.history-limit {
  max-width: 760px;
  margin: 22px auto 0;
  padding: 12px;
  border: 1px dashed var(--app-line);
  border-radius: 10px;
}
.text-button {
  border: 0;
  background: transparent;
  color: var(--app-text);
  font: inherit;
  font-size: 11px;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  padding: 4px 0;
}
.composer-area {
  position: relative;
  flex-shrink: 0;
  padding: 14px 32px 18px;
  border-top: 1px solid var(--app-line);
}
.agent-form {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
}
.compose {
  padding: 13px 15px;
  border: 1px solid var(--app-line);
  background: var(--app-field);
  border-radius: 18px;
}
.compose:focus-within {
  border-color: var(--app-faint);
}
.compose label {
  display: block;
  font-size: 11px;
  color: var(--app-muted);
  margin-bottom: 8px;
}
.compose textarea {
  display: block;
  width: 100%;
  resize: vertical;
  min-height: 50px;
  max-height: 140px;
  border: 0;
  background: transparent;
  color: var(--app-text);
  font: inherit;
  font-size: 14px;
  line-height: 1.7;
}
.compose-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
}
.compose-bottom span {
  color: var(--app-muted);
  font-size: 10px;
}
.send-button {
  flex-shrink: 0;
  border: 0;
  background: var(--app-text);
  color: var(--app-bg);
  border-radius: 24px;
  padding: 9px 15px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.agent-status {
  margin: 9px 0 0;
  min-height: 18px;
  font-size: 10px;
  color: var(--app-muted);
  text-align: center;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.latest-button {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  border: 1px solid var(--app-line);
  border-radius: 18px;
  padding: 7px 12px;
  background: var(--app-bg);
  color: var(--app-text);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.archive-description {
  font-size: 13px;
  line-height: 1.9;
  color: var(--app-muted);
  overflow-wrap: anywhere;
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
button:focus-visible,
textarea:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--app-muted);
  outline-offset: 3px;
}
.compose textarea:focus {
  outline: none;
}
.history-toggle,
.mobile-history-close {
  display: none;
}
@media (max-width: 1100px) {
  .history-panel {
    width: 195px;
    padding-inline: 10px;
  }
  .chat-scroll {
    padding: 22px;
  }
  .composer-area {
    padding-inline: 22px;
  }
  .agent-welcome h2 {
    font-size: 30px;
  }
}
@media (max-width: 760px) {
  .agent-page {
    position: relative;
  }
  .history-panel {
    display: none;
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 5;
    width: min(300px, 90%);
    background: var(--app-bg);
    box-shadow: 12px 0 28px #0002;
  }
  .history-panel.is-open {
    display: flex;
  }
  .history-toggle,
  .mobile-history-close {
    display: flex;
  }
  .chat-header {
    padding: 12px 14px;
  }
  .chat-scroll {
    padding: 20px 16px;
  }
  .composer-area {
    padding: 12px 14px;
  }
  .refresh-label {
    display: none;
  }
  .agent-welcome {
    margin-top: 14px;
  }
  .suggestions {
    gap: 7px;
    margin-top: 22px;
  }
  .suggestion {
    padding: 13px 9px;
  }
  .suggestion strong {
    font-size: 12px;
  }
  .suggestion small {
    display: none;
  }
  .chat-message {
    max-width: 100%;
  }
  .compose-bottom span {
    max-width: 180px;
    line-height: 1.6;
  }
}
</style>
