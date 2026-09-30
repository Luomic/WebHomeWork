<template>
    <!-- 根容器：fixed inset-0 铺满视口（绕开 body 的边距）；flex 纵横布局；
         border-surface-200 普通边框 / dark:border-surface-700 暗色下的边框（dark: 变体）；
         overflow-hidden 裁掉溢出 -->
    <div class="fixed inset-0 flex border border-surface-200 dark:border-surface-700 overflow-hidden">

        <!--整个页面的布局-->
        <!-- h-full!: Tailwind 的 ! 后缀 = !important，压过 PrimeVue 自带高度 -->
        <SidebarLayout class="h-full! relative! min-w-0">

            <!--check device-->
            <!-- 移动端使用窄抽屉，不额外渲染全屏遮罩。 -->
            <!-- 侧栏容器：id="nav" 供 SidebarTrigger 按名字控制它；
                 side="left" 靠左；collapsible：桌面收成图标列 / 手机整个滑出；
                 v-model:open：开合状态双向绑定 -->
            <Sidebar id="nav" side="left" :collapsible="isMobile ? 'offcanvas' : 'icon'" :overlay="isMobile"
                v-model:open="navOpen" width="14rem">
                <SidebarSpacer />


                <!--左侧导航栏-->
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
                                        <span class="font-semibold text-sm">新朋友</span>
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
                                                :isActive="$route.name === 'home-main'">
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
                            </SidebarGroup>
                        </SidebarContent>

                        <!-- 底部：账户登录入口 -->
                        <SidebarFooter>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton @click="loginVisible = true" aria-label="账户登录">
                                        <User />
                                        <span>账户</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarFooter>
                    </SidebarPanel>
                </SidebarAside>
            </Sidebar>

            <!-- 主区域 -->
            <SidebarMain class="min-w-0">
                <!-- 顶栏：h-12 高度、items-center 垂直居中、gap-4 子项间距、px-4 左右内边距 -->
                <header class="home-header flex h-12 shrink-0 items-center gap-4 border-b border-surface-200 dark:border-surface-700 px-4">
                    <!-- 折叠侧栏的按钮：target="nav" 对应上面 Sidebar 的 id -->
                    <SidebarTrigger target="nav" severity="secondary" :text="true" size="small" aria-label="打开或收起导航栏">
                        <SidebarIcon />
                    </SidebarTrigger>
                    <!-- flex-1：吃掉剩余宽度，把右侧按钮推到最右 -->
                    <span class="home-title text-sm font-medium flex-1">孤独市集</span>
                    <!-- 主题按钮：aria-label 会告诉读屏用户点击后将切换到哪种模式。
                         component :is：动态图标——暗色显示太阳、亮色显示月亮 -->
                    <Button class="theme-action" size="small" :aria-label="isDark ? '切换到亮色模式' : '切换到暗色模式'" @click="toggleTheme"><component :is="isDark ? Sun : Moon"/></Button>
                    <Button class="header-action" size="small" @click="openPost()"><Plus aria-hidden="true" />发布</Button>
                    <Button severity="secondary" text size="small" @click="loginVisible = true"><Users aria-hidden="true" />登录</Button>
                </header>
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
        <LoginDialog v-model:visible="loginVisible" />
        <PostComposer v-model:visible="postVisible" />
    </div>
</template>

<script setup>
/*
 * /home 的外壳：左侧 PrimeVue Sidebar 导航 + 顶部工具栏 + 子路由出口。
 *
 * ⚠ SidebarLayout / Sidebar / SidebarMenuButton 等是 PrimeVue 5 的 headless
 * 复合组件 —— "无样式、零内置外观"，全靠模板上的 Tailwind 类上色；
 * 且每个都要像下面这样单独 import（main.ts 没做全局注册），漏一个就渲染成空标签。
 *
 * isMobile 跟随 (max-width: 1023px) 媒体查询实时变化，决定侧栏是"收成图标"
 * 还是"浮层抽屉，不占主内容宽度"。
 */
import { inject, onBeforeUnmount, onMounted, provide, ref } from 'vue';
import { RouterView } from 'vue-router';
import Button from 'primevue/button';
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

// 页面级的响应式状态：手机判定 / 三个弹窗开关 / 侧栏开合
const isMobile = ref(window.matchMedia('(max-width: 1023px)').matches);
const loginVisible = ref(false);   // 登录弹窗
const navOpen = ref(!isMobile.value);         // 侧栏展开？
const postVisible = ref(false);    // 发布弹窗
// 从 App.vue 拿全局主题状态和切换函数（兜底给空值防没提供时崩）
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
