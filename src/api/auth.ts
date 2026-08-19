import { setTokens, clearTokens } from './tokenStorage';
import { apiRequest } from './client';

export interface LoginBody {
  phoneNumber: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Đăng ký công khai nhận phoneNumber + email + password — Backend luôn tạo role OWNER,
// không nhận role từ client (tránh leo thang đặc quyền tự đăng ký ADMIN/STAFF).
// Email bắt buộc — dùng làm kênh gửi mã OTP xác thực tài khoản (verify-otp),
// KHÔNG dùng để đăng nhập (đăng nhập vẫn bằng SĐT).
export interface RegisterBody {
  phoneNumber: string;
  email: string;
  password: string;
}

// Chưa tạo tài khoản thật ngay lúc này (chỉ lưu "chờ xác thực") — id/role chỉ có sau khi
// verify-otp thành công, nên response ở đây không có các trường đó.
export interface RegisterResponse {
  phoneNumber: string;
  email: string;
  message: string;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export async function login(body: LoginBody): Promise<LoginResponse> {
  const data = await apiRequest<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body,
    auth: false,
  });
  await setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function register(body: RegisterBody): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>('/api/v1/auth/register', {
    method: 'POST',
    body,
    auth: false,
  });
}

// Xác thực OTP (gửi qua email lúc đăng ký) — thành công thì tự động đăng nhập
// (backend trả tokens giống login), nên lưu token luôn như login().
export async function verifyOtp(phoneNumber: string, otpCode: string): Promise<LoginResponse> {
  const data = await apiRequest<LoginResponse>('/api/v1/auth/verify-otp', {
    method: 'POST',
    body: { phoneNumber, otpCode },
    auth: false,
  });
  await setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function resendOtp(phoneNumber: string): Promise<{ message: string }> {
  return apiRequest('/api/v1/auth/resend-otp', {
    method: 'POST',
    body: { phoneNumber },
    auth: false,
  });
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<{ message: string }>('/api/v1/auth/logout', {
      method: 'POST',
      auth: true,
    });
  } finally {
    await clearTokens();
  }
}

export async function forgotPassword(phoneNumber: string): Promise<{ message: string; expiresIn: number }> {
  return apiRequest('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: { phoneNumber },
    auth: false,
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest('/api/v1/auth/reset-password', {
    method: 'POST',
    body: { token, newPassword },
    auth: false,
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  return apiRequest('/api/v1/auth/change-password', {
    method: 'PATCH',
    body: { currentPassword, newPassword },
    auth: true,
  });
}
