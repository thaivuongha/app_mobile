/**
 * Base URL của Backend API (không có trailing slash).
 * Set EXPO_PUBLIC_API_URL trong .env hoặc khi chạy (expo start).
 */
export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  'http://localhost:3000';
