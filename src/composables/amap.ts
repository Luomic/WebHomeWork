
declare global {
  interface Window {
    AMap?: any
    _AMapSecurityConfig?: { serviceHost: string }
  }
}
let pending: Promise<any> | null = null
export function loadAmap(): Promise<any> {
  if (window.AMap) return Promise.resolve(window.AMap)
  if (pending) return pending
  const key = import.meta.env.VITE_AMAP_KEY?.trim()
  if (!key) return Promise.reject(new Error('未配置高德 Key，请检查本地环境配置。'))
  pending = new Promise((resolve, reject) => {
    window._AMapSecurityConfig = { serviceHost: window.location.origin + '/_AMapService' }
    const script = document.createElement('script')
    script.dataset.amapLoader = 'true'   // data-amap-loader 属性：标记这个标签是我们插的
    script.async = true                  // 异步加载，不阻塞页面
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=' + encodeURIComponent(key)
    const timer = window.setTimeout(() => finish(new Error('地图加载超时，请检查网络后重试。')), 15000)
    let settled = false   // 防止成功/失败回调重复执行
    function finish(error?: Error) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      script.onload = null
      script.onerror = null
      if (error) { script.remove(); reject(error) } else resolve(window.AMap)
    }
    script.onload = () => window.AMap ? finish() : finish(new Error('地图 SDK 未正确加载。'))
    script.onerror = () => finish(new Error('地图加载失败，请检查网络和高德代理配置。'))
    document.head.appendChild(script)   // 挂到 <head>，开始下载
  }).catch(error => { pending = null; throw error })   // 失败后清空缓存，下次调用重试
  return pending
}
export async function amapPlugins(names: string[]): Promise<any> {
  const sdk = await loadAmap()
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('地图服务加载超时，请重试。')), 12000)
    sdk.plugin(names, () => { clearTimeout(timer); resolve(sdk) })
  })
}
export function mapStyle(dark: boolean) { return dark ? 'amap://styles/dark' : 'amap://styles/whitesmoke' }

export function locationContextError(): string {
  if (!window.isSecureContext) return '当前地址不支持浏览器定位。'
  if (!navigator.geolocation) return '当前浏览器不支持定位，请搜索地点或在地图上选点。'
  return ''
}

function locationFailureReason(result: any): string {
  const detail = typeof result === 'string' ? result : [result?.info, result?.message, result?.type, result?.infocode].filter(Boolean).join(' ')
  const reasons: string[] = []
  if (/geolocation.*time.?out/i.test(detail) || result?.code === 3) reasons.push('浏览器获取位置超时')
  else if (/POSITION_UNAVAILABLE|position unavailable|failed to get geolocation/i.test(detail) || result?.code === 2) reasons.push('浏览器未能取得位置')
  if (/ip.?location.*fail|fail.*ip.?location/i.test(detail)) reasons.push('高德备用 IP 定位失败，请检查高德代理')
  if (/convert.*fail|fail.*convert/i.test(detail)) reasons.push('高德坐标转换失败，请检查高德代理')
  if (/LOCAL_CALLBACK_TIMEOUT/.test(detail)) reasons.push('高德 SDK 未在等待时间内回调，暂时无法确定失败环节')
  if (reasons.length) return reasons.join('；') + '。'
  if (/time.?out/i.test(detail)) return '高德返回定位超时，未提供更具体的原因。'
  return amapError(result, '定位')
}

