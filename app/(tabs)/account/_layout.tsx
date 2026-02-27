import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function MeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '600', color: Colors.textPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="change-password" options={{ title: 'Đổi mật khẩu' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Chỉnh sửa hồ sơ' }} />
      <Stack.Screen name="devices" options={{ title: 'Danh sách thiết bị' }} />
    </Stack>
  );
}
