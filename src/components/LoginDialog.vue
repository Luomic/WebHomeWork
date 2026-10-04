<script setup>

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import { login, register } from '@/api/client'


const isAdmin = defineEmits(['userRole'])
// defineModel：声明一个可由父组件双向绑定的 prop（父用 v-model:visible="开关"）。
// 子组件里直接改 visible，父组件那边的变量自动跟着变——这就是"双向"
const visible = defineModel('visible', { type: Boolean, default: false })
// ref('')：字符串响应式数据，存输入框内容
const account = ref('')
const password = ref('')
const confirmation = ref('')
const qq = ref('')
const email = ref('')
// 当前模式：登录 or 注册
const mode = ref('login')
const registering = computed(() => mode.value === 'register')
const submitted = ref(false)   // 用户是否点过提交（提交前不显示错误）
const successNotice = ref('')
const submitting = ref(false)
const submitError = ref('')
const captchaContainer = ref(null)
const captchaError = ref('')

const vaptchaVid = "id_646c591b35952e5"
const vaptchaVkey = "key_b34ef987bc30c4c1c7c50e"
let captchaInstance = null
let captchaLoadPromise = null
let captchaValues = { token: '', knock: '', dfu: '', ip: '' }
const captchaValidating = ref(false)
const captchaPassed = ref(false)

function resetCaptcha() {
  captchaValues = { token: '', knock: '', dfu: '', ip: '' }
  captchaError.value = ''
  captchaPassed.value = false
  captchaInstance?.reset?.()
}

function loadVaptchaScript() {
  if (typeof window !== 'undefined' && typeof window.vaptcha === 'function') return Promise.resolve()
  if (captchaLoadPromise) return captchaLoadPromise
  const scriptUrls = [
    'https://c4.vaptcha.com/src/v4.js',
    'https://v41.vaptcha.com/v4.js',
    'https://v-cn.vaptcha.com/v4.js',
    'https://js.vaptcha.com/v4.js',
  ]
  captchaLoadPromise = (async () => {
    for (const url of scriptUrls) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = url
          script.async = true
          script.dataset.vaptchaV4 = 'true'
          script.onload = () => resolve()
          script.onerror = () => { script.remove(); reject(new Error(url)) }
          document.head.appendChild(script)
        })
        if (typeof window.vaptcha === 'function') return
      } catch { /* 当前节点不可用时继续尝试备用节点 */ }
    }
    throw new Error('Vaptcha 脚本加载失败，请检查网络或域名白名单。')
  })().catch(error => {
    captchaLoadPromise = null
    throw error
  })
  return captchaLoadPromise
}

async function initCaptcha() {
  if (!registering.value || !visible.value || captchaInstance || !captchaContainer.value) return
  if (!vaptchaVid || !vaptchaVkey) {
    captchaError.value = '人机验证暂未配置，请联系管理员。'
    return
  }
  try {
    await loadVaptchaScript()
    const factory = window.vaptcha
    if (!factory) throw new Error('Vaptcha 脚本未就绪')
    captchaInstance = await factory({
      vid: vaptchaVid,
      container: '#vaptcha-container',
      lang: 'zh-CN',
    })
  } catch (error) {
    captchaInstance = null
    captchaError.value = error instanceof Error ? error.message : '人机验证加载失败，请稍后重试。'
  }
}

async function validateCaptcha() {
  if (!captchaInstance?.validate) throw new Error('人机验证尚未加载，请稍后重试。')
  captchaValidating.value = true
  captchaError.value = ''
  try {
    const result = await captchaInstance.validate()
    if (!result || !result.token || !result.knock) throw new Error('请先完成下方人机验证。')
    captchaValues = {
      token: String(result.token),
      knock: String(result.knock),
      dfu: String(result.dfu || ''),
      ip: String(result.ip || ''),
    }
    if (!captchaValues.dfu || !captchaValues.ip) throw new Error('人机验证结果不完整，请重试。')
    captchaPassed.value = true
    return true
  } catch (error) {
    captchaPassed.value = false
    captchaError.value = error instanceof Error ? error.message : '人机验证未通过，请重试。'
    return false
  } finally {
    captchaValidating.value = false
  }
}

