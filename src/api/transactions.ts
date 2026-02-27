import { apiRequest } from './client';

export interface Transaction {
  id: string;
  deviceId: string;
  deviceName: string | null;
  productName: string | null;
  finalPrice: string;
  originalPrice: string | null;
  status: string;
  createdAt: string;
}

export interface TransactionsResponse {
  data: Transaction[];
  meta: { total: number; limit: number; offset: number };
}

export function getTransactions(params?: {
  deviceId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<TransactionsResponse> {
  return apiRequest<TransactionsResponse>('/api/v1/transactions', {
    query: params,
  });
}
