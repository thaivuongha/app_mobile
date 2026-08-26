import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type KeyboardEvent,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';

/** Dùng cho Modal — Android edge-to-edge không resize cửa sổ. */
export const keyboardAvoidingBehavior = 'padding' as const;

/** Khoảng trống giữa ô đang gõ và mép trên bàn phím. */
const KEYBOARD_GAP = 48;

function bottomPaddingOf(style: ScrollViewProps['contentContainerStyle']): number {
  const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
  if (!flat) return 16;
  if (typeof flat.paddingBottom === 'number') return flat.paddingBottom;
  if (typeof flat.padding === 'number') return flat.padding;
  return 16;
}

/**
 * Form cuộn khi bàn phím mở.
 * iOS: KeyboardAvoidingView padding.
 * Android + edge-to-edge: adjustResize không chạy — cộng đúng chiều cao IME
 * (không trừ nav inset, kẻo thiếu chỗ) rồi cuộn ô đang gõ lên trên bàn phím.
 */
export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  style,
  onScroll,
  ...rest
}: ScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef(0);
  const [keyboardPad, setKeyboardPad] = useState(0);

  const scrollFocusedIntoView = () => {
    const focused = TextInput.State.currentlyFocusedInput?.();
    if (!focused) return;
    focused.measureInWindow((_x, y, _w, h) => {
      const overlap = y + h + KEYBOARD_GAP - keyboardTop.current;
      if (overlap > 0) {
        scrollRef.current?.scrollTo({
          y: Math.max(0, scrollY.current + overlap),
          animated: true,
        });
      }
    });
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      keyboardTop.current = e.endCoordinates.screenY;
      if (Platform.OS === 'android') {
        // height = IME từ đáy màn hình. Không trừ safe-area: trừ sẽ thiếu chỗ, ô vẫn bị che.
        setKeyboardPad(Math.max(0, e.endCoordinates.height) + KEYBOARD_GAP);
      }
    };
    const onHide = () => setKeyboardPad(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || keyboardPad <= 0) return;
    const t = setTimeout(scrollFocusedIntoView, 100);
    return () => clearTimeout(t);
  }, [keyboardPad]);

  const baseBottom = bottomPaddingOf(contentContainerStyle);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? KEYBOARD_GAP : 0}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        nestedScrollEnabled
        {...rest}
        style={[styles.flex, style]}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: baseBottom + keyboardPad }]}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
          onScroll?.(e);
        }}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
