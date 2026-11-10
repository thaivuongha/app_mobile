import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

function BackToDevicesButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)');
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ marginLeft: 4, padding: 4 }}
      accessibilityLabel="Quay lại"
    >
      <Ionicons name="chevron-back" size={26} color={Colors.primary} />
    </TouchableOpacity>
  );
}

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
      <Stack.Screen
        name="claim"
        options={{
          title: 'Thêm thiết bị mới',
          headerBackVisible: false,
          headerLeft: () => <BackToDevicesButton />,
        }}
      />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết thiết bị' }} />
      <Stack.Screen
        name="share"
        options={{
          title: 'Chia sẻ thiết bị',
          headerBackVisible: false,
          headerLeft: () => <BackToDevicesButton />,
        }}
      />
    </Stack>
  );
}
