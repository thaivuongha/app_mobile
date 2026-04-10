import { apiRequest } from './client';

export interface User {
  id: string;
  phoneNumber: string;
  email: string | null;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  /** STANDARD (hoa hồng cố định) hoặc PREMIUM (theo % profitRate) */
  partnerLevel?: 'STANDARD' | 'PREMIUM';
  /** Tỷ lệ hoa hồng PREMIUM — dạng thập phân, VD: 0.2 = 20% */
  profitRate?: number | null;
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
