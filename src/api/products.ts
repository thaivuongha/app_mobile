import { apiRequest } from './client';

export interface Product {
  id: string;
  name: string;
  brandName: string;
  /** Giá gốc (vốn) — số tiền ký quỹ bị giam khi đặt hàng B2B */
  price: string;
  /** Hoa hồng ước tính = commissionValue × K (priceMultiplier của owner) — backend tính sẵn */
  commissionAmount: string;
  /** Phần VAT ước tính = commissionAmount × 0.05 — Admin giữ để khai thuế */
  vatAmount: string;
  /** Giá bán cuối = ceil(price + commissionAmount + vatAmount, 1000) — giá khách thanh toán tại máy */
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
