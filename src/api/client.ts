import { reactive } from 'vue'
import type { GoodsList, GoodsPost, GoodImg, GoodsRequest } from '@/types/goods/Goods'
import type { GoodsReport, GoodsAuditAction, ReportHandleAction } from '@/types/admin/review'
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

function readStoredUser(): LoginResult['user'] | null {
  try {
    const value = localStorage.getItem(USER_KEY)
    return value ? JSON.parse(value) as LoginResult['user'] : null
  } catch {
    return null
  }
}

export const authState = reactive({
  token: typeof localStorage === 'undefined' ? '' : localStorage.getItem(TOKEN_KEY) || '',
  user: typeof localStorage === 'undefined' ? null : readStoredUser(),
})

export function setAuth(result: LoginResult) {
  authState.token = result.token
  authState.user = result.user
  localStorage.setItem(TOKEN_KEY, result.token)
  localStorage.setItem(USER_KEY, JSON.stringify(result.user))
}

export function clearAuth() {
  authState.token = ''
  authState.user = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function resolveAssetUrl(url?: string | null) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) return url
  return API_BASE_URL + (url.startsWith('/') ? '' : '/') + url
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (authState.token) headers.set('Authorization', 'Bearer ' + authState.token)
  let response: Response
  try {
    response = await fetch(API_BASE_URL + path, { ...init, headers })
  } catch (error) {
    // fetch 的 TypeError 只有“Failed to fetch”一条信息，补充当前运行方式后才能判断是代理未重启还是后端不可达。
    const reason = error instanceof Error && error.message ? `（${error.message}）` : ''
    const endpoint = useApiProxy ? '同源 API 代理' : configuredApiBaseUrl
    throw new ApiError(`无法连接 ${endpoint}，请确认服务已启动且网络可达${reason}`, 0)
  }
  let body: any = null
  try { body = await response.json() } catch { /* 个别无正文响应不需要 JSON 解码 */ }
  if (!response.ok) {
    if (response.status === 401) clearAuth()
    throw new ApiError(body?.msg || '请求失败（' + response.status + '）', response.status, body?.code)
  }
  if (body && typeof body.code === 'number' && body.code !== 200 && body.code !== 0) {
    if (body.code === 401) clearAuth()
    throw new ApiError(body.msg || '接口返回业务错误', response.status, body.code)
  }
  return (body?.data ?? body) as T
}

export function login(payload: LoginRequest) {
  return request<LoginResult>('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }).then(result => { setAuth(result); return result })
}

export function register(payload: RegisterRequest) {
  return request<{ msg?: string }>('/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
}

export function getGoods(keyword = '', page = 1) {
  const query = new URLSearchParams({ page: String(Math.max(1, page)) })
  if (keyword.trim()) query.set('keyword', keyword.trim())
  return request<GoodsList<string[]>[]>('/api/goods?' + query)
}

export function getRankedGoods() {
  // 当前服务端在没有任何已审核商品时会返回 code=404、msg=商品不存在；
  // 对列表页面来说这等价于空列表，其他错误仍交给页面显示并支持重试。
  return request<GoodsList<string[]>[]>('/api/goods/ranked').catch(error => {
    if (error instanceof ApiError && error.code === 404) return []
    throw error
  })
}

export function getGoodsDetail(id: string | number) {
  return request<GoodsList<string[]>>('/api/goods/' + encodeURIComponent(id))
}

export function verifySession() {
  return request<void>('/api/auth/me')
}

export function uploadGoodsImage(file: File) {
  const form = new FormData()
  form.append('image', file)
  return request<GoodImg>('/api/goods/upload', { method: 'POST', body: form })
}

export function createGoods(payload: GoodsRequest) {
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

// 后端是 Go（GORM）模型直接序列化：ID / CreatedAt / UpdatedAt / DeletedAt 这四个
// 模型自带字段没写 json tag，返回的是大写开头，而业务字段（title、user_id 等）有小写 tag。
// 这里把大写字段映射回前端类型使用的 snake_case，有谁补谁，页面代码不需要到处兼容。
function normalizeGormFields<T>(item: T): T {
  const data = item as Record<string, unknown>
  return {
    ...data,
    id: data.id ?? data.ID,
    created_at: data.created_at ?? data.CreatedAt,
    updated_at: data.updated_at ?? data.UpdatedAt,
    deleted_at: data.deleted_at ?? data.DeletedAt,
  } as T
}

export function getPendingGoods() {
  return request<GoodsList<string[]>[]>('/api/admin/post/pending')
    .then(list => list.map(normalizeGormFields))
}
export function getAdminReports() {
  return request<GoodsReport[]>('/api/admin/reports')
    .then(list => list.map(normalizeGormFields))
}

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
