import { apiRequest } from './client';

export interface DeliveryAddress {
  id: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string | null;
  district: string;
  city: string;
  notes?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAddressesResponse {
  data: DeliveryAddress[];
  meta?: { total: number; limit: number; offset: number };
}

export interface CreateDeliveryAddressBody {
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string;
  district: string;
  city: string;
  notes?: string;
  isDefault?: boolean;
}

export function getDeliveryAddresses(): Promise<DeliveryAddressesResponse> {
  return apiRequest<DeliveryAddressesResponse>('/api/v1/delivery-addresses');
}

export function createDeliveryAddress(
  body: CreateDeliveryAddressBody
): Promise<DeliveryAddress> {
  return apiRequest<DeliveryAddress>('/api/v1/delivery-addresses', {
    method: 'POST',
    body,
  });
}

export function updateDeliveryAddress(
  id: string,
  body: Partial<CreateDeliveryAddressBody>
): Promise<DeliveryAddress> {
  return apiRequest<DeliveryAddress>(`/api/v1/delivery-addresses/${id}`, {
    method: 'PATCH',
    body,
  });
}

export function deleteDeliveryAddress(id: string): Promise<{ message: string }> {
  return apiRequest(`/api/v1/delivery-addresses/${id}`, { method: 'DELETE' });
}
