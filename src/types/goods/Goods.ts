
import type { Status } from "../response/response";
/**
 * 商品单项(详情)，实际用[]
 */
export interface GoodsList<T> {
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
}
/**
 * 发布商品返回的商品单项
 */
export interface GoodsPost<T> {
  msg: string;
  goods: GoodsList<T>
}
/**
 * 上传图片单项
 */
export interface GoodImg {
    url: string
}