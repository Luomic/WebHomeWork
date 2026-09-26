<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'
import Search from '@primeicons/vue/search'
import Plus from '@primeicons/vue/plus';
import Bullseye from '@primeicons/vue/bullseye';
import Sparkles from '@primeicons/vue/sparkles';
const input = ref('')
const inputEl = ref(null)
const status = ref('AI 服务尚未接入，本页仅展示界面。')

const suggestions = [
  { icon: Search, title: '帮我找件好物', description: '说说你的预算和喜好', prompt: '想找一盏适合宿舍的台灯，预算 50 元以内。' },
  { icon: Plus, title: '给闲置写段介绍', description: '让它的好，被更多人看到', prompt: '我想出一本九成新的英语词典，帮我整理一段闲置描述。' },
  { icon: Bullseye, title: '聊聊见面这件事', description: '一起准备一次安心的面交', prompt: '第一次线下面交，需要提前确认哪些事情？' },
]

function choosePrompt(prompt) {
  input.value = prompt
  inputEl.value?.focus()
}

function submit() {
  status.value = input.value.trim()
    ? '提问尚未发送：AI 服务未接入，你可以继续编辑内容。'
    : '先写下你的想法，或选择上方的快捷提问。'
}
</script>

<template>
  <section class="agent-page" aria-label="市集助手">
    <div class="agent-body">
      <div class="agent-mark" aria-hidden="true"><Sparkles size="24px" /></div>
      <h2>让闲置，遇见刚刚好。</h2>
      <p class="agent-intro">不知道从哪里开始？和市集助手聊聊。<br>找点好物，整理闲置，或是计划一次见面。</p>
      <div class="suggestions">
        <button v-for="suggestion in suggestions" :key="suggestion.title" class="suggestion" type="button"
          @click="choosePrompt(suggestion.prompt)">
          <component :is="suggestion.icon" class="tip-icons" />
          <strong>{{ suggestion.title }} ↗</strong>
          <small>{{ suggestion.description }}</small>
        </button>
      </div>
      <form class="agent-form" @submit.prevent="submit">
        <div class="compose">
          <label for="agent-input">想让 JhFair 帮你做什么？</label>
          <textarea id="agent-input" ref="inputEl" v-model="input" rows="2" maxlength="1000"
            aria-describedby="agent-status" placeholder="比如：帮我找一盏 50 元以内的台灯……"></textarea>
          <div class="compose-bottom">
            <span>从一个小小的想法开始</span>
            <Button class="send-preview" type="submit" label="预览提问 ↑" unstyled />
          </div>
        </div>
        <p id="agent-status" class="preview-status" role="status">{{ status }}</p>
      </form>
    </div>
  </section>
</template>
<style scoped>
.agent-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 42px 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.agent-mark {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border: 1px solid #d8d8d8;
  background: #fff;
  border-radius: 18px;
  font-size: 30px;
}

.agent-body h2 {
  font-family: 'Ding', system-ui, sans-serif;
  font-size: 38px;
  font-weight: normal;
  margin: 18px 0 10px;
  text-align: center;
}

.agent-intro {
  color: #777;
  font-size: 14px;
  line-height: 1.8;
  text-align: center;
  margin: 0;
}

.suggestions {
  width: 100%;
  max-width: 620px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 30px 0;
}

.suggestion {
  text-align: left;
  background: #fafafa;
  border: 1px solid #ddd;
  border-radius: 16px;
  padding: 18px 16px;
  cursor: pointer;
  color: #111;
  font: inherit;
}

.suggestion:hover {
  background: #fff;
  border-color: #888;
  transform: translateY(-2px);
}

.suggestion span {
  display: block;
  font-size: 20px;
  margin-bottom: 16px;
}

.suggestion strong {
  font-size: 14px;
  font-weight: normal;
}

.suggestion small {
  display: block;
  color: #777;
  font-size: 11px;
  line-height: 1.7;
  margin-top: 8px;
}

.agent-form {
  width: 100%;
  max-width: 620px;
  margin-top: auto;
}

.compose {
  padding: 14px;
  border: 1px solid #d8d8d8;
  background: #fff;
  border-radius: 18px;
}

.compose:focus-within {
  border-color: #aaa;
}

.compose label {
  display: block;
  font-size: 11px;
  color: #777;
  margin-bottom: 8px;
}

.compose textarea {
  display: block;
  width: 100%;
  resize: vertical;
  min-height: 52px;
  max-height: 140px;
  border: 0;
  background: transparent;
  color: #111;
  font: inherit;
  font-size: 14px;
  line-height: 1.7;
}

.compose-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.compose-bottom span {
  color: #999;
  font-size: 11px;
}

.send-preview {
  border: 0;
  background: #111;
  color: #fff;
  border-radius: 30px;
  padding: 9px 18px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.preview-status {
  margin: 10px 0 0;
  min-height: 18px;
  font-size: 11px;
  color: #777;
  text-align: center;
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid #777;
  outline-offset: 3px;
}

.compose textarea:focus {
  outline: none;
}

.agent-page {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background: #f2f2f2;
  color: #111;
  font-family: 'Round', system-ui, sans-serif;
}

.agent-body {
  width: 100%;
}

.agent-mark,
.suggestions,
.agent-form {
  flex-shrink: 0;
}

.send-preview {
  flex-shrink: 0;
}

.tip-icons{
  margin-bottom: 8px;
}


@media (max-width: 900px) {
  .agent-body {
    padding: 30px 22px 20px;
  }
}

@media (max-width: 640px) {
  .agent-body h2 {
    font-size: 30px;
  }

  .suggestions {
    gap: 8px;
    margin: 22px 0;
  }

  .suggestion {
    padding: 12px 10px;
  }

  .suggestion strong {
    font-size: 12px;
  }

  .suggestion small {
    display: none;
  }

  .suggestion span {
    margin-bottom: 8px;
  }
}
</style>
