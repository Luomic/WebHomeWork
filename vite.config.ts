import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.AMAP_PROXY_TARGET?.trim()
  const securityCode = env.AMAP_SECURITY_CODE?.trim()
  const apiTarget = env.VITE_API_BASE_URL?.trim()
  function directProxy(target: string) {
    return {
      target,
      changeOrigin: true,
      rewrite(path: string) {
        const upstream = new URL(path.slice('/_AMapService'.length), target)
        upstream.searchParams.set('jscode', securityCode!)
        return upstream.pathname + upstream.search
      },
    }
  }
  const amapProxy = securityCode ? {
    '/_AMapService/v4/map/styles': directProxy('https://webapi.amap.com'),
    '/_AMapService/': directProxy('https://restapi.amap.com'),
  } : proxyTarget ? {
    '/_AMapService/': {
      target: proxyTarget,
      changeOrigin: true,
    },
  } : undefined
  const apiProxy = apiTarget ? {
    '/api': { target: apiTarget, changeOrigin: true },
    '/uploads': { target: apiTarget, changeOrigin: true },
  } : undefined
  return {
    plugins: [
      vue(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: { ...(amapProxy || {}), ...(apiProxy || {}) },
    },
    preview: {
      proxy: { ...(amapProxy || {}), ...(apiProxy || {}) },
    },
  }
})
