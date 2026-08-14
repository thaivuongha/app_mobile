import { apiRequest } from './client';

export interface User {
  id: string;
  phoneNumber: string;
  email: string | null;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  /**
   * Hệ số nhân hoa hồng (K). Mặc định 1.0 (= 100%).
   * Khoảng cho phép: 0.0 – 3.0. Owner tự chỉnh qua PATCH /users/me/price-multiplier.
   * finalPrice = ceil(price + commissionValue × K × 1.05, 1000)
   */
  priceMultiplier: number;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  identityCard: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getMe(): Promise<User> {
  return apiRequest<User>('/api/v1/users/me');
}

export function updateMe(body: { email?: string }): Promise<User> {
  return apiRequest<User>('/api/v1/users/me', { method: 'PATCH', body });
}

export function getMyProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/v1/user-profiles/me');
}

export function updateMyProfile(body: {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: string;
  identityCard?: string;
  address?: string;
}): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/v1/user-profiles/me', {
    method: 'PATCH',
    body,
  });
}

// ─── Owner Unlock PIN ─────────────────────────────────────────────────────────

export interface UnlockPinStatus {
  isSet: boolean;
}

export function getUnlockPinStatus(): Promise<UnlockPinStatus> {
  return apiRequest<UnlockPinStatus>('/api/v1/users/me/unlock-pin');
}

export function setUnlockPin(pin: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/v1/users/me/unlock-pin', {
    method: 'PUT',
    body: { pin },
  });
}

export function removeUnlockPin(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/v1/users/me/unlock-pin', {
    method: 'DELETE',
  });
}

// ─── Price Multiplier (K) ─────────────────────────────────────────────────────

/**
 * Cập nhật hệ số hoa hồng (K) của owner.
 * @param priceMultiplier Giá trị từ 0.0 đến 3.0 (VD: 1.2 = 120%)
 * Backend trả về { id, priceMultiplier } — dùng getMe() để lấy full user sau khi cập nhật.
 */
export function updatePriceMultiplier(
  priceMultiplier: number,
): Promise<{ id: string; priceMultiplier: number }> {
  return apiRequest<{ id: string; priceMultiplier: number }>(
    '/api/v1/users/me/price-multiplier',
    { method: 'PATCH', body: { priceMultiplier } },
  );
}
