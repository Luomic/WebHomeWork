<template>
    <div class="fixed inset-0 flex border border-surface-200 dark:border-surface-700 overflow-hidden">
        <SidebarLayout class="h-full! relative! min-w-0">
            <Sidebar id="nav" side="left" :collapsible="isMobile ? 'offcanvas' : 'icon'" :overlay="isMobile"
                v-model:open="navOpen" width="14rem">
                <SidebarSpacer />
                <SidebarAside class="home-nav-aside">
                    <SidebarPanel>
                        <!--美味的头菜单-->
                        <SidebarHeader>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton class="p-1!">
                                        <div
                                            class="account-avatar">
                                            <!-- aria-hidden：装饰图标，读屏跳过 -->
                                            <User aria-hidden="true" /></div>
                                        <span class="font-semibold text-sm">{{ isLoggedIn ? (authState.user?.account || '老朋友') : '新朋友' }}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarHeader>

                        <SidebarContent>
                            <SidebarGroup>
                                <SidebarGroupLabel>导航</SidebarGroupLabel>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        <SidebarMenuItem>
                                            <!-- as="router-link"：把按钮渲染成路由链接（点击跳转不刷新）；
                                                 :to：目标路由（按 name 找）；:isActive：当前页高亮 -->
                                            <SidebarMenuButton as="router-link" :to="{ name: 'home-main' }"
                                                :isActive="$route.name === 'home-main' && !$route.query.favorites">
                                                <Home />
                                                <span>市集</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton as="router-link" :to="{ name: 'home-message' }"
                                                :isActive="$route.name === 'home-message'">
                                                <Inbox />
                                                <span>消息</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton as="router-link" :to="{ name: 'home-agent' }"
                                                :isActive="$route.name === 'home-agent'">
                                                <Sparkles />
                                                <span>JhFair</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>

                            <SidebarGroup>
                                <SidebarGroupLabel>探索</SidebarGroupLabel>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton as="router-link" :to="{ name: 'home-map' }"
                                                :isActive="$route.name === 'home-map'">
                                                <MapMarker />
                                                <span>附近商品</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </SidebarMenu>
                                </SidebarGroupContent>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton as="router-link" :to="{ name: 'home-main', query: { favorites: '1' } }" :isActive="$route.query.favorites === '1'">
                                                <Star />
                                                <span>我的收藏</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>

                            <!-- 仅有效的管理员登录态显示管理入口。 -->
                            <SidebarGroup v-if="showAdminPanel">
                                <SidebarGroupLabel>管理员面板</SidebarGroupLabel>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton as="router-link" :to="{ name: 'home-admin', hash: '#pending-goods' }"
                                                :isActive="$route.name === 'home-admin' && (!$route.hash || $route.hash === '#pending-goods')">
                                                <Hourglass />
                                                <span>待审核商品</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton as="router-link" :to="{ name: 'home-admin', hash: '#pending-reports' }"
                                                :isActive="$route.name === 'home-admin' && $route.hash === '#pending-reports'">
                                                <QuestionCircle />
                                                <span>待审核举报</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarContent>

                        <!-- 底部：账户登录入口 -->
                        <SidebarFooter>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton @click="isLoggedIn ? logout() : loginVisible = true" :aria-label="isLoggedIn ? '登出' : '账户登录'">
                                        <User />
                                        <span>{{ isLoggedIn ? '登出' : '账户' }}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarFooter>
                    </SidebarPanel>
                </SidebarAside>
            </Sidebar>

            <!-- 主区域 -->
            <SidebarMain class="min-w-0">
                <header class="home-header flex h-12 shrink-0 items-center gap-4 border-b border-surface-200 dark:border-surface-700 px-4">
                    <!-- 折叠侧栏的按钮：target="nav" 对应上面 Sidebar 的 id -->
                    <SidebarTrigger target="nav" severity="secondary" :text="true" size="small" aria-label="打开或收起导航栏">
                        <SidebarIcon />
                    </SidebarTrigger>
                    <span class="home-title text-sm font-medium flex-1">孤独市集</span>
                    <Button class="theme-action" size="small" :aria-label="isDark ? '切换到亮色模式' : '切换到暗色模式'" @click="toggleTheme"><component :is="isDark ? Sun : Moon"/></Button>
                    <Button class="header-action" size="small" @click="openPost()"><Plus aria-hidden="true" />发布</Button>
                    <Button v-if="isLoggedIn" severity="secondary" text size="small" :loading="signing" :disabled="signing" @click="dailySignIn"><CalendarIcon aria-hidden="true" />签到</Button>
                    <Button v-if="isLoggedIn" severity="secondary" text size="small" @click="logout">登出</Button>
                    <Button v-else severity="secondary" text size="small" @click="loginVisible = true"><Users aria-hidden="true" />登录</Button>
                </header>
                <Message v-if="accountNotice" :severity="accountError ? 'error' : 'success'" :closable="false">{{ accountNotice }}</Message>
                <div class="route-content flex-1 flex flex-col min-h-0">
                    <RouterView v-slot="{ Component, route }">
                        <Transition name="transition-view">
                            <div v-if="Component" :key="route.name" class="route-panel flex-1 flex flex-col min-h-0">
                                <component :is="Component" />
                            </div>
                        </Transition>
                    </RouterView>
                </div>
            </SidebarMain>
        </SidebarLayout>
        <!-- 两个全局弹窗：开关由 v-model:visible 双向绑定 -->
        <LoginDialog v-model:visible="loginVisible"/>
        <PostComposer v-model:visible="postVisible" />
    </div>
