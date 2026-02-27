import { apiRequest } from './client';

export interface SalesSummaryItem {
  /** Khi groupBy=day */
  date?: string;
  /** Khi groupBy=month */
  month?: string;
  /** Khi groupBy=week (YYYY-Www) */
  week?: string;
  /** Khi groupBy=year */
  year?: string;
  totalRevenue: number;
  transactionCount: number;
}

export interface SalesSummaryResponse {
  data: SalesSummaryItem[];
}

export type GroupBy = 'week' | 'month' | 'year' | 'day';

export function getSalesSummary(params: {
  groupBy: GroupBy;
  dateFrom: string;
  dateTo: string;
  deviceId?: string;
}): Promise<SalesSummaryResponse> {
  return apiRequest<SalesSummaryResponse>('/api/v1/sales/summary', {
    query: params as Record<string, string | undefined>,
  });
}
