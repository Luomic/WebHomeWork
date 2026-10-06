import { reactive, toRaw } from 'vue'
import type { GoodsList } from '@/types/goods/Goods'
import type { Status } from '@/types/response/response'

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
  price: number
  image?: string
  images: string[]
  imagePosition?: string
  ratio: string
  author: string
  userId?: number
  createdAt?: string
  status: Status
  place?: string
  position?: [number, number]
  locationSource?: 'example'
  isExample: boolean
  description: string
  saleClosed: boolean
}

export const campus: [number, number] = [120.165741, 30.293231]
const asset = (n: number) => import.meta.env.BASE_URL + 'placeholder/' + n + '.webp'

export const goodsItems: GoodsList[] = [
  { id: 1, title: '校园文创套装，笔记本与帆布袋', category: '生活', price: 25, images: [asset(1), asset(3)], status: 'approved', user_id: 1001, created_at: '2026-09-30T09:00:00+08:00', updated_at: '2026-09-30T09:00:00+08:00', deleted_at: null, description: '笔记本和帆布袋成色良好，适合日常上课使用。' },
  { id: 2, title: '深蓝校园 T 恤，简洁日常款', category: '服饰', price: 35, images: [asset(2)], status: 'approved', user_id: 1002, created_at: '2026-09-29T15:30:00+08:00', updated_at: '2026-09-29T15:30:00+08:00', deleted_at: null, description: '深蓝色校园 T 恤，日常穿着，具体尺码可在沟通时确认。' },
  { id: 3, title: '红色校园周边，整理出一份闲置', category: '生活', price: 30, images: [asset(3)], status: 'approved', user_id: 1003, created_at: '2026-09-28T11:20:00+08:00', updated_at: '2026-09-28T11:20:00+08:00', deleted_at: null, description: '整理闲置校园周边，保存完整，欢迎现场查看。' },
  { id: 4, title: '通勤滑板车，可折叠收纳', category: '出行', price: 260, images: [asset(5)], status: 'approved', user_id: 1004, created_at: '2026-09-27T18:10:00+08:00', updated_at: '2026-09-27T18:10:00+08:00', deleted_at: null, description: '可折叠滑板车，适合校内短途通勤。' },
  { id: 5, title: '考研英语词典，少量铅笔笔记', category: '书籍', price: 12, images: [], status: 'approved', user_id: 1005, created_at: '2026-09-27T10:40:00+08:00', updated_at: '2026-09-27T10:40:00+08:00', deleted_at: null, description: '内页有少量铅笔笔记，内容完整，适合备考使用。' },
  { id: 6, title: '蓝牙键盘，适合自习时使用', category: '数码', price: 60, images: [], status: 'approved', user_id: 1006, created_at: '2026-09-26T16:00:00+08:00', updated_at: '2026-09-26T16:00:00+08:00', deleted_at: null, description: '蓝牙键盘连接稳定，适合在图书馆或自习室使用。' },
  { id: 7, title: '校园纪念帆布袋，轻便收纳', category: '生活', price: 15, images: [asset(1)], status: 'approved', user_id: 1007, created_at: '2026-09-25T13:05:00+08:00', updated_at: '2026-09-25T13:05:00+08:00', deleted_at: null, description: '轻便帆布袋，日常通勤和收纳都很方便。' },
  { id: 8, title: '日常通勤电动车', category: '出行', price: 500, images: [asset(6)], status: 'approved', user_id: 1008, created_at: '2026-09-24T08:45:00+08:00', updated_at: '2026-09-24T08:45:00+08:00', deleted_at: null, description: '校内通勤电动车，车况与交接细节以现场确认结果为准。' },
  { id: 9, title: '高等数学上下册，整套出', category: '书籍', price: 22, images: [], status: 'approved', user_id: 1009, created_at: '2026-09-23T18:00:00+08:00', updated_at: '2026-09-23T18:00:00+08:00', deleted_at: null, description: '教材完整，有部分课堂笔记。' },
  { id: 10, title: '可调节笔记本电脑支架', category: '数码', price: 30, images: [], status: 'approved', user_id: 1010, created_at: '2026-09-23T14:10:00+08:00', updated_at: '2026-09-23T14:10:00+08:00', deleted_at: null, description: '铝合金支架，可以折叠收纳。' },
  { id: 11, title: '宿舍收纳盒三件套', category: '生活', price: 15, images: [], status: 'approved', user_id: 1011, created_at: '2026-09-23T09:15:00+08:00', updated_at: '2026-09-23T09:15:00+08:00', deleted_at: null, description: '三个不同大小的收纳盒，已清洁。' },
  { id: 12, title: '羽毛球拍一对', category: '其他', price: 40, images: [], status: 'approved', user_id: 1012, created_at: '2026-09-22T20:20:00+08:00', updated_at: '2026-09-22T20:20:00+08:00', deleted_at: null, description: '适合日常运动，包含收纳袋。' },
  { id: 13, title: '秋季薄款衬衫', category: '服饰', price: 20, images: [], status: 'approved', user_id: 1013, created_at: '2026-09-22T17:30:00+08:00', updated_at: '2026-09-22T17:30:00+08:00', deleted_at: null, description: '基础款衬衫，尺码可沟通确认。' },
  { id: 14, title: '大学英语四级备考资料', category: '书籍', price: 10, images: [], status: 'approved', user_id: 1014, created_at: '2026-09-22T11:05:00+08:00', updated_at: '2026-09-22T11:05:00+08:00', deleted_at: null, description: '练习册与复习笔记，部分题目已作答。' },
  { id: 15, title: 'USB 桌面小风扇', category: '数码', price: 18, images: [], status: 'approved', user_id: 1015, created_at: '2026-09-21T19:45:00+08:00', updated_at: '2026-09-21T19:45:00+08:00', deleted_at: null, description: 'USB 供电，三档风速，运行正常。' },
  { id: 16, title: '折叠雨伞，备用闲置', category: '生活', price: 8, images: [], status: 'approved', user_id: 1016, created_at: '2026-09-21T15:30:00+08:00', updated_at: '2026-09-21T15:30:00+08:00', deleted_at: null, description: '手动折叠雨伞，伞面完整。' },
  { id: 17, title: '自行车头盔与车灯', category: '出行', price: 35, images: [], status: 'approved', user_id: 1017, created_at: '2026-09-21T09:00:00+08:00', updated_at: '2026-09-21T09:00:00+08:00', deleted_at: null, description: '通勤装备组合，车灯可正常使用。' },
  { id: 18, title: '机械绘图工具套装', category: '其他', price: 25, images: [], status: 'approved', user_id: 1018, created_at: '2026-09-20T18:15:00+08:00', updated_at: '2026-09-20T18:15:00+08:00', deleted_at: null, description: '包含圆规和尺子，适合课程绘图。' },
  { id: 19, title: '线性代数教材，附习题册', category: '书籍', price: 16, images: [], status: 'approved', user_id: 1019, created_at: '2026-09-20T13:40:00+08:00', updated_at: '2026-09-20T13:40:00+08:00', deleted_at: null, description: '课本和习题册一起出，有少量标注。' },
  { id: 20, title: '有线鼠标，轻便办公款', category: '数码', price: 12, images: [], status: 'approved', user_id: 1020, created_at: '2026-09-20T08:20:00+08:00', updated_at: '2026-09-20T08:20:00+08:00', deleted_at: null, description: 'USB 接口，按键和滚轮功能正常。' },
  { id: 21, title: '桌面书立与文件架', category: '生活', price: 14, images: [], status: 'approved', user_id: 1021, created_at: '2026-09-19T19:10:00+08:00', updated_at: '2026-09-19T19:10:00+08:00', deleted_at: null, description: '方便整理桌面书本和资料。' },
  { id: 22, title: '黑色运动外套', category: '服饰', price: 45, images: [], status: 'approved', user_id: 1022, created_at: '2026-09-19T15:35:00+08:00', updated_at: '2026-09-19T15:35:00+08:00', deleted_at: null, description: '轻便运动外套，已清洗。' },
  { id: 23, title: '英语阅读书籍两本', category: '书籍', price: 10, images: [], status: 'approved', user_id: 1023, created_at: '2026-09-19T11:25:00+08:00', updated_at: '2026-09-19T11:25:00+08:00', deleted_at: null, description: '有阅读批注，希望继续派上用场。' },
  { id: 24, title: '便携保温杯', category: '生活', price: 20, images: [], status: 'approved', user_id: 1024, created_at: '2026-09-18T17:50:00+08:00', updated_at: '2026-09-18T17:50:00+08:00', deleted_at: null, description: '杯体完整，已清洁，容量约 500 毫升。' },
]

