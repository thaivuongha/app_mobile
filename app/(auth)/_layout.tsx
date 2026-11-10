import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '600', color: Colors.textPrimary },
        headerBackTitle: '',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Đăng ký' }} />
      <Stack.Screen name="verify-otp" options={{ title: 'Xác thực OTP', headerBackVisible: false }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Quên mật khẩu' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Đặt lại mật khẩu' }} />
      <Stack.Screen name="staff-code" options={{ title: 'Đăng nhập mã chia sẻ' }} />
    </Stack>
  );
}
