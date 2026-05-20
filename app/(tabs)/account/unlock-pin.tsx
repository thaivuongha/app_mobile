import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getUnlockPinStatus,
  removeUnlockPin,
  setUnlockPin,
} from '@/src/api/users';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

// ─── Kiểu chế độ màn hình ─────────────────────────────────────────────────────
type Mode = 'idle' | 'entering' | 'confirming';

const PIN_LENGTH = 6;

// ─── Hiển thị 6 ô số (rõ để nhập) ───────────────────────────────────────────
function PinDots({ pin, shake }: { pin: string; shake: boolean }) {
  return (
    <View style={[styles.dotsRow, shake && styles.dotsShake]}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i < pin.length ? styles.dotFilled : styles.dotEmpty]}
        >
          {i < pin.length && (
            <Text style={styles.dotDigit}>{pin[i]}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Nút bàn phím ─────────────────────────────────────────────────────────────
function PadKey({
  label,
  onPress,
  variant = 'number',
}: {
  label: string | React.ReactNode;
  onPress: () => void;
  variant?: 'number' | 'action' | 'blank';
}) {
  if (variant === 'blank') return <View style={styles.padKey} />;
  return (
    <TouchableOpacity
      style={[styles.padKey, variant === 'action' && styles.padKeyAction]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {typeof label === 'string' ? (
        <Text style={[styles.padKeyText, variant === 'action' && styles.padKeyActionText]}>
          {label}
        </Text>
      ) : (
        label
      )}
    </TouchableOpacity>
  );
}

// ─── Bàn phím số ──────────────────────────────────────────────────────────────
function NumPad({
  pin,
  onPress,
  onDelete,
  disabled,
}: {
  pin: string;
  onPress: (digit: string) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  return (
    <View style={[styles.pad, disabled && styles.padDisabled]} pointerEvents={disabled ? 'none' : 'auto'}>
      {rows.map((row) => (
        <View key={row.join('')} style={styles.padRow}>
          {row.map((d) => (
            <PadKey key={d} label={d} onPress={() => onPress(d)} />
          ))}
        </View>
      ))}
      {/* Hàng cuối: [trống] [0] [xóa] */}
      <View style={styles.padRow}>
        <PadKey label="" onPress={() => {}} variant="blank" />
        <PadKey label="0" onPress={() => onPress('0')} />
        <PadKey
          label={<Ionicons name="backspace-outline" size={22} color={Colors.textSecondary} />}
          onPress={onDelete}
          variant="action"
        />
      </View>
    </View>
  );
}

// ─── Màn hình chính ───────────────────────────────────────────────────────────
export default function UnlockPinScreen() {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>('idle');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [shake, setShake] = useState(false);

  // ── Trạng thái PIN từ server ──
  const statusQuery = useQuery({
    queryKey: ['unlock-pin-status'],
    queryFn: getUnlockPinStatus,
  });
  const isSet = statusQuery.data?.isSet ?? false;

  // ── Mutation cài/đổi PIN ──
  const setPinMutation = useMutation({
    mutationFn: (p: string) => setUnlockPin(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unlock-pin-status'] });
      resetToIdle();
      Alert.alert('Thành công', isSet ? 'Đã đổi PIN mở khóa.' : 'Đã cài đặt PIN mở khóa.');
    },
    onError: (e) => {
      const msg = e instanceof ApiClientError ? e.message : 'Lỗi khi lưu PIN';
      Alert.alert('Lỗi', msg);
      resetToIdle();
    },
  });

  // ── Mutation xóa PIN ──
  const removePinMutation = useMutation({
    mutationFn: removeUnlockPin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unlock-pin-status'] });
      Alert.alert('Đã xóa', 'PIN mở khóa đã được xóa.');
    },
    onError: (e) => {
      const msg = e instanceof ApiClientError ? e.message : 'Lỗi khi xóa PIN';
      Alert.alert('Lỗi', msg);
    },
  });

  const isMutating = setPinMutation.isPending || removePinMutation.isPending;

  // ── Reset về màn idle ──
  const resetToIdle = useCallback(() => {
    setMode('idle');
    setPin('');
    setFirstPin('');
    setShake(false);
  }, []);

  // ── Trigger rung khi PIN sai ──
  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setPin('');
    }, 500);
  }, []);

  // ── Nhập chữ số ──
  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length >= PIN_LENGTH) return;
      const next = pin + digit;
      setPin(next);

      if (next.length < PIN_LENGTH) return;

      // Đủ 6 số
      if (mode === 'entering') {
        setFirstPin(next);
        setPin('');
        setMode('confirming');
      } else if (mode === 'confirming') {
        if (next === firstPin) {
          setPinMutation.mutate(next);
        } else {
          triggerShake();
          setTimeout(() => {
            // Quay về bước nhập lại
            setMode('entering');
            setFirstPin('');
          }, 500);
        }
      }
    },
    [pin, mode, firstPin, setPinMutation, triggerShake],
  );

  // ── Xóa ký tự cuối ──
  const handleDelete = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  // ── Xóa PIN hiện tại ──
  const handleRemove = useCallback(() => {
    Alert.alert(
      'Xóa PIN mở khóa',
      'Sau khi xóa, thiết bị sẽ không thể mở khóa bằng PIN cho đến khi bạn cài lại.\n\nTiếp tục?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa PIN',
          style: 'destructive',
          onPress: () => removePinMutation.mutate(),
        },
      ],
    );
  }, [removePinMutation]);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (statusQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Màn nhập PIN (entering / confirming) ─────────────────────────────────
  if (mode === 'entering' || mode === 'confirming') {
    const title = mode === 'entering' ? 'Nhập PIN mới' : 'Xác nhận PIN';
    const subtitle =
      mode === 'entering'
        ? 'Nhập 6 chữ số PIN mở khóa của bạn'
        : 'Nhập lại PIN để xác nhận';

    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.padScreen}>
          {/* Tiêu đề */}
          <View style={styles.padHeader}>
            <View style={styles.pinIconBox}>
              <Ionicons name="keypad" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.padTitle}>{title}</Text>
            <Text style={styles.padSubtitle}>{subtitle}</Text>
          </View>

          {/* Dots */}
          <PinDots pin={pin} shake={shake} />

          {/* Bàn phím */}
          <NumPad
            pin={pin}
            onPress={handleDigit}
            onDelete={handleDelete}
            disabled={isMutating}
          />

          {/* Nút hủy */}
          <TouchableOpacity style={styles.cancelBtn} onPress={resetToIdle}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>

          {/* Loading overlay khi đang lưu */}
          {isMutating && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ─── Màn idle (xem trạng thái + nút hành động) ────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Trạng thái PIN */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIconBox, isSet ? styles.statusIconSet : styles.statusIconUnset]}>
            <Ionicons
              name={isSet ? 'shield-checkmark' : 'shield-outline'}
              size={32}
              color={isSet ? Colors.success : Colors.textMuted}
            />
          </View>
          <Text style={styles.statusTitle}>
            {isSet ? 'PIN đã được cài đặt' : 'Chưa có PIN mở khóa'}
          </Text>
          <Text style={styles.statusSubtitle}>
            {isSet
              ? 'Thiết bị dùng mã PIN này để mở khóa mà không cần thanh toán.'
              : 'Cài đặt PIN 6 chữ số để chủ máy mở khóa trực tiếp trên thiết bị.'}
          </Text>
        </View>

        {/* Hướng dẫn */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>
              PIN dùng chung cho <Text style={styles.infoBold}>tất cả thiết bị</Text> trong tài khoản.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="keypad-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>
              Gồm đúng <Text style={styles.infoBold}>6 chữ số 0–9</Text>. Không dùng chữ cái hay ký tự đặc biệt.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>
              PIN được mã hóa an toàn. Không lưu dưới dạng thường.
            </Text>
          </View>
        </View>

        {/* Nút hành động */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, isMutating && styles.btnDisabled]}
            onPress={() => {
              setPin('');
              setFirstPin('');
              setMode('entering');
            }}
            disabled={isMutating}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isSet ? 'refresh-outline' : 'add-circle-outline'}
              size={20}
              color="#fff"
            />
            <Text style={styles.primaryBtnText}>
              {isSet ? 'Đổi PIN' : 'Cài đặt PIN'}
            </Text>
          </TouchableOpacity>

          {isSet && (
            <TouchableOpacity
              style={[styles.dangerBtn, isMutating && styles.btnDisabled]}
              onPress={handleRemove}
              disabled={isMutating}
              activeOpacity={0.8}
            >
              {removePinMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.danger} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                  <Text style={styles.dangerBtnText}>Xóa PIN</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Idle screen ──
  statusCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  statusIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statusIconSet: { backgroundColor: Colors.successLight },
  statusIconUnset: { backgroundColor: Colors.border },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  infoCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  infoBold: { fontWeight: '700', color: Colors.textPrimary },

  actions: { gap: 12 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  dangerBtnText: { color: Colors.danger, fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },

  // ── PIN pad screen ──
  padScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  padHeader: { alignItems: 'center', marginBottom: 36 },
  pinIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  padTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  padSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 40,
  },
  dotsShake: {
    // Animated shake — handled by opacity flash since RN doesn't have CSS shake
    opacity: 0.4,
  },
  dot: {
    width: 44,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotFilled: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dotEmpty: {
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  dotDigit: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Pad grid
  pad: { width: '100%', maxWidth: 300, alignSelf: 'center' },
  padDisabled: { opacity: 0.4 },
  padRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  padKey: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  padKeyAction: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  padKeyText: { fontSize: 26, fontWeight: '400', color: Colors.textPrimary },
  padKeyActionText: { fontSize: 18, color: Colors.textSecondary },

  // Cancel
  cancelBtn: { marginTop: 28, paddingVertical: 10, paddingHorizontal: 32 },
  cancelText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
});
