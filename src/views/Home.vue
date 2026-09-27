<template>
    <div class="fixed inset-0 flex border border-surface-200 dark:border-surface-700 overflow-hidden">

        <!--整个页面的布局-->
        <SidebarLayout class="h-full! relative!">

            <!--check device-->
            <SidebarBackdrop v-if="isMobile && (navOpen || open)" class="absolute!" />
            
            <Sidebar id="nav" side="left" :collapsible="isMobile ? 'offcanvas' : 'icon'" :overlay="isMobile"
                v-model:open="navOpen" width="14rem">
                <SidebarSpacer />


                <!--左侧导航栏-->
                <SidebarAside>
                    <SidebarPanel>

                        <!--美味的头菜单-->
                        <SidebarHeader>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton class="p-1!">
                                        <div
                                            class="flex size-6 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold leading-none">
                                            Hi</div>
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
                                            <SidebarMenuButton as="router-link" :to="{ name: 'home-main' }"
                                                :isActive="$route.name === 'home-main'">
                                                <Home />
                                                <span>首页</span>
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
                                                <span>地图</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarContent>

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
            <SidebarMain>
                <header class="flex h-12 items-center gap-2 border-b border-surface-200 dark:border-surface-700 px-4">
                    <SidebarTrigger target="nav" severity="secondary" :text="true" size="small">
                        <SidebarIcon />
                    </SidebarTrigger>
                    <span class="text-sm font-medium flex-1">孤独市集</span>
                    <!-- 主题按钮：aria-label 会告诉读屏用户点击后将切换到哪种模式。 -->
                    <Button class="theme-action" :label="isDark ? '亮色' : '暗色'" size="small" :aria-label="isDark ? '切换到亮色模式' : '切换到暗色模式'" @click="toggleTheme" />
                    <Button class="header-action" label="＋ 发帖" size="small" rounded @click="openPost()" />
                    <Button class="header-action" label="登录" size="small" rounded @click="loginVisible = true" />
                </header>
                <div class="flex-1 flex flex-col min-h-0">
                    <!-- 子路由需要单独包裹过渡；父级 Home 不会因自身未卸载而自动触发这里的动画。 -->
                    <RouterView v-slot="{ Component, route }">
                        <Transition name="transition-view" mode="out-in">
                            <component :is="Component" :key="route.fullPath" />
                        </Transition>
                    </RouterView>
                </div>
            </SidebarMain>
        </SidebarLayout>
        <LoginDialog v-model:visible="loginVisible" />
        <Dialog v-model:visible="postVisible" modal header="在市集，留一张新便签" :draggable="false"
            :style="{ width: '32rem', maxWidth: 'calc(100vw - 2rem)' }">
            <form class="post-form" @submit.prevent="previewPost">
                <p>分享一件闲置，或发起一次校园邀约。</p>
                <label for="post-kind">帖子类型</label>
                <select id="post-kind" v-model="post.kind"><option>闲置</option><option>邀约</option></select>
                <label for="post-title">标题</label>
                <InputText id="post-title" v-model="post.title" maxlength="60" placeholder="给你的帖子起个名字" required fluid />
                <label v-if="post.kind === '闲置'" for="post-price">价格（元）</label>
                <input v-if="post.kind === '闲置'" id="post-price" v-model="post.price" type="number" min="0" max="999999" step="0.01" placeholder="0 表示免费赠送" required>
                <label for="post-place">见面地点</label>
                <InputText id="post-place" v-model="post.place" maxlength="80" placeholder="例如：图书馆门口" required fluid />
                <label for="post-content">详细描述</label>
                <textarea id="post-content" v-model="post.content" maxlength="2000" rows="4" placeholder="说说物品状况，或邀约的时间与安排……" required></textarea>
                <p role="status">{{ postNotice }}</p>
                <Button type="submit" label="预览帖子" severity="contrast" rounded />
                <article v-if="postPreview" class="post-preview"><small>{{ postPreview.kind }} · 本地预览，未发布</small><h3>{{ postPreview.title }}</h3><b v-if="postPreview.kind === '闲置'">¥{{ postPreview.price }}</b><p>{{ postPreview.content }}</p><small>{{ postPreview.place }}</small></article>
            </form>
        </Dialog>
    </div>
</template>

<script setup>
import { inject, onBeforeUnmount, onMounted, provide, ref } from 'vue';
import { RouterView } from 'vue-router';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import LoginDialog from '@/components/LoginDialog.vue';
import Sidebar from 'primevue/sidebar';
import SidebarAside from 'primevue/sidebaraside';
import SidebarBackdrop from 'primevue/sidebarbackdrop';
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


const isMobile = ref(false);
const loginVisible = ref(false);
const navOpen = ref(true);
const open = ref(false);
const postVisible = ref(false);
const post = ref({ kind: '闲置', title: '', price: '', place: '', content: '' });
const postPreview = ref(null);
const postNotice = ref('发布接口尚未接入，内容仅保留在当前页面，刷新后清空。');
const isDark = inject('isDark', ref(false));
const toggleTheme = inject('toggleTheme', () => {});
function openPost(kind) {
    if (kind) post.value.kind = kind;
    postPreview.value = null;
    postVisible.value = true;
}
function previewPost() {
    if (![post.value.title, post.value.place, post.value.content].every(value => value.trim())) {
        postNotice.value = '请填写标题、见面地点和详细描述，不能只输入空格。';
        return;
    }
    postPreview.value = { ...post.value };
    postNotice.value = '已生成本地预览；发布接口尚未接入，帖子未发布。';
}
provide('openPost', openPost);
let mql = null;
let onMqlChange = null;

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
.transition-view-enter-active, .transition-view-leave-active { transition: opacity .2s ease, transform .2s ease; }
.transition-view-enter-from { opacity: 0; transform: translateY(8px); }
.transition-view-leave-to { opacity: 0; transform: translateY(-8px); }
.transition-view-enter-active, .transition-view-leave-active { flex: 1; min-height: 0; }
.app-shell :deep([data-pc-name="sidebar"]), .app-shell :deep(.p-sidebar), .app-shell :deep([data-pc-section="root"]) { background: var(--app-surface, #fcfbf8) !important; color: var(--app-text, #24231f); }
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
