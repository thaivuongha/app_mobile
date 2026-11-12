import { apiRequest } from './client';

export interface PartnerStockItem {
  productId: string;
  name: string;
  brandName: string;
  imageUrl: string | null;
  /** Giá nhập của bản ghi sản phẩm */
  price: number;
  warehouseQty: number;
  onMachineQty: number;
}

export interface MyStockResponse {
  data: PartnerStockItem[];
}

export function getMyStock(): Promise<MyStockResponse> {
  return apiRequest<MyStockResponse>('/api/v1/inventory/my-stock');
}

export function setWarehouse(
  productId: string,
  body: { warehouseQty: number; note?: string },
): Promise<PartnerStockItem> {
  return apiRequest<PartnerStockItem>(`/api/v1/inventory/my-stock/${productId}`, {
    method: 'POST',
    body,
  });
}
