import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function DevicesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '600', color: Colors.textPrimary },
        headerShadowVisible: false,
        headerBackTitle: '',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Danh sách thiết bị' }} />
      <Stack.Screen name="claim" options={{ title: 'Claim thiết bị mới' }} />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết thiết bị' }} />
    </Stack>
  );
}
