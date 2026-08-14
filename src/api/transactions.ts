import { apiRequest } from './client';

export interface Transaction {
  id: string;
  deviceId: string;
  deviceName: string | null;
  productName: string | null;
  /** Giá vốn của chai tại thời điểm bán */
  originalPrice: string | null;
  /** Số tiền khách thực thanh toán = ceil(originalPrice + commissionAmount + vatAmount, 1000) */
  finalPrice: string;
  /** Hoa hồng thực owner nhận = commissionValue × K tại thời điểm bán */
  commissionAmount: string | null;
  /** Hệ số K (priceMultiplier) của owner tại thời điểm bán */
  priceMultiplier: string | null;
  /** Thuế suất VAT tại thời điểm bán (mặc định 0.05) */
  vatRate: string | null;
  /** Số tiền VAT Admin giữ = commissionAmount × vatRate */
  vatAmount: string | null;
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