const exampleGoods = new WeakSet<GoodsList<unknown>>(goodsItems)

type ExamplePresentation = Pick<MarketItem, 'place' | 'position' | 'ratio' | 'imagePosition'>

const examplePresentations = new WeakMap<GoodsList<unknown>, ExamplePresentation>([
  [goodsItems[0]!, { place: '图书馆附近', position: [120.1672, 30.2941], ratio: '4 / 5', imagePosition: '50% 45%' }],
  [goodsItems[1]!, { place: '教学楼附近', position: [120.1638, 30.2917], ratio: '1 / 1', imagePosition: '50% 0%' }],
  [goodsItems[2]!, { place: '东侧校门附近', position: [120.169, 30.2918], ratio: '3 / 4', imagePosition: '50% 10%' }],
  [goodsItems[3]!, { place: '校区公共交接点', position: [120.1652, 30.2947], ratio: '1 / 1', imagePosition: '50% 0%' }],
  [goodsItems[4]!, { place: '教学楼附近', position: [120.1638, 30.2917], ratio: '4 / 5' }],
  [goodsItems[5]!, { place: '东侧校门附近', position: [120.169, 30.2918], ratio: '1 / 1' }],
  [goodsItems[6]!, { place: '图书馆附近', position: [120.1672, 30.2941], ratio: '1 / 1', imagePosition: '50% 100%' }],
  [goodsItems[7]!, { place: '校区公共交接点', position: [120.166, 30.29], ratio: '4 / 5', imagePosition: '50% 0%' }],
])

