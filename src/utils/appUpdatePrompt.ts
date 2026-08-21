import * as SecureStore from 'expo-secure-store';

/**
 * Nhớ version mà user đã bấm "Để sau" ở lời nhắc "gợi ý cập nhật" (soft update) — để
 * không hiện lại Alert mỗi lần mở app cho CÙNG một `latestVersion` (tránh spam).
 * Khi backend đổi `latestVersion` sang bản mới hơn, giá trị lưu không khớp nữa nên
 * lời nhắc sẽ tự hiện lại — không áp dụng cho "ép cập nhật" (luôn phải nhắc).
 */
const KEY = 'app_update_dismissed_version';

export async function getDismissedVersion(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function setDismissedVersion(version: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, version);
}
