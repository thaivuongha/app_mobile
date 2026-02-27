import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '@/src/stores/authStore';
import { setSessionExpiredCallback } from '@/src/api/client';

export default function IndexScreen() {
  const router = useRouter();
  const { hasToken, isHydrated, hydrate, setHasToken } = useAuthStore();

  useEffect(() => {
    setSessionExpiredCallback(() => {
      setHasToken(false);
      router.replace('/(auth)/login');
    });
  }, [router, setHasToken]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;
    if (hasToken) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isHydrated, hasToken, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
