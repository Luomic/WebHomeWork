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
                    <Button label="登录" size="small" severity="contrast" rounded @click="loginVisible = true" />
                </header>
                <div class="flex-1 flex flex-col min-h-0">
                    <RouterView />
                </div>
            </SidebarMain>
        </SidebarLayout>
        <LoginDialog v-model:visible="loginVisible" />
    </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterView } from 'vue-router';
import Button from 'primevue/button';
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
