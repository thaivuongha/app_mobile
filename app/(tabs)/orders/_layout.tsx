import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function OrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '600', color: Colors.textPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Đơn hàng' }} />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết đơn' }} />
    </Stack>
  );
}
