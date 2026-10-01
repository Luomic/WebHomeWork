export type Status = "pending" | "approved" | "rejected" | "deleted"
export interface ResponseMsg<T> {
    code: number
    msg: string
    data: T
}