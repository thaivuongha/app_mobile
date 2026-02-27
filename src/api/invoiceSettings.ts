import { apiRequest } from './client';

export interface InvoiceSetting {
  id: string;
  companyName: string | null;
  taxCode: string | null;
  companyAddress: string | null;
  invoicePrefix: string | null;
  vatRate: number;
  logo: string | null;
  stamp: string | null;
  invoiceTemplate: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateInvoiceSettingBody {
  companyName?: string;
  taxCode?: string;
  companyAddress?: string;
  invoicePrefix?: string;
  vatRate?: number;
  logo?: string;
  stamp?: string;
  invoiceTemplate?: string;
}

export function getInvoiceSettings(): Promise<InvoiceSetting> {
  return apiRequest<InvoiceSetting>('/api/v1/invoice-settings/me');
}

export function updateInvoiceSettings(
  body: UpdateInvoiceSettingBody
): Promise<InvoiceSetting> {
  return apiRequest<InvoiceSetting>('/api/v1/invoice-settings/me', {
    method: 'PATCH',
    body,
  });
}