</template>

<script setup>
import { computed, watch, inject, onBeforeUnmount, onMounted, provide, ref } from 'vue';
import { RouterView } from 'vue-router';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { authState, isLoggedIn, clearAuth, verifySession, signIn, setAuth } from '@/api/client';
import PostComposer from '@/components/PostComposer.vue';
import LoginDialog from '@/components/LoginDialog.vue';
import Sidebar from 'primevue/sidebar';
import SidebarAside from 'primevue/sidebaraside';
import SidebarContent from 'primevue/sidebarcontent';
import SidebarFooter from 'primevue/sidebarfooter';
import SidebarGroup from 'primevue/sidebargroup';
import SidebarGroupContent from 'primevue/sidebargroupcontent';
import SidebarGroupLabel from 'primevue/sidebargrouplabel';
import SidebarHeader from 'primevue/sidebarheader';
import SidebarLayout from 'primevue/sidebarlayout';
import SidebarMain from 'primevue/sidebarmain';
import SidebarMenu from 'primevue/sidebarmenu';
import SidebarMenuBadge from 'primevue/sidebarmenubadge';
import SidebarMenuButton from 'primevue/sidebarmenubutton';
import SidebarMenuItem from 'primevue/sidebarmenuitem';
import SidebarMenuSub from 'primevue/sidebarmenusub';
import SidebarMenuSubButton from 'primevue/sidebarmenusubbutton';
import SidebarMenuSubItem from 'primevue/sidebarmenusubitem';
import SidebarPanel from 'primevue/sidebarpanel';
import SidebarSpacer from 'primevue/sidebarspacer';
import SidebarTrigger from 'primevue/sidebartrigger';
import Bell from '@primeicons/vue/bell';
import CalendarIcon from '@primeicons/vue/calendar';
import ChartBar from '@primeicons/vue/chart-bar';
import ChevronDown from '@primeicons/vue/chevron-down';
import Cog from '@primeicons/vue/cog';
import Comment from '@primeicons/vue/comment';
import Home from '@primeicons/vue/home';
import Inbox from '@primeicons/vue/inbox';
import Search from '@primeicons/vue/search';
import SidebarIcon from '@primeicons/vue/sidebar';
import Users from '@primeicons/vue/users';
import Sparkles from '@primeicons/vue/sparkles';
import MapMarker from '@primeicons/vue/map-marker';
import User from '@primeicons/vue/user';
import Plus from '@primeicons/vue/plus';
import Sun from '@primeicons/vue/sun';
import Moon from '@primeicons/vue/moon';
import Hourglass from '@primeicons/vue/hourglass';
import QuestionCircle from '@primeicons/vue/question-circle';
import Star from '@primeicons/vue/star';
import StarFill from '@primeicons/vue/star-fill';

const isMobile = ref(window.matchMedia('(max-width: 1023px)').matches);
const loginVisible = ref(false);   // 登录弹窗
const navOpen = ref(!isMobile.value);         // 侧栏展开？
const postVisible = ref(false);    // 发布弹窗
const showAdminPanel = computed(() => isLoggedIn.value && authState.user?.role === 'admin');
const signing = ref(false), accountNotice = ref(''), accountError = ref(false);
// 新提示重新计时；清空提示或卸载页面时取消旧计时器。
watch(accountNotice, (message, _, onCleanup) => {
    if (!message) return;
    const timer = window.setTimeout(() => { accountNotice.value = ''; }, 5000);
    onCleanup(() => window.clearTimeout(timer));
}, { flush: 'sync' });
function logout() { clearAuth(); postVisible.value = false; }
watch(() => authState.token, () => { accountNotice.value = ''; });
async function dailySignIn() {
    if (signing.value) return;
    const token = authState.token;
    signing.value = true; accountNotice.value = ''; accountError.value = false;
    try {
        const result = await signIn();
        if (authState.token !== token) return;
        if (authState.user) setAuth({ token, user: { ...authState.user, level: result.level } });
        accountNotice.value = '签到成功，获得 ' + result.exp_gain + ' 经验，连续 ' + result.streak + ' 天，当前等级 ' + result.level + '。';
    } catch (error) { if (authState.token === token) { accountError.value = true; accountNotice.value = error.message || '签到失败，请重试。'; } }
    finally { signing.value = false; }
}
async function checkSession() {
    if (!authState.token) return;
    try { await verifySession(); } catch (error) { accountError.value = true; accountNotice.value = error.message; }
}
let sessionTimer;
const isDark = inject('isDark', ref(false));
const toggleTheme = inject('toggleTheme', () => {});
function openPost() {
    postVisible.value = true;
}
// 发布入口下放给子路由（如市集页），子页面不用自己再存一份弹窗状态。
provide('openPost', openPost);
let mql = null;
let onMqlChange = null;

