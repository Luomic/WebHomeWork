
import type { Status } from '../response/response'

/** 商品单项；列表接口的 data 为此类型的数组，图片为 URL 字符串数组。 */
export interface GoodsList<T = string[]> {
  id: number;
  title: string;
  description?: string;
  price: number;
  images?: T;
  category?: string;
  status: Status;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  sale_closed?: boolean;
}

export interface GoodsPage<T = string[]> {
  goods: GoodsList<T>[] | null;
  totalpage: number;
}

/** 发布、修改商品的 JSON 请求体；图片先由上传接口取得 URL。 */
export interface GoodsRequest {
  title: string;
  description?: string;
  price: number;
  images: string[];
  category?: string;
}

export type GoodsUpdateRequest = Partial<GoodsRequest>

/** 发布成功响应中的 data。 */
export interface GoodsPost<T = string[]> {
  msg: string;
  goods: GoodsList<T>
}

/** 上传成功响应中的 data，发布时只使用其中的 url。 */
export interface GoodImg {
    url: string
}
