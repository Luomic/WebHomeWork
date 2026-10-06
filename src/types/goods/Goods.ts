
import type { Status } from '../response/response'

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

export interface GoodsRequest {
  title: string;
  description?: string;
  price: number;
  images: string[];
  category?: string;
}

export type GoodsUpdateRequest = Partial<GoodsRequest>

export interface GoodsPost<T = string[]> {
  msg: string;
  goods: GoodsList<T>
}

export interface GoodImg {
    url: string
}
