import * as SecureStore from 'expo-secure-store';

const KEY_ACCESS = 'auth_access_token';
const KEY_REFRESH = 'auth_refresh_token';

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_REFRESH);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, access),
    SecureStore.setItemAsync(KEY_REFRESH, refresh),
  ]);
}

export async function setAccessToken(access: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_ACCESS, access);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ACCESS),
    SecureStore.deleteItemAsync(KEY_REFRESH),
  ]);
}
