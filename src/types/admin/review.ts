export type ReportStatus = 'pending' | 'valid' | 'invalid'
export type GoodsAuditAction = 'approve' | 'reject'
export type ReportHandleAction = 'valid' | 'invalid'
/**
 * 举报列表
 */
export interface GoodsReport {
  id: number;
  user_id: number;
  post_id: number;
  reason: string;
  status: ReportStatus;
  created_at: string;
}
