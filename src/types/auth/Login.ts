
export type UserRole = 'user' | 'admin'

export interface LoginRequest {
    account: string
    password: string
}

export interface RegisterRequest extends LoginRequest {
    qq?: string
    email?: string
}

export interface LoginResult {
    token: string
    user: {
        account?: string
        user_id?: number
        id?: number
        level: number
        role: UserRole
    }
}
