import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: '', headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="delivery-addresses" options={{ title: 'Địa chỉ giao hàng' }} />
      <Stack.Screen name="delivery-address-form" options={{ title: 'Thêm/Sửa địa chỉ' }} />
      <Stack.Screen name="invoice" options={{ title: 'Cài đặt hóa đơn' }} />
    </Stack>
  );
}
