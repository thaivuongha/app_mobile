import { API_BASE_URL } from '@/src/config/env';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setTokens,
  clearTokens,
} from './tokenStorage';

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredCallback(callback: () => void) {
  onSessionExpired = callback;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearTokens();
    onSessionExpired?.();
    return null;
  }
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await clearTokens();
    onSessionExpired?.();
    return null;
  }
  const data = (await res.json()) as { accessToken: string; refreshToken?: string };
  // Lưu cả refreshToken mới (rotating refresh token — nếu không lưu, lần refresh tiếp theo sẽ thất bại)
  if (data.refreshToken) {
    await setTokens(data.accessToken, data.refreshToken);
  } else {
    await setAccessToken(data.accessToken);
  }
  return data.accessToken;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: object;
  query?: Record<string, string | number | undefined>;
  /** false = không gửi Bearer (dùng cho login/register/refresh) */
  auth?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, query, auth = true } = options;
  const url = new URL(path.startsWith('http') ? path : `${API_BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    });
  }

  const doRequest = async (token: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.ok) {
      const text = await res.text();
      if (!text) return undefined as T;
      return JSON.parse(text) as T;
    }

    let errBody: ApiError;
    try {
      errBody = (await res.json()) as ApiError;
    } catch {
      errBody = { statusCode: res.status, message: res.statusText };
    }
    throw new ApiClientError(
      errBody.statusCode,
      errBody.message || res.statusText,
      errBody.details
    );
  };

  let token: string | null = auth ? await getAccessToken() : null;
  try {
    return await doRequest(token);
  } catch (e) {
    if (e instanceof ApiClientError && e.statusCode === 401 && auth) {
      const newToken = await refreshAccessToken();
      if (newToken) return doRequest(newToken);
    }
    throw e;
  }
}
