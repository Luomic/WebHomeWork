type Status = "pending" | "valid" | "invalid"
/**
 * 举报列表
 */
export interface GoodsReport {
  id: number;
  user_id: number;
  post_id: number;
  reason: string;
  status: Status;
  created_at: string;
}
