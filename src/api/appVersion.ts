import { apiRequest } from './client';

export interface AppVersionInfo {
  latestVersion: string | null;
  minVersion: string | null;
  androidUrl: string | null;
  iosUrl: string | null;
  message: string | null;
}

/** Public — không cần đăng nhập. Backend proxy + cache manifest từ nơi lưu trữ ngoài (S3). */
export function getAppVersionInfo(): Promise<AppVersionInfo> {
  return apiRequest<AppVersionInfo>('/api/v1/public/app-version', { auth: false });
}
