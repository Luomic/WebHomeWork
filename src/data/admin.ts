import type { GoodsList } from '@/types/goods/Goods'
import type { GoodsReport } from '@/types/admin/review'

const asset = (n: number) => import.meta.env.BASE_URL + 'placeholder/' + n + '.webp'

/** /api/admin/post/pending 的本地响应示例，保持文档要求的创建时间升序。 */
export const pendingGoods: GoodsList[] = [
  {
    id: 102,
    title: '概率论与数理统计教材',
    description: '课本有少量标注，页面完整。',
    price: 18,
    images: [],
    category: '书籍',
    status: 'pending',
    user_id: 2027,
    created_at: '2026-09-30T19:20:00+08:00',
    updated_at: '2026-09-30T19:20:00+08:00',
    deleted_at: null,
  },
  {
    id: 101,
    title: '九成新宿舍台灯',
    description: '白色护眼台灯，功能正常，带原装电源线。',
    price: 45,
    images: [asset(4)],
    category: '生活',
    status: 'pending',
    user_id: 2026,
    created_at: '2026-10-01T08:30:00+08:00',
    updated_at: '2026-10-01T08:30:00+08:00',
    deleted_at: null,
  },
]

/** /api/admin/reports 返回全部状态；面板只从中展示 pending 的本地示例。 */
export const reportItems: GoodsReport[] = [
  {
    id: 203,
    user_id: 2033,
    post_id: 88,
    reason: '经核实为与商品无关的内容',
    status: 'valid',
    created_at: '2026-09-29T10:00:00+08:00',
  },
  {
    id: 204,
    user_id: 2034,
    post_id: 4,
    reason: '商品售价疑似标注错误',
    status: 'invalid',
    created_at: '2026-09-29T15:20:00+08:00',
  },
  {
    id: 202,
    user_id: 2032,
    post_id: 8,
    reason: '疑似发布重复或无关内容',
    status: 'pending',
    created_at: '2026-09-30T21:05:00+08:00',
  },
  {
    id: 201,
    user_id: 2031,
    post_id: 1,
    reason: '商品描述与图片疑似不一致',
    status: 'pending',
    created_at: '2026-10-01T09:10:00+08:00',
  },
]

export const pendingReports: GoodsReport[] = reportItems.filter(report => report.status === 'pending')