// 监听"是否手机"的媒体查询：跨过 1023px 断点时同步 isMobile 并展开/收起侧栏。
onMounted(() => {
    if (typeof window === 'undefined') return;

    void checkSession();
    window.addEventListener('focus', checkSession);
    sessionTimer = window.setInterval(checkSession, 60000);
    mql = window.matchMedia('(max-width: 1023px)');
    isMobile.value = mql.matches;
    navOpen.value = !isMobile.value;
    onMqlChange = (event) => {
        isMobile.value = event.matches;
        navOpen.value = !event.matches;
    };
    mql.addEventListener('change', onMqlChange);
});

onBeforeUnmount(() => {
    clearInterval(sessionTimer);
    window.removeEventListener('focus', checkSession);
    if (mql && onMqlChange) {
        mql.removeEventListener('change', onMqlChange);
    }
});

</script>

<style scoped>
.home-title { white-space: nowrap; min-width: max-content; }
.home-header > :deep(button) { flex-shrink: 0; white-space: nowrap; }
@media (max-width: 1023px) {
    .home-nav-aside { top: 3rem; height: calc(100% - 3rem); }
}
@media (max-width: 480px) {
    .home-title { display: none; }
    .theme-action { margin-left: auto; }
}
@media (max-width: 600px) {
    .home-header { gap: 6px; padding-inline: 10px; }
    .home-header > :deep(button) { min-width: 32px; min-height: 36px; padding: 6px 8px; gap: 4px; }
}
.route-content { position: relative; overflow: hidden; isolation: isolate; }
.route-panel { background: var(--app-bg); }
.transition-view-leave-active { position: absolute; inset: 0; pointer-events: none; }
.transition-view-enter-active { position: relative; z-index: 1; }
.transition-view-enter-active, .transition-view-leave-active {
    transition: opacity .42s cubic-bezier(.22, 1, .36, 1), transform .48s cubic-bezier(.22, 1, .36, 1), clip-path .48s cubic-bezier(.22, 1, .36, 1), filter .35s ease;
    flex: 1; min-height: 0; will-change: opacity, transform, clip-path;
    clip-path: inset(0 round 0px);
}
.transition-view-enter-from { opacity: 0; transform: translate3d(24px, 8px, 0) rotate(.35deg); clip-path: inset(0 0 0 4% round 16px); filter: blur(2px); }
.transition-view-leave-to { opacity: 0; transform: translate3d(-18px, -4px, 0) rotate(-.25deg); clip-path: inset(0 4% 0 0 round 16px); filter: blur(1px); }
.app-shell :deep([data-pc-name="sidebar"]), .app-shell :deep(.p-sidebar) { background: var(--app-surface, #fcfbf8) !important; color: var(--app-text, #24231f); }
.app-shell :deep([data-pc-name="sidebar"] *) { border-color: var(--app-border, #dedbd3); }
.post-form { display: flex; flex-direction: column; gap: 10px; font-family: 'Round', system-ui, sans-serif; }
.post-form > p { color: color-mix(in srgb, var(--app-text) 60%, transparent); font-size: 12px; line-height: 1.8; margin: 0 0 8px; }
.post-form label { font-size: 12px; margin-top: 5px; }
.post-form select, .post-form textarea, .post-form input[type=number] { border: 1px solid var(--app-border); border-radius: 10px; padding: 10px 12px; background: var(--app-bg); color: var(--app-text); font: inherit; font-size: 13px; }
.post-form textarea { resize: vertical; }
.post-form :is(input, select, textarea):focus { outline: none; border-color: #999; box-shadow: none; }
.post-preview { border-top: 1px solid #ddd; padding: 16px 0; overflow-wrap: anywhere; }
.post-preview small { color: color-mix(in srgb, var(--app-text) 60%, transparent); }.post-preview p { white-space: pre-wrap; font-size: 13px; }
</style>

<style scoped>
.account-avatar{display:flex;width:28px;height:28px;align-items:center;justify-content:center;border:1px solid var(--app-border);border-radius:8px;background:var(--app-hover);color:var(--app-text)}
.account-avatar svg{width:16px;height:16px}
@media(prefers-reduced-motion:reduce){.transition-view-enter-active,.transition-view-leave-active{transition:none}.transition-view-enter-from,.transition-view-leave-to{transform:none;clip-path:none;filter:none}}
</style>
