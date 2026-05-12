/**
 * Base URL của Backend API (không có trailing slash).
 * - Dev (Metro): dùng EXPO_PUBLIC_API_URL từ .env, không có thì localhost.
 * - Release (APK): env thường không nhúng → dùng luôn production URL.
 */
const fromEnv =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL;
const fallback = __DEV__
  ? 'https://api.embox.cloud'
  : 'https://api.embox.cloud';
export const API_BASE_URL = fromEnv || fallback;

/** const fallback = __DEV__
? 'http://localhost:3000'
: 'https://api.embox.cloud';
*/