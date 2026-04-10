import { apiRequest } from './client';

export interface Product {
  id: string;
  name: string;
  brandName: string;
  /** Giá gốc (vốn) — số tiền ký quỹ bị giam khi đặt hàng B2B */
  price: string;
  /** Hoa hồng tính sẵn theo partnerLevel của user (backend tính) */
  commissionAmount: string;
  /** Giá bán = price + commissionAmount — giá khách thanh toán tại máy */
  sellingPrice: string;
  imageUrl: string | null;
  description: string | null;
  categoryId: string | null;
  isActive: boolean;
  category?: { name: string };
}

export interface ProductsResponse {
  data: Product[];
  meta: { total: number; limit: number; offset: number };
}

export function getProducts(params?: {
  categoryId?: string;
  limit?: number;
  offset?: number;
  page?: number;
}): Promise<ProductsResponse> {
  return apiRequest<ProductsResponse>('/api/v1/products', { query: params });
}

export function getProductCategories(): Promise<{ id: string; name: string }[]> {
  return apiRequest('/api/v1/product-categories');
}