async function verifyCaptcha() {
  if (!captchaPassed.value || !captchaValues.token || !captchaValues.knock || !captchaValues.dfu || !captchaValues.ip) throw new Error(captchaError.value || '请先完成下方人机验证。')
  const response = await fetch('https://v41.vaptcha.com/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vid: vaptchaVid, vkey: vaptchaVkey, token: captchaValues.token, knock: captchaValues.knock, dfu: captchaValues.dfu, ip: captchaValues.ip }),
  })
  let body = null
  try { body = await response.json() } catch { /* verify 接口失败时可能没有 JSON 正文 */ }
  const code = Number(body?.code)
  const failedResult = body?.success === false || body?.success === 0 || body?.result === false || body?.result === 0 || body?.result === '0'
  const hasExplicitSuccess = body?.success === true || body?.success === 1 || body?.result === true || body?.result === 1
  const failedCode = body?.code !== undefined && code !== 0 && code !== 200
  const rejected = !response.ok || failedResult || (failedCode && !hasExplicitSuccess)
  if (rejected) throw new Error(body?.msg || '人机验证未通过，请重试。')
}

// 接口只要求账号和密码必填；账号最长 50，文档未约定密码长度和字符规则。
// 确认密码仅用于本地表单，QQ 和邮箱是注册时的可选字段。
const accountError = computed(() => !account.value.trim() ? '请输入账号' : account.value.length > 50 ? '账号最多 50 个字符' : '')
const passwordError = computed(() => !password.value ? '请输入密码' : '')
const confirmationError = computed(() => registering.value && !confirmation.value ? '请再次输入密码' : registering.value && confirmation.value !== password.value ? '两次输入的密码不一致' : '')
const qqError = computed(() => registering.value && qq.value.length > 20 ? 'QQ 号最多 20 个字符' : '')
const emailError = computed(() => registering.value && email.value.length > 100 ? '邮箱最多 100 个字符' : '')

// 用来标红的值 = 点过提交 且 有错误文案。
const accountInvalid = computed(() => submitted.value && !!accountError.value)
const passwordInvalid = computed(() => submitted.value && !!passwordError.value)
const confirmationInvalid = computed(() => submitted.value && !!confirmationError.value)
const qqInvalid = computed(() => submitted.value && !!qqError.value)
const emailInvalid = computed(() => submitted.value && !!emailError.value)

async function switchMode(value) {
  if (mode.value === value) return
  mode.value = value
  // 切换模式时清空密码相关状态，避免注册的校验残留到登录
  password.value = ''; confirmation.value = ''; submitted.value = false; successNotice.value = ''; submitError.value = ''
  if (value === 'register') resetCaptcha()
  // nextTick：等 Vue 把 DOM 更新完
  await nextTick()
  // getElementById：按 id 找 DOM 元素；?.：找不到也不报错；focus：把光标放进去
  // preventScroll：聚焦时不自动滚动页面
  document.getElementById('login-account')?.focus({ preventScroll: true })
}

// 不合法时把焦点挪到第一个出错的输入框。
async function submit() {
  submitted.value = true
  successNotice.value = ''
  submitError.value = ''
  const valid = !accountInvalid.value && !passwordInvalid.value && !confirmationInvalid.value && !qqInvalid.value && !emailInvalid.value
  if (valid) {
    if (registering.value && !captchaPassed.value) {
      captchaError.value = '请先完成人机验证后再注册。'
      return
    }
    submitting.value = true
    try {
      if (registering.value) {
        await verifyCaptcha()
        await register({ account: account.value.trim(), password: password.value, ...(qq.value ? { qq: qq.value } : {}), ...(email.value ? { email: email.value } : {}) })
        mode.value = 'login'
        password.value = ''
        confirmation.value = ''
        await nextTick()
        successNotice.value = '注册成功，请使用新账号登录。'
      } else {
        const loginStatus = await login({ account: account.value.trim(), password: password.value })
        isAdmin('userRole',loginStatus.user.role)
        visible.value = false
      }
    } catch (error) {
      if (registering.value) resetCaptcha()
      submitError.value = error instanceof Error ? error.message : '网络错误，认证请求失败，请稍后重试。'
    } finally {
      submitting.value = false
    }
  }
  if (!valid) nextTick(() => document.getElementById(accountInvalid.value ? 'login-account' : passwordInvalid.value ? 'login-password' : confirmationInvalid.value ? 'register-confirmation' : qqInvalid.value ? 'register-qq' : 'register-email')?.focus())
}

watch([account, password, confirmation, qq, email], () => { successNotice.value = '' })
watch([visible, registering], async () => {
  if (visible.value && registering.value) {
    await nextTick()
    await initCaptcha()
  }
})
// 弹窗每次打开都重置回"登录"初始状态
watch(visible, () => {
  mode.value = 'login'
  password.value = ''
  confirmation.value = ''
  qq.value = ''
  email.value = ''
  submitted.value = false
  successNotice.value = ''
  submitError.value = ''
  submitting.value = false
  resetCaptcha()
})

onBeforeUnmount(() => { captchaInstance?.reset?.(); captchaInstance = null })
</script>

