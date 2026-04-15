import { apiRequest } from './client';

export interface OrderItem {
  productName: string;
  brandName: string;
  quantity: number;
  /** Giá gốc tại thời điểm đặt */
  priceAtOrder: string;
  /** Hoa hồng tại thời điểm đặt */
  commissionAtOrder: string;
  /** Giá bán = priceAtOrder + commissionAtOrder */
  sellingPriceAtOrder: string;
}

export interface ShippingAddress {
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string;
  district: string;
  city: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderCode?: number;
  status: string;
  notes: string | null;
  adminNotes?: string | null;
  totalAmount?: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  shippingAddress?: ShippingAddress;
  itemsCount?: number;
}

export interface MyOrdersResponse {
  data: Order[];
  meta: { total: number; limit: number; offset: number };
}

export interface CreateOrderBody {
  items: { productId: string; quantity: number }[];
  notes?: string;
  addressId?: string;
  deliveryAddress?: ShippingAddress;
}

export function createOrder(body: CreateOrderBody): Promise<{ orderId: string; status: string }> {
  return apiRequest('/api/v1/orders', { method: 'POST', body });
}

export function getMyOrders(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<MyOrdersResponse> {
  return apiRequest<MyOrdersResponse>('/api/v1/orders/my-orders', { query: params });
}

export function getOrder(id: string): Promise<Order> {
  return apiRequest<Order>(`/api/v1/orders/${id}`);
}

export function cancelOrder(id: string, reason?: string): Promise<Order> {
  return apiRequest<Order>(`/api/v1/orders/${id}/cancel`, {
    method: 'PATCH',
    body: reason ? { reason } : {},
  });
}
