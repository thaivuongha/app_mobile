import { apiRequest } from './client';

export interface Product {
  id: string;
  name: string;
  brandName: string;
  price: string;
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
