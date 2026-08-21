import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { AppUpdateChecker } from '@/components/AppUpdateChecker';

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary:      '#FF815C',
    background:   '#FFFFFF',
    card:         '#FFFFFF',
    text:         '#0a0a0a',
    border:       '#E5E7EB',
    notification: '#FF815C',
  },
};

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Ẩn native splash ngay khi fonts sẵn sàng → index.tsx (gradient EMBOX) hiện ra liền
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {/* Chỉ check update ở bản build thật (dev/preview đọc từ Metro nên không cần) */}
        {!__DEV__ && <AppUpdateChecker />}
        <RootLayoutNav />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  return (
    <ThemeProvider value={AppTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