<template>
  <Dialog v-model:visible="visible" modal :header="registering ? '注册孤独市集' : '登录孤独市集'" :draggable="false"
    :style="{ width: '27rem', maxWidth: 'calc(100vw - 2rem)' }"
    :pt="{ root: { class: 'market-login-dialog' } }">
    <!-- 欢迎语：{{ }} 里是 JS 表达式，registering 为 true 显示注册文案 -->
    <div class="login-intro">
      <h2>{{ registering ? '初次见面，朋友。' : '好久不见，朋友。' }}</h2>
      <p>{{ registering ? '来这里，发布商品并找到合适的买家。' : '登录市集，让闲置遇见新的主人。' }}</p>
    </div>
    <!-- 登录/注册切换滑块：role="group" 告诉读屏这是一组控件；
         :class 动态挂 is-register 类（CSS 里据此右移滑块） -->
    <div class="auth-switch" role="group" aria-label="选择登录或注册" :class="{ 'is-register': registering }">
      <!-- 灰色滑块背景块，纯装饰所以 aria-hidden -->
      <span class="auth-switch-indicator" aria-hidden="true"></span>
      <!-- aria-pressed：告诉读屏"这是个开关按钮，当前是否按下"；切换时调 switchMode -->
      <Button type="button" label="登录" unstyled :aria-pressed="!registering" @click="switchMode('login')" />
      <Button type="button" label="注册" unstyled :aria-pressed="registering" @click="switchMode('register')" />
    </div>

    <!-- novalidate：关掉浏览器默认的表单校验气泡（我们用自己的校验+提示）；
         @submit.prevent：拦截表单默认提交行为（不刷新页面），改调 submit()；
         .prevent 是事件修饰符 = event.preventDefault() -->
    <form class="login-form" novalidate @submit.prevent="submit">
      <div class="login-field">
        <!-- label 的 for 指向输入框的 id：点文字也能聚焦输入框（无障碍必备） -->
        <label for="login-account">账号</label>
        <!-- v-model：把输入框内容和 account 变量双向绑定；
             autocomplete="username"：浏览器密码管理器识别用途；
             autofocus：弹窗打开自动聚焦；fluid：占满整行；
             :invalid：PrimeVue 据此套红色错误态；
             :aria-invalid / :aria-describedby：无障碍——出错时把错误文案的 id 关联过来 -->
        <InputText id="login-account" v-model="account" maxlength="50" placeholder="请输入账号" autocomplete="username"
          autofocus fluid :invalid="accountInvalid" :aria-invalid="accountInvalid"
          :aria-describedby="accountInvalid ? 'login-account-error' : undefined" required />
        <!-- v-if：有错误才渲染错误行；role="alert"：读屏立即播报这条错误 -->
        <small v-if="accountInvalid" id="login-account-error" class="login-error" role="alert">{{ accountError }}</small>
        <small v-else class="field-hint">最多 50 个字符</small>
      </div>

      <div class="login-field">
        <label for="login-password">密码</label>
        <!-- Password 组件：注意绑定的是内部真实 input 的 id 要用 input-id 传；
             toggle-mask：显示"小眼睛"明文/密文切换；:feedback="false" 关掉强度提示；
             input-props：透传给内部 <input> 的原生属性（required、aria-* 等） -->
        <Password v-model="password" input-id="login-password" placeholder="请输入密码"
          :autocomplete="registering ? 'new-password' : 'current-password'" :feedback="false" toggle-mask fluid
          :invalid="passwordInvalid" :input-props="{
            required: true,
            'aria-invalid': passwordInvalid,
            'aria-describedby': passwordInvalid ? 'login-password-error' : undefined,
          }" />
        <small v-if="passwordInvalid" id="login-password-error" class="login-error" role="alert">{{ passwordError }}</small>
      </div>
      <!-- 确认密码区：登录模式下收起。grid-template-rows 0fr→1fr 动画实现高度过渡；
           :inert：登录模式下这块"不存在的"——不能聚焦不能交互；
           :aria-hidden：读屏也跳过 -->
      <div class="confirmation-reveal" :class="{ expanded: registering }" :inert="!registering" :aria-hidden="!registering">
        <div class="confirmation-inner">
          <div class="login-field">
            <label for="register-confirmation">确认密码</label>
            <Password v-model="confirmation" input-id="register-confirmation" placeholder="请再次输入密码" autocomplete="new-password" :feedback="false" toggle-mask fluid :invalid="confirmationInvalid" :input-props="{ required: registering, 'aria-invalid': confirmationInvalid, 'aria-describedby': confirmationInvalid ? 'confirmation-error' : undefined }" />
            <small v-if="confirmationInvalid" id="confirmation-error" class="login-error" role="alert">{{ confirmationError }}</small>
          </div>
          <div class="login-field">
            <label for="register-qq">QQ 号（选填）</label>
            <InputText id="register-qq" v-model="qq" maxlength="20" placeholder="最多 20 个字符" fluid :invalid="qqInvalid" :aria-invalid="qqInvalid" :aria-describedby="qqInvalid ? 'register-qq-error' : undefined" />
            <small v-if="qqInvalid" id="register-qq-error" class="login-error" role="alert">{{ qqError }}</small>
          </div>
          <div class="login-field">
            <label for="register-email">邮箱（选填）</label>
            <InputText id="register-email" v-model="email" maxlength="100" type="email" autocomplete="email" placeholder="最多 100 个字符" fluid :invalid="emailInvalid" :aria-invalid="emailInvalid" :aria-describedby="emailInvalid ? 'register-email-error' : undefined" />
            <small v-if="emailInvalid" id="register-email-error" class="login-error" role="alert">{{ emailError }}</small>
          </div>
          <div id="vaptcha-container" ref="captchaContainer" class="vaptcha-container" aria-label="人机验证">
            <Button type="button" :label="captchaPassed ? '验证已完成' : '点击完成人机验证'" severity="secondary" outlined :loading="captchaValidating" :disabled="captchaValidating || captchaPassed" @click="validateCaptcha" />
          </div>
          <small v-if="captchaError" class="login-error" role="alert">{{ captchaError }}</small>
        </div>
      </div>

      <!-- Message：PrimeVue 提示条；severity="info" 蓝色信息样式；:closable="false" 不带关闭钮 -->
      <Message v-if="successNotice" severity="success" :closable="false">
        {{ successNotice }}
      </Message>
      <Message v-if="submitError" severity="error" :closable="false">{{ submitError }}</Message>

      <p class="auth-service-note">登录后可发布商品、举报内容。</p>
      <!-- type="submit"：点击触发 form 的 submit 事件 → 走上面的 @submit.prevent -->
      <Button type="submit" :label="registering ? '注册' : '登录'" severity="contrast" fluid :loading="submitting" :disabled="submitting" />
      <!-- type="button"：普通按钮，不触发表单提交；text：透明背景的文字按钮 -->
      <Button type="button" label="先逛逛，稍后登录" severity="secondary" text fluid @click="visible = false" />
    </form>
  </Dialog>
