
/**
 * 登录Type
 */
export interface LoginResult {
    token: string
    user: {
        level: number
        role: string
    }
}