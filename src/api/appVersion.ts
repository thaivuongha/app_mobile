import { apiRequest } from './client';

export interface AppVersionInfo {
  latestVersion: string | null;
  minVersion: string | null;
  androidUrl: string | null;
  iosUrl: string | null;
  message: string | null;
}

export const APP_VERSION_QUERY_KEY = ['app-version-check'] as const;

/** Public — không cần đăng nhập. Backend proxy + cache manifest từ nơi lưu trữ ngoài (S3). */
export function getAppVersionInfo(): Promise<AppVersionInfo> {
  return apiRequest<AppVersionInfo>('/api/v1/public/app-version', { auth: false });
}
