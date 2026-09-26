<script setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'

const visible = defineModel('visible', { type: Boolean, default: false })
const account = ref('')
const password = ref('')
const submitted = ref(false)
const showNotice = ref(false)
const accountInvalid = computed(() => submitted.value && !account.value.trim())
const passwordInvalid = computed(() => submitted.value && !password.value)

function submit() {
  submitted.value = true
  showNotice.value = !accountInvalid.value && !passwordInvalid.value
}

watch([account, password], () => { showNotice.value = false })
watch(visible, () => {
  password.value = ''
  submitted.value = false
  showNotice.value = false
})
</script>

<template>
  <Dialog v-model:visible="visible" modal header="登录孤独市集" :draggable="false"
    :style="{ width: '27rem', maxWidth: 'calc(100vw - 2rem)' }"
    :pt="{ root: { class: 'market-login-dialog' } }">
    <div class="login-intro">
      <span class="login-mark" aria-hidden="true">Hi</span>
      <h2>好久不见，朋友。</h2>
      <p>登录市集，让闲置遇见新的主人。</p>
    </div>

    <form class="login-form" novalidate @submit.prevent="submit">
      <div class="login-field">
        <label for="login-account">账号</label>
        <InputText id="login-account" v-model="account" placeholder="请输入账号" autocomplete="username"
          autofocus fluid :invalid="accountInvalid" :aria-invalid="accountInvalid"
          :aria-describedby="accountInvalid ? 'login-account-error' : undefined" required />
        <small v-if="accountInvalid" id="login-account-error" class="login-error" role="alert">请输入账号</small>
      </div>

      <div class="login-field">
        <label for="login-password">密码</label>
        <Password v-model="password" input-id="login-password" placeholder="请输入密码"
          autocomplete="current-password" :feedback="false" toggle-mask fluid
          :invalid="passwordInvalid" :input-props="{
            required: true,
            'aria-invalid': passwordInvalid,
            'aria-describedby': passwordInvalid ? 'login-password-error' : undefined,
          }" />
        <small v-if="passwordInvalid" id="login-password-error" class="login-error" role="alert">请输入密码</small>
      </div>

      <Message v-if="showNotice" severity="info" :closable="false">
        登录功能即将开放，当前尚未接入认证服务。你可以先逛逛市集。
      </Message>

      <Button type="submit" label="登录" severity="contrast" fluid />
      <Button type="button" label="先逛逛，稍后登录" severity="secondary" text fluid @click="visible = false" />
    </form>
  </Dialog>
</template>

<style scoped>
.login-intro {
  padding: 0.5rem 0 1.75rem;
  text-align: center;
}

.login-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #8b5cf6, #4f46e5);
  color: white;
  font-size: 1.125rem;
  font-weight: 700;
}

.login-intro h2 {
  margin: 1rem 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.login-intro p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-field label {
  font-size: 0.875rem;
  font-weight: 500;
}

.login-error {
  color: var(--p-red-500);
}
</style>
