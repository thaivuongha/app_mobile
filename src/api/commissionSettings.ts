import { apiRequest } from './client';

export interface CommissionSetting {
  id: string;
  commissionType: string;
  commissionValue: number;
  applyToProducts?: string[];
  applyToCategories?: string[];
  priority: number;
  isDefault: boolean;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommissionSettingBody {
  commissionType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  commissionValue: number;
  applyToProducts?: string[];
  applyToCategories?: string[];
  priority?: number;
  isDefault?: boolean;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export function getCommissionSettings(): Promise<CommissionSetting[]> {
  return apiRequest<CommissionSetting[]>('/api/v1/commission-settings');
}

export function createCommissionSetting(
  body: CreateCommissionSettingBody
): Promise<CommissionSetting> {
  return apiRequest<CommissionSetting>('/api/v1/commission-settings', {
    method: 'POST',
    body,
  });
}

export function getCommissionSetting(id: string): Promise<CommissionSetting> {
  return apiRequest<CommissionSetting>(`/api/v1/commission-settings/${id}`);
}

export function updateCommissionSetting(
  id: string,
  body: Partial<CreateCommissionSettingBody>
): Promise<CommissionSetting> {
  return apiRequest<CommissionSetting>(`/api/v1/commission-settings/${id}`, {
    method: 'PATCH',
    body,
  });
}

export function deleteCommissionSetting(
  id: string
): Promise<{ message: string }> {
  return apiRequest(`/api/v1/commission-settings/${id}`, { method: 'DELETE' });
}
