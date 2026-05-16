import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: '',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Đăng nhập', headerBackVisible: false }} />
      <Stack.Screen name="register" options={{ title: 'Đăng ký' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Quên mật khẩu' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Đặt lại mật khẩu' }} />
    </Stack>
  );
}
