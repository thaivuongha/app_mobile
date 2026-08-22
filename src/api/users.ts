import { apiRequest } from './client';

export interface User {
  id: string;
  phoneNumber: string;
  email: string | null;
  /** Email đang chờ OTP xác nhận (chưa ghi vào User.email). */
  pendingEmail?: string | null;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  /**
   * Hệ số nhân hoa hồng (K). Mặc định 1.0 (= 100%).
   * Backend trả K đã clamp theo COMMISSION_PERCENT_MIN/MAX.
   * Owner tự chỉnh qua PATCH /users/me/price-multiplier.
   * finalPrice = ceil(price + commissionValue × K × 1.05, 1000)
   */
  priceMultiplier: number;
  /** Giới hạn tỷ lệ % (khớp UI). Fallback 0 nếu backend cũ chưa trả field. */
  commissionPercentMin?: number;
  /** Giới hạn tỷ lệ % (khớp UI). Fallback 300 nếu backend cũ chưa trả field. */
  commissionPercentMax?: number;
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
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getMe(): Promise<User> {
  return apiRequest<User>('/api/v1/users/me');
}

export function requestEmailChange(
  email: string,
  currentPassword: string,
): Promise<{ email: string; expiresIn: number; message: string }> {
  return apiRequest('/api/v1/users/me/email/change', {
    method: 'POST',
    body: { email, currentPassword },
  });
}

export function resendEmailChangeOtp(): Promise<{
  email: string;
  expiresIn: number;
  message: string;
}> {
  return apiRequest('/api/v1/users/me/email/resend', { method: 'POST' });
}

export function verifyEmailChange(
  otpCode: string,
): Promise<{ id: string; email: string; message: string }> {
  return apiRequest('/api/v1/users/me/email/verify', {
    method: 'POST',
    body: { otpCode },
  });
}

export function cancelEmailChange(): Promise<{ message: string }> {
  return apiRequest('/api/v1/users/me/email/change', { method: 'DELETE' });
}

export function getMyProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/v1/user-profiles/me');
}

export function updateMyProfile(body: {
  firstName?: string;
  lastName?: string | null;
  avatar?: string;
  dateOfBirth?: string;
  gender?: string;
  identityCard?: string;
  address?: string;
  contactPhone?: string;
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
 * @param priceMultiplier Giá trị K = percent/100 (VD: 1.2 = 120%). Range do backend cấu hình.
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
