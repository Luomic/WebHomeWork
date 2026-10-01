import { reactive } from 'vue'
// 发布帖子里"地点"的值对象：POI 搜索结果（source: 'poi'）或地图点选/定位（source: 'map'）
export interface PlaceValue {
  name: string
  address: string
  position: [number, number]
  poiId?: string
  source: 'poi' | 'map'
}
export interface MarketItem {
  id: string
  title: string
  category: string
  price?: number
  image?: string
  imagePosition?: string
  ratio: string
  author: string
  place: string
  position: [number, number]
  description: string
}
export const campus: [number, number] = [120.165741, 30.293231]
// 箭头函数：拼出图片地址（BASE_URL + placeholder/序号.webp，文件在 public/ 里）
const asset = (n: number) => import.meta.env.BASE_URL + 'placeholder/' + n + '.webp'
export const marketItems: MarketItem[] = [
  { id: 'idle-01', title: '校园文创套装，笔记本与帆布袋', category: '生活', price: 25, image: asset(1), imagePosition: '50% 45%', ratio: '4 / 5', author: '示例同学 A', place: '图书馆附近', position: [120.1672, 30.2941], description: '用于展示商品图片与信息排版的示例，实际物品状况及交接方式以真实卖家发布为准。' },
  { id: 'idle-02', title: '深蓝校园 T 恤，简洁日常款', category: '服饰', price: 35, image: asset(2), imagePosition: '50% 0%', ratio: '1 / 1', author: '示例同学 B', place: '教学楼附近', position: [120.1638, 30.2917], description: '服饰类目示例。尚未接入商品接口，不提供真实尺码、库存或交易服务。' },
  { id: 'idle-03', title: '红色校园周边，整理出一份闲置', category: '生活', price: 30, image: asset(3), imagePosition: '50% 10%', ratio: '3 / 4', author: '示例同学 C', place: '东侧校门附近', position: [120.169, 30.2918], description: '沿用项目现有素材的示例卡片，不代表真实在售商品。' },
  { id: 'idle-04', title: '通勤滑板车，可折叠收纳', category: '出行', price: 260, image: asset(5), imagePosition: '50% 0%', ratio: '1 / 1', author: '示例同学 D', place: '校区公共交接点', position: [120.1652, 30.2947], description: '出行类目演示。商品参数、使用状况和当地通行要求需要由真实发布者说明。' },
  { id: 'idle-05', title: '考研英语词典，少量铅笔笔记', category: '书籍', price: 12, ratio: '4 / 5', author: '示例同学 E', place: '教学楼附近', position: [120.1638, 30.2917], description: '原有示例商品，暂无对应实拍图片。此处使用缺图状态，不拿无关图片代替。' },
  { id: 'idle-06', title: '蓝牙键盘，适合自习时使用', category: '数码', price: 60, ratio: '1 / 1', author: '示例同学 F', place: '东侧校门附近', position: [120.169, 30.2918], description: '原有示例商品，暂无实拍图片；只用于浏览与地图联动演示。' },
  { id: 'idle-07', title: '校园纪念帆布袋，轻便收纳', category: '生活', price: 15, image: asset(1), imagePosition: '50% 100%', ratio: '1 / 1', author: '示例同学 G', place: '图书馆附近', position: [120.1672, 30.2941], description: '图片取自项目现有文创素材，仅用于界面展示。' },
  { id: 'idle-08', title: '日常通勤电动车', category: '出行', price: 500, image: asset(6), imagePosition: '50% 0%', ratio: '4 / 5', author: '示例同学 H', place: '校区公共交接点', position: [120.166, 30.29], description: '出行商品示例，不包含真实车况或交易承诺。' },
]
// 商品分类列表（'全部' 供筛选下拉用，发布时 slice(1) 去掉它）
export const categories = ['全部', '生活', '服饰', '书籍', '数码', '出行']
// 在路由切换间保留搜索、筛选和滚动位置，只保留会话内的浏览偏好。
export const browseState = reactive({ query: '', category: '全部', sort: 'default', scroll: 0 })

/**
 * 返回球面上两点距离
 * @param a 经度
 * @param b 纬度
 * @returns 
 */
export function distanceMeters(a: [number, number], b: [number, number]) {
  const rad = (n: number) => n * Math.PI / 180
  const x = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, x)))
}
export const priceLabel = (value?: number) => value === 0 ? '免费赠送' : '¥' + value
