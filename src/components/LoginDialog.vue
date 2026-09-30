<script setup>
/*
 * 登录/注册弹窗（接口未接入，仅本地表单体验）。
 *
 * 校验思路：accountError 等是"这条输入有没有问题"的计算属性（随输入实时变化），
 * 而 xxxInvalid 在它前面多乘一个 submitted —— 没点过提交就不标红，
 * 用户不会边打字边被报错骚扰；点提交后才开始显示。真正的提交在服务接入前
 * 只弹"未接入"提示，不模拟登录成功。
 */
// 注意：这个文件没有 lang="ts"，是纯 JS 写法（保持原有风格不迁移）
import { computed, nextTick, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'

// defineModel：声明一个可由父组件双向绑定的 prop（父用 v-model:visible="开关"）。
// 子组件里直接改 visible，父组件那边的变量自动跟着变——这就是"双向"
const visible = defineModel('visible', { type: Boolean, default: false })
// ref('')：字符串响应式数据，存输入框内容
const account = ref('')
const password = ref('')
const confirmation = ref('')
// 当前模式：登录 or 注册
const mode = ref('login')
// computed：计算属性——mode 变了它自动重算；.value 读取缓存值
const registering = computed(() => mode.value === 'register')
const submitted = ref(false)   // 用户是否点过提交（提交前不显示错误）
const showNotice = ref(false)  // 是否显示"服务未接入"提示条

// 三条校验规则：computed 里是"有错就返回错误文案、没错返回空字符串"。
// 三元运算符链：条件 ? A : 条件 ? B : C，按顺序判断。
// /正则/：/^...$/ 表示从头到尾完全匹配；{3,24} 表示 3 到 24 个字符；
// [a-zA-Z0-9_] 表示只允许字母数字下划线；.test() 返回是否匹配
const accountError = computed(() => !account.value.trim() ? '请输入账号' : registering.value && !/^[a-zA-Z0-9_]{3,24}$/.test(account.value.trim()) ? '账号使用 3–24 位字母、数字或下划线' : '')
const passwordError = computed(() => !password.value ? '请输入密码' : registering.value && (password.value.length < 8 || password.value.length > 64) ? '密码长度为 8–64 位' : '')
const confirmationError = computed(() => registering.value && confirmation.value !== password.value ? '两次输入的密码不一致' : registering.value && !confirmation.value ? '请再次输入密码' : '')

// 真正用来标红的值 = 点过提交 且 有错误文案。
// !! 把字符串转成布尔值（空串→false，非空→true）
const accountInvalid = computed(() => submitted.value && !!accountError.value)
const passwordInvalid = computed(() => submitted.value && !!passwordError.value)
const confirmationInvalid = computed(() => submitted.value && !!confirmationError.value)

// async/await：异步函数，await 表示"等这步做完再往下走"
async function switchMode(value) {
  // 点的就是当前模式，不用切
  if (mode.value === value) return
  mode.value = value
  // 切换模式时清空密码相关状态，避免注册的校验残留到登录
  password.value = ''; confirmation.value = ''; submitted.value = false; showNotice.value = false
  // nextTick：等 Vue 把 DOM 更新完（确认密码框已经显示出来）再聚焦
  await nextTick()
  // getElementById：按 id 找 DOM 元素；?.：找不到也不报错；focus：把光标放进去
  // preventScroll：聚焦时不自动滚动页面
  document.getElementById('login-account')?.focus({ preventScroll: true })
}

// 提交：标红所有不合法的字段；全部合法时只显示"服务未接入"提示。
// 不合法时把焦点挪到第一个出错的输入框，键盘用户不用再找。
function submit() {
  submitted.value = true
  // 三个 invalid 全为 false（没错误）才显示提示——注意这是"模拟不了成功"的诚实提示
  showNotice.value = !accountInvalid.value && !passwordInvalid.value && !confirmationInvalid.value
  if (!showNotice.value) nextTick(() => document.getElementById(accountInvalid.value ? 'login-account' : passwordInvalid.value ? 'login-password' : 'register-confirmation')?.focus())
}

// watch 也支持监听多个数据源（数组）：任何一个输入框有改动就撤掉提示条
watch([account, password, confirmation], () => { showNotice.value = false })
// 弹窗每次打开都重置回"登录"初始状态，注册留下的输入不残留
watch(visible, () => {
  mode.value = 'login'
  password.value = ''
  confirmation.value = ''
  submitted.value = false
  showNotice.value = false
})
</script>

<template>
  <!-- v-model:visible="visible"：双向绑定弹窗开关（点 X/遮罩关闭时子组件改 visible，父同步）；
       modal：打开时背景加半透明遮罩、锁滚动；
       :header：弹窗标题，按注册/登录动态切换；
       :draggable="false"：禁止拖拽弹窗；
       :style：宽度 27rem，但最宽不超过"视口宽减 2rem"，手机上留出边距 -->
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
        <InputText id="login-account" v-model="account" placeholder="请输入账号" autocomplete="username"
          autofocus fluid :invalid="accountInvalid" :aria-invalid="accountInvalid"
          :aria-describedby="accountInvalid ? 'login-account-error' : undefined" required />
        <!-- v-if：有错误才渲染错误行；role="alert"：读屏立即播报这条错误 -->
        <small v-if="accountInvalid" id="login-account-error" class="login-error" role="alert">{{ accountError }}</small>
        <!-- v-else：没错误时显示格式提示；hint-hidden 在登录模式下视觉隐藏但保留占位 -->
        <small v-else class="field-hint" :class="{ 'hint-hidden': !registering }">3–24 位字母、数字或下划线</small>
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
        <small v-else class="field-hint" :class="{ 'hint-hidden': !registering }">8–64 位，建议组合字母、数字和符号</small>
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
        </div>
      </div>

      <!-- Message：PrimeVue 提示条；severity="info" 蓝色信息样式；:closable="false" 不带关闭钮 -->
      <Message v-if="showNotice" severity="info" :closable="false">
        {{ registering ? '表单校验通过，但注册服务尚未接入，账号还未创建。' : '登录服务尚未接入，本次未登录。你可以先逛逛市集。' }}
      </Message>

      <p class="auth-service-note">目前可体验表单，账号服务尚未开放。</p>
      <!-- type="submit"：点击触发 form 的 submit 事件 → 走上面的 @submit.prevent -->
      <Button type="submit" :label="registering ? '注册' : '登录'" severity="contrast" fluid />
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
.confirmation-inner{overflow:hidden;min-height:0} /* 收起时把内容裁掉 */
.confirmation-inner>.login-field{padding:2px}
.field-hint,.auth-service-note{font-size:12px;color:var(--p-text-muted-color);margin:0;line-height:1.6}
.hint-hidden{visibility:hidden} /* 隐藏但保留占位，避免布局跳动 */
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
</style>
