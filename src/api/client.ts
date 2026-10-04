import { computed, reactive } from 'vue'
import type { GoodsList, GoodsPost, GoodImg, GoodsRequest } from '@/types/goods/Goods'
import type { GoodsReport, GoodsAuditAction, ReportHandleAction } from '@/types/admin/review'
import type { DayGet } from '@/types/report/day'
import type { LoginRequest, LoginResult, RegisterRequest } from '@/types/auth/Login'

/**
 * 统一 API 客户端。Host 可通过 VITE_API_BASE_URL 覆盖，默认使用用户提供的服务地址。
 * 业务接口大多会在 HTTP 200 中返回 code，因此这里同时检查 HTTP 状态和业务 code。
 */
const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://121.40.220.225:8080').replace(/\/$/, '')
// 开发和本地预览走 Vite 同源代理，避免后端未配置 CORS 导致浏览器 Failed to fetch。
// VITE_API_USE_PROXY 允许 preview 或部署到已配置反向代理的站点继续使用同源请求；
// 关闭时才会在生产构建中直连完整 Host，此时后端必须开启 CORS。
const useApiProxy = import.meta.env.DEV || import.meta.env.VITE_API_USE_PROXY === 'true'
export const API_BASE_URL = useApiProxy ? '' : configuredApiBaseUrl
const TOKEN_KEY = 'market_api_token'
const USER_KEY = 'market_api_user'

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: number) {
    super(message)
    this.name = 'ApiError'
  }
}

/** 返回登录状态 */
function readStoredUser(): LoginResult['user'] | null {
  try {
    const value = localStorage.getItem(USER_KEY)
    return value ? JSON.parse(value) as LoginResult['user'] : null
  } catch {
    return null
  }
}

export const authState = reactive({
  validated: false,
  token: typeof localStorage === 'undefined' ? '' : localStorage.getItem(TOKEN_KEY) || '',
  user: typeof localStorage === 'undefined' ? null : readStoredUser(),
})

/** 设置用户数据 */
export function setAuth(result: LoginResult) {
  authState.validated = true
  authState.token = result.token
  authState.user = result.user
  localStorage.setItem(TOKEN_KEY, result.token)
  localStorage.setItem(USER_KEY, JSON.stringify(result.user))
}