export function toMarketItem(goods: GoodsList<unknown>): MarketItem {
  const source = toRaw(goods)
  const presentation = examplePresentations.get(source)
  const embedded = parseEmbeddedPosition(goods.description)
  const images = Array.isArray(goods.images) ? goods.images.filter((image): image is string => typeof image === 'string' && !!image.trim()) : []
  return {
    id: String(goods.id),
    title: goods.title,
    category: goods.category || '其他',
    price: goods.price,
    image: images[0],
    images,
    ratio: presentation?.ratio ?? '1 / 1',
    imagePosition: presentation?.imagePosition,
    author: goods.user_id !== undefined ? `用户 ${goods.user_id}` : '校园用户',
    userId: goods.user_id,
    createdAt: goods.created_at,
    status: goods.status,
    place: presentation?.place,
    position: embedded?.position ?? presentation?.position,
    locationSource: embedded ? undefined : presentation?.position ? 'example' : undefined,
    isExample: exampleGoods.has(source),
    description: embedded?.description || '暂无详细描述。',
    saleClosed: goods.sale_closed === true,
  }
}

export function parseEmbeddedPosition(description?: string) {
  if (typeof description !== 'string') return null
  const match = description.match(/(?:\r?\n|^)\s*\{"position":\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]}\s*$/)
  if (!match) return { description }
  const position: [number, number] = [Number(match[1]), Number(match[2])]
  if (!position.every(Number.isFinite)) return { description }
  return { position, description: description.slice(0, match.index).trimEnd() }
}

export const marketItems: MarketItem[] = goodsItems
  .filter(goods => goods.status === 'approved')
  .map(goods => toMarketItem(goods))

export const categories = ['全部', '生活', '服饰', '书籍', '数码', '出行', '其他']
export const browseState = reactive({ query: '', category: '全部', sort: 'default', scroll: 0, first: 0 })

export function distanceMeters(a: [number, number], b: [number, number]) {
  const rad = (n: number) => n * Math.PI / 180
  const x = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, x)))
}

export const priceLabel = (value?: number) => value === undefined ? '价格待议' : '¥' + value
