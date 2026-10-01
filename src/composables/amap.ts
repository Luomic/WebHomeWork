/*
 * 高德地图 JS API 公共封装 —— 全站地图功能（Map 页、发布帖子的地点选择）都从这里走。
 *
 *
 *   1) 浏览器：loadAmap() 动态插入 <script> 加载官方 SDK。因为高德规定
 *      2021-12 之后申请的 JS API Key 必须搭配"安全密钥"才能调搜索、逆地理
 *      编码、定位这些 Web 服务，这里把 window._AMapSecurityConfig.serviceHost
 *      指向本站的 /_AMapService 前缀 —— SDK 看到它后就不再直连高德，
 *      而是请求"当前域名/_AMapService/..."，把安全密钥留在服务端加。
 *
 *   2) 开发服务器（Vite）：vite.config.ts 把 /_AMapService 转发到高德官方
 *      接口，转发时补上安全密钥（AMAP_SECURITY_CODE，只存在 Node 端，
 *      不会打包进浏览器）。⚠ 如果密钥没填、或转发目标没配这条规则，
 *      SDK 拿回来的就不是高德的 JSON 而是一段 HTML（比如自己网站的首页），
 *      界面上就会报"地址解析失败"——之前发布帖子的位置解析出错就是这个原因。
 *
 *   3) 高德服务器：真正提供瓦片、POI 搜索、逆地理编码和定位数据。
 *
 * 另：本地必须用 localhost 访问，浏览器定位（Geolocation）只在安全上下文可用。
 */

// 官方 JS SDK 动态注入全局对象；不引入额外加载器依赖。
// declare global：给 window 补充类型声明（AMap 是 SDK 挂上去的全局变量，TS 本来不认识）
declare global {
  interface Window {
    AMap?: any
    _AMapSecurityConfig?: { serviceHost: string }
  }
}
// SDK 全局只加载一次：第一次的 Promise 暂存在这里，之后的调用直接复用（单例）。
// 加载失败时清空 pending，下一次调用才会重试。
let pending: Promise<any> | null = null
// export：暴露给其他文件 import；返回 Promise——加载是异步的，用 then/await 等结果
export function loadAmap(): Promise<any> {
  // SDK 已经加载过（全局对象存在）→ 直接返回，不重复加载
  if (window.AMap) return Promise.resolve(window.AMap)
  // 正在加载中 → 复用同一个 Promise，避免插两个 <script>
  if (pending) return pending
  const key = import.meta.env.VITE_AMAP_KEY?.trim()
  // 没配 Key 直接报错，别等超时
  if (!key) return Promise.reject(new Error('未配置高德 Key，请检查本地环境配置。'))
  pending = new Promise((resolve, reject) => {
    // 代理模式：SDK 的所有 Web 服务请求都会改走 origin + /_AMapService，
    // 由 Vite（开发时）或 Nginx（部署后）转发到高德并附加安全密钥。
    window._AMapSecurityConfig = { serviceHost: window.location.origin + '/_AMapService' }
    // 手动创建 <script> 标签插入页面（动态加载）
    const script = document.createElement('script')
    script.dataset.amapLoader = 'true'   // data-amap-loader 属性：标记这个标签是我们插的
    script.async = true                  // 异步加载，不阻塞页面
    // encodeURIComponent：Key 里的特殊字符转义成 URL 安全格式
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=' + encodeURIComponent(key)
    // 15 秒加载不出来按超时失败
    const timer = window.setTimeout(() => finish(new Error('地图加载超时，请检查网络后重试。')), 15000)
    let settled = false   // 防止成功/失败回调重复执行
    function finish(error?: Error) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      script.onload = null
      script.onerror = null
      // 失败：把 <script> 从页面移除并 reject；成功：把全局 AMap 交出去
      if (error) { script.remove(); reject(error) } else resolve(window.AMap)
    }
    // onload：脚本下载并执行完——这时 window.AMap 应该存在
    script.onload = () => window.AMap ? finish() : finish(new Error('地图 SDK 未正确加载。'))
    script.onerror = () => finish(new Error('地图加载失败，请检查网络和高德代理配置。'))
    document.head.appendChild(script)   // 挂到 <head>，开始下载
  }).catch(error => { pending = null; throw error })   // 失败后清空缓存，下次调用重试
  return pending
}
/**
 * 按需加载 SDK 插件（PlaceSearch / Geocoder / Geolocation 等）。
 * 这些插件不随主 SDK 下载，用到时才异步取，全部就绪后再继续。
*/
export async function amapPlugins(names: string[]): Promise<any> {
  const sdk = await loadAmap()
  return new Promise((resolve, reject) => {
    // 12 秒内插件没就绪按超时失败
    const timer = window.setTimeout(() => reject(new Error('地图服务加载超时，请重试。')), 12000)
    // sdk.plugin：SDK 官方的插件加载器，全部加载完才调回调
    sdk.plugin(names, () => { clearTimeout(timer); resolve(sdk) })
  })
}
// 按主题返回底图样式字符串（高德内置样式名）
export function mapStyle(dark: boolean) { return dark ? 'amap://styles/dark' : 'amap://styles/whitesmoke' }

/**
 * 定位前置检查：返回错误文案（空字符串 = 可以定位）。
 * isSecureContext：安全上下文——浏览器规定 Geolocation 只在 HTTPS 或 localhost 可用
*/
export function locationContextError(): string {
  if (!window.isSecureContext) return '当前地址不支持浏览器定位。'
  if (!navigator.geolocation) return '当前浏览器不支持定位，请搜索地点或在地图上选点。'
  return ''
}

/**
 * 从 SDK 错误中提取失败阶段，不展示原始响应、URL、密钥或位置数据。
 */
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

/**
 * 浏览器定位。
 *
 * 过程：先用普通精度试一次；如果只是超时/取不到（暂时性失败）而用户没有拒绝权限，
 * 再用高精度试一次。两次都失败才报错，并把每一轮的原因都攒起来一起展示。
 *
 * 竞态防护：signal 支持 AbortSignal，弹窗关掉时调用方 abort() 即可中断等待；
 * attempt 是"轮次编号"，第二轮开始后第一轮的旧回调再进来会被编号对不上挡掉，
 * 不会把第二轮的结果覆盖掉。
 */
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
        // 只重试暂时性定位失败；权限或密钥错误应直接说明原因。
        const detail = typeof result === 'string' ? result : [result?.info, result?.message, result?.type].filter(Boolean).join(' ')
        const denied = /permission|denied/i.test(detail) || result?.code === 1
        const temporary = /time.?out|POSITION_UNAVAILABLE|position unavailable|failed to get/i.test(detail) || result?.code === 2 || result?.code === 3
        failures.add(locationFailureReason(result))
        if (!highAccuracy && !denied && temporary) { run(true); return }
        if (denied) { finish(new Error('无法获得位置权限，请检查浏览器的网站位置权限和系统定位服务。')); return }
        if (temporary) { finish(new Error([...failures].join(' ') + ' 请检查系统位置服务与网络，或搜索地点、手动选点。')); return }
        finish(new Error(locationFailureReason(result)))
      }
      // 留出 SDK 回调时间，避免页面定时器抢先截断；旧回调通过 token 忽略。
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

/**
 * 只提取可识别的错误码，避免将上游响应中的请求参数或密钥显示到界面。
*/
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