export function clearAuth() {
  authState.validated = false
  authState.token = ''
  authState.user = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function resolveAssetUrl(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  if (/^https?:\/\//i.test(url) || url.startsWith('//')) {
    // 后端绝对图片地址也走同源代理，避免 HTTPS 页面加载 HTTP 图片被拦截。
    if (useApiProxy) {
      try {
        const assetUrl = new URL(url, configuredApiBaseUrl)
        if (assetUrl.origin === new URL(configuredApiBaseUrl).origin) {
          return assetUrl.pathname + assetUrl.search + assetUrl.hash
        }
      } catch { return url }
    }
    return url
  }
  return API_BASE_URL + (url.startsWith('/') ? '' : '/') + url
}

/** 异步请求Response */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (authState.token) headers.set('Authorization', 'Bearer ' + authState.token) //设置鉴权
  const sessionToken = authState.token
  let response: Response
  try {
    response = await fetch(API_BASE_URL + path, { ...init, headers })
  } catch (error) {
    // 补充当前运行方式
    const reason = error instanceof Error && error.message ? `（${error.message}）` : ''
    const endpoint = useApiProxy ? '同源 API 代理' : configuredApiBaseUrl
    throw new ApiError(`无法连接 ${endpoint}，请确认服务已启动且网络可达${reason}`, 0)
  }
  let body: any = null
  try { body = await response.json() } catch { /* 个别无正文响应不需要 JSON 解码 */ }
  if (!response.ok) {
    if (response.status === 401 && authState.token === sessionToken) clearAuth()
    throw new ApiError(body?.msg || body?.error || '请求失败（' + response.status + '）', response.status, body?.code)
  }
  if (body && typeof body.code === 'number' && body.code !== 200 && body.code !== 0) {
    if (body.code === 401 && authState.token === sessionToken) clearAuth()
    throw new ApiError(body.msg || '接口返回业务错误', response.status, body.code)
  }
  return (body?.data ?? body) as T
}
/** 登录方法 */
export function login(payload: LoginRequest) {
  return request<LoginResult>('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }).then(result => { result.user = { ...result.user, account: result.user.account || payload.account }; setAuth(result); return result })
}
/** 注册方法 */
export function register(payload: RegisterRequest) {
  return request<{ msg?: string }>('/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
}
/** 按分页显示 */
export function getGoods(keyword = '', page = 1) {
  const query = new URLSearchParams({ page: String(Math.max(1, page)) })
  if (keyword.trim()) query.set('keyword', keyword.trim())
  return request<GoodsList<string[]>[]>('/api/goods?' + query)
}
/** 已排序分页，但反馈是有bug的，这里按下不表 */
export function getRankedGoods() {
  return request<GoodsList<string[]>[]>('/api/goods/ranked').catch(error => {
    if (error instanceof ApiError && error.code === 404) return []
    throw error
  })
}

export function getGoodsDetail(id: string | number) {
  return request<GoodsList<string[]>>('/api/goods/' + encodeURIComponent(id))
}

export async function verifySession() {
  const token = authState.token
  if (!token) return
  const profile = await request<Partial<LoginResult['user']> & { user?: Partial<LoginResult['user']> }>('/api/auth/me')
  if (authState.token !== token) return
  authState.validated = true
  const user = profile?.user ?? profile
  if (authState.user && typeof user?.account === 'string' && user.account) {
    authState.user.account = user.account
    localStorage.setItem(USER_KEY, JSON.stringify(authState.user))
  }
}

export function uploadGoodsImage(file: File) {
  const form = new FormData()
  form.append('image', file)
  return request<GoodImg>('/api/goods/upload', { method: 'POST', body: form })
}

export function createGoods(payload: GoodsRequest) {
  if (!Number.isFinite(payload.price) || payload.price <= 0) throw new Error('商品价格必须大于 0。')
  return request<GoodsPost<string[]>>('/api/goods', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
}

export function reportGoods(id: string | number, reason: string) {
  return request<string>('/api/posts/' + encodeURIComponent(id) + '/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ reason }),
  })
}

export function getPendingGoods() { return request<GoodsList<string[]>[]>('/api/admin/post/pending') }
export function getAdminReports() { return request<GoodsReport[]>('/api/admin/reports') }

function formPost<T>(path: string, values: Record<string, string>) {
  return request<T>(path, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams(values),
  })
}

export function auditGoods(id: number, action: GoodsAuditAction) {
  return formPost<string>('/api/admin/posts/' + id + '/audit', { action })
}

export function handleReport(id: number, action: ReportHandleAction) {
  return formPost<string>('/api/admin/reports/' + id + '/handle', { action })
}

// JWT 仅用于界面识别本人；实际操作权限始终由服务端校验。
export const isLoggedIn = computed(() => !!authState.token && authState.validated)
export const currentUserId = computed(() => {
  if (!isLoggedIn.value) return null
  const storedId = Number(authState.user?.user_id ?? authState.user?.id)
  if (Number.isFinite(storedId) && storedId > 0) return storedId
  try {
    const part = authState.token.split('.')[1]!
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
    const id = Number(payload.user_id)
    return Number.isFinite(id) && id > 0 ? id : null
  } catch { return null }
})
export function canDeleteGoods(userId?: number) {
  return isLoggedIn.value && (authState.user?.role === 'admin' || (currentUserId.value !== null && String(currentUserId.value) === String(userId)))
}
export function deleteGoods(id: string | number) {
  const path = authState.user?.role === 'admin' ? '/api/admin/posts/' : '/api/goods/'
  return request<void>(path + encodeURIComponent(id), { method: 'DELETE' })
}
export function signIn() { return request<DayGet>('/api/user/sign-in', { method: 'POST' }) }
export function getFavorites() { return request<GoodsList<string[]>[]>('/api/posts/my-favorite') }
export function setFavorite(id: string | number, favorite: boolean) {
  return request<string>('/api/posts/' + encodeURIComponent(id) + '/favorite', { method: favorite ? 'POST' : 'DELETE' })
}
