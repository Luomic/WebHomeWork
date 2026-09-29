// 从 Node 内置的 url 模块导入工具：fileURLToPath 把 file:// 开头的 URL 转成普通文件路径，
// URL 是构造 URL 对象的类——两行配合下面用来算出 src 目录的绝对路径
import { fileURLToPath, URL } from 'node:url'

// defineConfig：给 Vite 配置提供类型提示；loadEnv：读取 .env 文件里的环境变量
import { defineConfig, loadEnv } from 'vite'
// Vite 的 Vue 官方插件：让 Vite 能看懂 .vue 单文件组件（模板/脚本/样式三段式）
import vue from '@vitejs/plugin-vue'
// 开发者工具插件：在页面里注入 Vue DevTools 面板（当前被注释掉、未启用）
import vueDevTools from 'vite-plugin-vue-devtools'
// Tailwind CSS v4 的 Vite 插件：处理 CSS 里的 @import "tailwindcss" 并按用到的类生成样式
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
//
// ── 高德代理的三档配置（优先级从高到低）─────────────────────────────
//   1. AMAP_SECURITY_CODE：填了它，本地 /_AMapService 由 Vite 直连高德官方接口，
//      转发时自动附加安全密钥（jscode）。密钥只存在 Node 端，不进浏览器和 dist。
//   2. AMAP_PROXY_TARGET：不填密钥时，把请求转发到这个"已经配好高德代理"的站点。
//      ⚠ 该站点必须真的配置了 /_AMapService 转发规则并返回高德 JSON——
//      如果它的 Nginx 只是兜底返回首页 HTML，前端的地点搜索/逆编码就会全部失败。
//   3. 两个都没填：不配置任何代理。此时 amap.ts 里的 serviceHost 指向的
//      /_AMapService 没人处理，地图能出但搜索、定位、地址解析都会报错。
// 改动 .env.local 后需要重启 npm run dev / preview 才会生效。
// 导出的是一个箭头函数而不是对象：Vite 会把 mode（development/production）传进来，
// 这样可以按运行模式读不同的环境变量
export default defineConfig(({ mode }) => {
  // loadEnv 第三个参数 'AMAP_' 表示只读取 AMAP_ 开头的变量（不带 VITE_ 前缀，
  // 所以这些值只在 Node 端可用，不会被打进浏览器代码，密钥因此不外泄）
  const env = loadEnv(mode, process.cwd(), 'AMAP_')
  // ?. 可选链：环境变量不存在时不会报错，而是返回 undefined；trim() 去掉首尾空格
  const proxyTarget = env.AMAP_PROXY_TARGET?.trim()
  const securityCode = env.AMAP_SECURITY_CODE?.trim()
  // 生成"直连高德"代理规则的辅助函数
  function directProxy(target: string) {
    return {
      // target：请求被转发到的上游服务器（高德官方）
      target,
      // changeOrigin：转发时把请求头里的 Host 改成目标服务器的域名，否则高德会拒绝
      changeOrigin: true,
      // 把 /_AMapService 前缀剥掉，换成高德真实路径，并补上安全密钥 jscode。
      // 例：/_AMapService/v3/geocode/regeo → https://restapi.amap.com/v3/geocode/regeo?jscode=…
      rewrite(path: string) {
        // slice 去掉 '/_AMapService' 前缀后拼到 target 上，得到高德的真实 URL
        const upstream = new URL(path.slice('/_AMapService'.length), target)
        // 把安全密钥追加为 jscode 查询参数（高德 2021 年后的安全校验要求）
        upstream.searchParams.set('jscode', securityCode!)
        // 只返回路径+查询串（return 的写法要求返回相对路径）
        return upstream.pathname + upstream.search
      },
    }
  }
  // 按三档优先级决定代理表：有密钥→直连高德；否则有转发站→转发；否则不配代理(undefined)
  const amapProxy = securityCode ? {
    // 地图样式接口走 webapi.amap.com，其余走 restapi.amap.com
    '/_AMapService/v4/map/styles': directProxy('https://webapi.amap.com'),
    '/_AMapService/': directProxy('https://restapi.amap.com'),
  } : proxyTarget ? {
    '/_AMapService/': {
      // 所有以 /_AMapService/ 开头的请求原样转发到配置的站点
      target: proxyTarget,
      changeOrigin: true,
    },
  } : undefined
  return {
    // 插件按顺序执行；注意 tailwindcss() 要放在 vue() 后面
    plugins: [
      vue(),
      tailwindcss(),
      //vueDevTools(),
    ],
    resolve: {
      alias: {
        // 路径别名：把 '@' 指到项目的 src 目录，代码里 import '@/xxx' 就是 src/xxx
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // server：npm run dev（开发服务器）的配置；proxy：把匹配路径的请求转发出去（解决浏览器跨域）
    server: {
      proxy: amapProxy,
    },
    // preview：npm run run build 之后 npm run preview（预览构建产物）时应用同样的代理
    preview: {
      proxy: amapProxy,
    },
  }
})