export function locateAmap(sdk: any, signal: AbortSignal, onProgress: (message: string) => void): Promise<{ position: [number, number]; accuracy: number | null }> {
  const contextError = locationContextError()
  if (contextError) return Promise.reject(new Error(contextError))
  return new Promise((resolve, reject) => {
    let settled = false, attempt = 0
    const failures = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | undefined
    function finish(error?: Error, value?: { position: [number, number]; accuracy: number | null }) {
      if (settled) return
      settled = true; clearTimeout(timer); signal.removeEventListener('abort', abort)
      if (error) reject(error); else resolve(value!)
    }
    function abort() { finish(new DOMException('定位已取消', 'AbortError')) }
    if (signal.aborted) { abort(); return }
    signal.addEventListener('abort', abort, { once: true })
    function run(highAccuracy: boolean) {
      const token = ++attempt
      const timeout = highAccuracy ? 15000 : 10000
      onProgress(highAccuracy ? '仍未取得位置，正在尝试高精度定位…请确认系统定位服务已开启。' : '正在获取位置…如浏览器询问，请允许位置访问。')
      function failed(result: any) {
        if (settled || token !== attempt) return
        clearTimeout(timer)
        const detail = typeof result === 'string' ? result : [result?.info, result?.message, result?.type].filter(Boolean).join(' ')
        const denied = /permission|denied/i.test(detail) || result?.code === 1
        const temporary = /time.?out|POSITION_UNAVAILABLE|position unavailable|failed to get/i.test(detail) || result?.code === 2 || result?.code === 3
        failures.add(locationFailureReason(result))
        if (!highAccuracy && !denied && temporary) { run(true); return }
        if (denied) { finish(new Error('无法获得位置权限，请检查浏览器的网站位置权限和系统定位服务。')); return }
        if (temporary) { finish(new Error([...failures].join(' ') + ' 请检查系统位置服务与网络，或搜索地点、手动选点。')); return }
        finish(new Error(locationFailureReason(result)))
      }
      timer = setTimeout(() => failed({ info: 'LOCAL_CALLBACK_TIMEOUT' }), timeout + 3000)
      try {
        const service = new sdk.Geolocation({ enableHighAccuracy: highAccuracy, maximumAge: 60000, timeout, convert: true, showButton: false, showMarker: false, showCircle: false, panToLocation: false, zoomToAccuracy: false })
        service.getCurrentPosition((status: string, result: any) => {
          if (settled || token !== attempt) return
          if (status !== 'complete' || !result?.position) { failed(result); return }
          const lng = result.position.getLng(), lat = result.position.getLat()
          if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) { finish(new Error('定位服务未返回有效坐标，请搜索地点或手动选点。')); return }
          const accuracy = Number(result.accuracy)
          finish(undefined, { position: [lng, lat], accuracy: Number.isFinite(accuracy) && accuracy > 0 ? accuracy : null })
        })
      } catch (cause) { failed(cause) }
    }
    run(false)
  })
}

export function amapError(result: any, action = '地图请求'): string {
  const detail = [result?.info, result?.message, result?.type, result?.infocode, result instanceof Error ? result.message : ''].filter(Boolean).join(' ')
  if (/permission|denied|PERMISSION_DENIED/i.test(detail)) return '浏览器未允许定位，请在地址栏的网站权限中允许位置访问后重试。'
  if (/timeout|time.?out/i.test(detail)) return '定位或地图服务响应超时，请检查网络后重试；仍可搜索或手动选点。'
  if (/INVALID_USER_SCODE|10008/.test(detail)) return '高德安全校验失败（INVALID_USER_SCODE），请检查代理添加的安全密钥是否与 JS API Key 配套。'
  if (/INVALID_USER_KEY|10001/.test(detail)) return '高德 Key 无效（INVALID_USER_KEY），请检查本地 VITE_AMAP_KEY。'
  if (/INVALID_USER_DOMAIN|10006/.test(detail)) return '当前域名未通过高德校验（INVALID_USER_DOMAIN），请核对 Key 的域名白名单。'
  if (/USERKEY_PLAT_NOMATCH|10009/.test(detail)) return 'Key 平台不匹配（USERKEY_PLAT_NOMATCH），请使用 Web 端 JS API 的 Key。'
  if (/DAILY_QUERY_OVER_LIMIT|10003/.test(detail)) return '高德服务当日调用额度已用完。'
  if (/POSITION_UNAVAILABLE|position unavailable|failed to get/i.test(detail)) return '浏览器无法取得位置，请检查系统定位服务与网络；仍可搜索或手动选点。'
  return `${action}失败，请检查 /_AMapService/ 代理是否返回高德数据，以及 Key、白名单与网络配置。`
}
