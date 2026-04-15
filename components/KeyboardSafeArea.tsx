/**
 * KeyboardSafeArea — Wrapper chuẩn cho màn hình có TextInput.
 *
 * Dùng KeyboardAwareScrollView để:
 * 1. Tự động scroll đến ô input đang được focus (input nổi lên trên bàn phím).
 * 2. Hoạt động nhất quán trên cả iOS và Android.
 *
 * Dùng thay thế trực tiếp SafeAreaView trên các màn hình form.
 */

import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Colors } from '@/constants/Colors';

interface KeyboardSafeAreaProps {
  children: React.ReactNode;
  /** Style truyền thêm cho SafeAreaView ngoài cùng */
  style?: StyleProp<ViewStyle>;
  /** Style cho contentContainer của ScrollView bên trong */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Khoảng cách extra phía trên input khi scroll (default: 16) */
  extraScrollHeight?: number;
  /** Cho phép tap ra ngoài input để dismiss keyboard (default: "handled") */
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
}

export function KeyboardSafeArea({
  children,
  style,
  contentContainerStyle,
  extraScrollHeight = 16,
  keyboardShouldPersistTaps = 'handled',
}: KeyboardSafeAreaProps) {
  return (
    <SafeAreaView style={[styles.safe, style]}>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[styles.defaultContent, contentContainerStyle]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={extraScrollHeight}
        enableResetScrollToCoords={false}
      >
        {children}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  defaultContent: { flexGrow: 1 },
});
