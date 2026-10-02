
export type UserRole = 'user' | 'admin'

/** 登录接口的 JSON 请求体。 */
export interface LoginRequest {
    account: string
    password: string
}

/** 注册接口的 JSON 请求体，QQ 和邮箱为可选字段。 */
export interface RegisterRequest extends LoginRequest {
    qq?: string
    email?: string
}

/** 登录成功响应中的 data；接口没有返回昵称或用户 ID。 */
export interface LoginResult {
    token: string
    user: {
        level: number
        role: UserRole
    }
}
