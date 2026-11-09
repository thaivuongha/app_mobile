import * as SecureStore from 'expo-secure-store';

const KEY_ACCESS = 'auth_access_token';
const KEY_REFRESH = 'auth_refresh_token';
// 'owner' = tài khoản chủ (login SĐT+mật khẩu); 'staff' = phiên xem-thôi, đăng nhập
// bằng mã chia sẻ của chủ (xem src/api/staffAuth.ts). Dùng để app/index.tsx biết
// điều hướng vào (tabs) hay (staff).
const KEY_ROLE = 'auth_role';

export type SessionRole = 'owner' | 'staff';

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_REFRESH);
}

export async function getSessionRole(): Promise<SessionRole | null> {
  const value = await SecureStore.getItemAsync(KEY_ROLE);
  return value === 'owner' || value === 'staff' ? value : null;
}

/** Owner đăng nhập — có cả access + refresh token (refresh xoay vòng). */
export async function setTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, access),
    SecureStore.setItemAsync(KEY_REFRESH, refresh),
    SecureStore.setItemAsync(KEY_ROLE, 'owner'),
  ]);
}

export async function setAccessToken(access: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_ACCESS, access);
}

/**
 * Nhân viên redeem mã chia sẻ — chỉ có access token, KHÔNG có refresh token.
 * Hệ quả: khi token hết hạn hoặc bị thu hồi (owner xóa đúng mã này), lần gọi API kế tiếp
 * nhận 401 → apiRequest cố refresh → không có refreshToken → tự đăng xuất về login.
 * Đúng hành vi mong muốn, không cần xử lý đặc biệt trong api/client.ts.
 */
export async function setStaffAccessToken(access: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, access),
    SecureStore.deleteItemAsync(KEY_REFRESH),
    SecureStore.setItemAsync(KEY_ROLE, 'staff'),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ACCESS),
    SecureStore.deleteItemAsync(KEY_REFRESH),
    SecureStore.deleteItemAsync(KEY_ROLE),
  ]);
}