</template>

<style scoped>
/* 弹窗内欢迎语区块 */
.login-intro {
  padding: 0.5rem 0 1.75rem;
  text-align: center;
}

/* 登录/注册切换开关：grid 两等分列；position:relative 作为滑块的定位参照 */
.auth-switch{display:grid;grid-template-columns:1fr 1fr;position:relative;padding:4px;margin-bottom:24px;border:1px solid var(--app-border);border-radius:10px;background:var(--app-hover)}
.auth-switch button{z-index:1;background:none;border:0;border-radius:7px;padding:10px;color:var(--app-muted);font:inherit;cursor:pointer;transition:color .2s} /* z-index:1 让文字浮在滑块上层 */
/* [aria-pressed=true]：属性选择器——按下状态的按钮文字变主色 */
.auth-switch button[aria-pressed=true]{color:var(--app-text);font-weight:600}
.auth-switch button:focus-visible{outline:2px solid var(--app-text);outline-offset:-2px} /* offset 为负：描边画在按钮内部 */
/* 灰色滑块：宽度固定为开关的一半，transform 动画左右移动 */
.auth-switch-indicator{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);border-radius:7px;background:var(--app-surface);box-shadow:0 1px 3px var(--app-shadow);transition:transform .26s cubic-bezier(.2,.7,.2,1)} /* cubic-bezier：自定义缓动曲线，回弹感 */
/* 注册态：滑块右移一个自身宽度 */
.is-register .auth-switch-indicator{transform:translateX(100%)}
/* 确认密码展开区：0fr→1fr 是 grid 行高动画技巧（0fr=收起，1fr=展开） */
.confirmation-reveal{display:grid;grid-template-rows:0fr;opacity:0;margin-top:-1rem;transition:grid-template-rows .26s ease,opacity .2s ease,margin-top .26s ease}
.confirmation-reveal.expanded{grid-template-rows:1fr;opacity:1;margin-top:0}
.confirmation-inner{display:flex;flex-direction:column;gap:1rem;overflow:hidden;min-height:0} /* 收起时把内容裁掉 */
.confirmation-inner>.login-field{padding:2px}
.field-hint,.auth-service-note{font-size:12px;color:var(--p-text-muted-color);margin:0;line-height:1.6}
@media(prefers-reduced-motion:reduce){.auth-switch-indicator,.confirmation-reveal,.auth-switch button{transition:none}}

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

.vaptcha-container {
  min-height: 44px;
  display: flex;
  justify-content: center;
}
</style>
