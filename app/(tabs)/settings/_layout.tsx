import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="delivery-addresses" options={{ title: 'Địa chỉ giao hàng' }} />
      <Stack.Screen name="delivery-address-form" options={{ title: 'Thêm/Sửa địa chỉ' }} />
      <Stack.Screen name="payment-methods" options={{ title: 'Phương thức thanh toán' }} />
      <Stack.Screen name="payment-method-form" options={{ title: 'Thông tin thanh toán' }} />
      <Stack.Screen name="invoice" options={{ title: 'Cài đặt hóa đơn' }} />
      <Stack.Screen name="commission" options={{ title: 'Lợi nhuận' }} />
    </Stack>
  );
}
