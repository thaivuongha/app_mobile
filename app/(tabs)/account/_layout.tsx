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
      <Stack.Screen name="unlock-pin" options={{ title: 'PIN mở khóa' }} />
      <Stack.Screen name="wifi-config" options={{ title: 'Cấu hình WiFi thiết bị' }} />
      {/* Settings screens — mở trong account stack để back về đúng trang Cá Nhân */}
      <Stack.Screen name="commission" options={{ title: 'Lợi nhuận' }} />
      <Stack.Screen name="invoice" options={{ title: 'Cài đặt hóa đơn' }} />
      <Stack.Screen name="payment-methods" options={{ title: 'Phương thức thanh toán' }} />
      <Stack.Screen name="payment-method-form" options={{ title: 'Thông tin thanh toán' }} />
      <Stack.Screen name="delivery-addresses" options={{ title: 'Địa chỉ giao hàng' }} />
      <Stack.Screen name="delivery-address-form" options={{ title: 'Thêm / Sửa địa chỉ' }} />
      {/* Wallet screens */}
      <Stack.Screen name="wallet" options={{ title: 'Ví đối tác' }} />
      <Stack.Screen name="wallet-topup" options={{ title: 'Nạp cọc' }} />
      <Stack.Screen name="wallet-transfer" options={{ title: 'Chuyển vốn' }} />
      <Stack.Screen name="wallet-ledger" options={{ title: 'Lịch sử biến động' }} />
      <Stack.Screen name="wallet-payout-accounts" options={{ title: 'Tài khoản nhận hoa hồng' }} />
      <Stack.Screen name="wallet-payouts" options={{ title: 'Lịch sử chi trả' }} />
    </Stack>
  );
}
