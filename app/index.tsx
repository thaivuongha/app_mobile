import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useAuthStore } from '@/src/stores/authStore';
import { setSessionExpiredCallback } from '@/src/api/client';

const SPLASH_DURATION = 1200; // ms hiển thị splash tối thiểu

export default function IndexScreen() {
  const router = useRouter();
  const { hasToken, isHydrated, hydrate, setHasToken } = useAuthStore();
  const [splashReady, setSplashReady] = useState(false);

  useEffect(() => {
    setSessionExpiredCallback(() => {
      setHasToken(false);
      router.replace('/(auth)/login');
    });
  }, [router, setHasToken]);

  useEffect(() => {
    hydrate();
    const timer = setTimeout(() => setSplashReady(true), SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated || !splashReady) return;
    if (hasToken) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isHydrated, hasToken, splashReady, router]);

  return (
    <View style={styles.container}>
      <MaskedView
        maskElement={<Text style={styles.logoText}>EMBOX</Text>}
      >
        <LinearGradient
          colors={['#9333EA', '#EF4444']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {/* Bản sao invisible — giúp gradient tự co đúng kích thước theo chữ */}
          <Text style={[styles.logoText, { opacity: 0 }]}>EMBOX</Text>
        </LinearGradient>
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 6,
  },
});
