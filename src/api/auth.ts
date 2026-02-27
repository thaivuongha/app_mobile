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

export interface RegisterBody {
  phoneNumber: string;
  password: string;
  role?: 'ADMIN' | 'OWNER' | 'STAFF';
}

export interface RegisterResponse {
  id: string;
  phoneNumber: string;
  role: string;
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
