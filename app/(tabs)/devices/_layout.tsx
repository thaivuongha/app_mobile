import { useCallback, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Stack, useNavigation, useRouter } from 'expo-router';
import { BackHandler, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

// Hai màn này được mở từ tab Thiết bị hoặc Đối tác. Stack ẩn "devices" luôn
// giữ màn danh sách (và màn đã mở trước đó) ở phía dưới, nên back trong stack
// sẽ nhảy sang Danh sách thiết bị hoặc Chia sẻ. Luôn về tab vừa mở.
function BackToDevicesButton() {
  const router = useRouter();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const goBack = useCallback(() => {
    const parent = navigation.getParent();
    if (parent?.canGoBack()) {
      parent.goBack();
      return;
    }
    router.replace('/(tabs)');
  }, [navigation, router]);

  useEffect(() => {
    if (!isFocused) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack, isFocused]);

  return (
    <TouchableOpacity
      onPress={goBack}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ marginLeft: 4, padding: 4 }}
      accessibilityLabel="Quay lại"
    >
      <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
    </TouchableOpacity>
  );
}

export default function DevicesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
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
          gestureEnabled: false,
          headerLeft: () => <BackToDevicesButton />,
        }}
      />
      <Stack.Screen name="[id]" options={{ title: 'Chi tiết thiết bị' }} />
      <Stack.Screen
        name="share"
        options={{
          title: 'Chia sẻ thiết bị',
          headerBackVisible: false,
          gestureEnabled: false,
          headerLeft: () => <BackToDevicesButton />,
        }}
      />
    </Stack>
  );
}
