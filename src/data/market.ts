import { reactive } from 'vue'   // reactive：创建响应式对象（浏览状态跨页面保留用）

/*
 * 市集的本地数据与共享类型。
 * 接口未接入前，marketItems 是唯一的"内容源"：市集页、地图页、详情弹窗都读它。
 * （全部为演示数据，图片沿用 public/placeholder 的项目素材。）
 */

// 'idle' = 闲置交易帖，'recommend' = 附近好地方种草帖
export type PostKind = 'idle' | 'recommend'
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
  kind: PostKind
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
// 朝晖校区中心点（经度, 纬度）：地图初始视野和"回校区"按钮都指这里。
export const campus: [number, number] = [120.165741, 30.293231]
// 箭头函数：拼出图片地址（BASE_URL + placeholder/序号.webp，文件在 public/ 里）
const asset = (n: number) => import.meta.env.BASE_URL + 'placeholder/' + n + '.webp'
// 全部为界面演示内容，图片沿用项目素材；不代表真实卖家、库存或地点评价。
export const marketItems: MarketItem[] = [
  { id: 'idle-01', kind: 'idle', title: '校园文创套装，笔记本与帆布袋', category: '生活', price: 25, image: asset(1), imagePosition: '50% 45%', ratio: '4 / 5', author: '示例同学 A', place: '图书馆附近', position: [120.1672, 30.2941], description: '用于展示商品图片与信息排版的示例，实际物品状况及交接方式以真实卖家发布为准。' },
  { id: 'idle-02', kind: 'idle', title: '深蓝校园 T 恤，简洁日常款', category: '服饰', price: 35, image: asset(2), imagePosition: '50% 0%', ratio: '1 / 1', author: '示例同学 B', place: '教学楼附近', position: [120.1638, 30.2917], description: '服饰类目示例。尚未接入商品接口，不提供真实尺码、库存或交易服务。' },
  { id: 'idle-03', kind: 'idle', title: '红色校园周边，整理出一份闲置', category: '生活', price: 30, image: asset(3), imagePosition: '50% 10%', ratio: '3 / 4', author: '示例同学 C', place: '东侧校门附近', position: [120.169, 30.2918], description: '沿用项目现有素材的示例卡片，不代表真实在售商品。' },
  { id: 'idle-04', kind: 'idle', title: '通勤滑板车，可折叠收纳', category: '出行', price: 260, image: asset(5), imagePosition: '50% 0%', ratio: '1 / 1', author: '示例同学 D', place: '校区公共交接点', position: [120.1652, 30.2947], description: '出行类目演示。商品参数、使用状况和当地通行要求需要由真实发布者说明。' },
  { id: 'idle-05', kind: 'idle', title: '考研英语词典，少量铅笔笔记', category: '书籍', price: 12, ratio: '4 / 5', author: '示例同学 E', place: '教学楼附近', position: [120.1638, 30.2917], description: '原有示例商品，暂无对应实拍图片。此处使用缺图状态，不拿无关图片代替。' },
  { id: 'idle-06', kind: 'idle', title: '蓝牙键盘，适合自习时使用', category: '数码', price: 60, ratio: '1 / 1', author: '示例同学 F', place: '东侧校门附近', position: [120.169, 30.2918], description: '原有示例商品，暂无实拍图片；只用于浏览与地图联动演示。' },
  { id: 'idle-07', kind: 'idle', title: '校园纪念帆布袋，轻便收纳', category: '生活', price: 15, image: asset(1), imagePosition: '50% 100%', ratio: '1 / 1', author: '示例同学 G', place: '图书馆附近', position: [120.1672, 30.2941], description: '图片取自项目现有文创素材，仅用于界面展示。' },
  { id: 'idle-08', kind: 'idle', title: '日常通勤电动车', category: '出行', price: 500, image: asset(6), imagePosition: '50% 0%', ratio: '4 / 5', author: '示例同学 H', place: '校区公共交接点', position: [120.166, 30.29], description: '出行商品示例，不包含真实车况或交易承诺。' },
  { id: 'recommend-01', kind: 'recommend', title: '找一个安静读书的角落', category: '种草', ratio: '3 / 4', author: '示例同学 A', place: '图书馆附近', position: [120.1672, 30.2941], description: '种草内容示例：这里应展示真实到访照片、推荐理由和地点。这不是实际到访评价。' },
  { id: 'recommend-02', kind: 'recommend', title: '课后散步，可以看看校园步道', category: '种草', ratio: '1 / 1', author: '示例同学 B', place: '校园公共步道', position: [120.165741, 30.293231], description: '种草用于推荐附近的好地方，不是组局或活动报名。尚无地点实拍，展示明确的缺图状态。' },
  { id: 'recommend-03', kind: 'recommend', title: '自习之间，找个地方稍作休息', category: '种草', ratio: '4 / 5', author: '示例同学 C', place: '教学区公共空间', position: [120.1638, 30.2917], description: '地点与内容均为排版演示，不作为校园实际开放信息。' },
]
// 商品分类列表（'全部' 供筛选下拉用，发布时 slice(1) 去掉它）
export const categories = ['全部', '生活', '服饰', '书籍', '数码', '出行']
// 在路由切换间保留搜索和滚动位置，只保留会话内的浏览偏好。
// reactive 对象在模块层创建 → 全站共用一份；as PostKind 是类型断言
export const browseState = reactive({ kind: 'idle' as PostKind, idleQuery: '', recommendQuery: '', category: '全部', sort: 'default', scroll: { idle: 0, recommend: 0 } })
// Haversine 公式：按地球球面算两个经纬度点之间的直线距离（米）。
// 给地图页"我附近 N 公里"筛选和距离标签用，不是步行导航距离。
export function distanceMeters(a: [number, number], b: [number, number]) {
  // 角度转弧度（三角函数要求弧度）
  const rad = (n: number) => n * Math.PI / 180
  // 公式的中间量：** 2 是平方；Math.cos/sin 是三角函数
  const x = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2
  // 6371000 = 地球半径（米）；asin/sqrt 是公式剩余步骤；min(1,x) 防浮点误差超出定义域
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, x)))
}
// 价格展示：0 显示"免费赠送"，其他拼 ¥ 符号
export const priceLabel = (value?: number) => value === 0 ? '免费赠送' : '¥' + value

