import { Stack } from 'expo-router';

// Phiên nhân viên (đăng nhập bằng mã chia sẻ) — chỉ có đúng 1 màn hình xem thiết bị,
// không có tab bar, không vào được Shop/ví/doanh thu/claim/kiểm kho của chủ.
export default function StaffLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
