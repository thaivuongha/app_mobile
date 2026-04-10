import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { initTopup, getTopupStatus } from '@/src/api/wallet';
import type { TopupInitResponse } from '@/src/api/wallet';
import { Colors } from '@/constants/Colors';

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

const QUICK_AMOUNTS = [100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000];
const POLL_INTERVAL_MS = 4_000;

// ─── Countdown timer ───────────────────────────────────────────────────────────

function useCountdown(expiredAt: string | null): string {
  const [remaining, setRemaining] = useState('--:--');

  useEffect(() => {
    if (!expiredAt) return;
    const tick = () => {
      const diff = Math.max(0, new Date(expiredAt).getTime() - Date.now());
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiredAt]);

  return remaining;
}

// ─── QR view ──────────────────────────────────────────────────────────────────

type PollStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED';

function QRView({
  session,
  onExpired,
  onSuccess,
  onNewQR,
}: {
  session: TopupInitResponse;
  onExpired: () => void;
  onSuccess: () => void;
  onNewQR: () => void;
}) {
  const [pollStatus, setPollStatus] = useState<PollStatus>('PENDING');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdown = useCountdown(session.expiredAt);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    setPollStatus('PENDING');
    pollRef.current = setInterval(async () => {
      try {
        const res = await getTopupStatus(session.referenceCode);
        if (res.status === 'COMPLETED') {
          stopPoll();
          setPollStatus('COMPLETED');
          onSuccess();
        } else if (res.status === 'EXPIRED') {
          stopPoll();
          setPollStatus('EXPIRED');
          onExpired();
        }
      } catch {
        // silent — keep polling
      }
    }, POLL_INTERVAL_MS);
    return () => stopPoll();
  }, [session.referenceCode, stopPoll, onSuccess, onExpired]);

  // Auto-expire when countdown hits 00:00
  useEffect(() => {
    if (countdown === '00:00') {
      stopPoll();
      if (pollStatus === 'PENDING') setPollStatus('EXPIRED');
    }
  }, [countdown, pollStatus, stopPoll]);

  if (pollStatus === 'EXPIRED') {
    return (
      <View style={styles.expiredBox}>
        <Ionicons name="timer-outline" size={48} color={Colors.danger} />
        <Text style={styles.expiredTitle}>Mã QR đã hết hạn</Text>
        <Text style={styles.expiredSub}>Vui lòng tạo mã QR mới để tiếp tục nạp tiền.</Text>
        <TouchableOpacity style={styles.newQRBtn} onPress={onNewQR}>
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.newQRBtnText}>Tạo mã mới</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.qrContainer}>
      {/* Amount */}
      <View style={styles.amountBanner}>
        <Text style={styles.amountBannerLabel}>Số tiền nạp</Text>
        <Text style={styles.amountBannerValue}>{formatVND(session.amount)}</Text>
      </View>

      {/* QR Code image */}
      <View style={styles.qrWrapper}>
        {(() => {
          // Ưu tiên qrLink (URL ảnh trực tiếp từ VietQR)
          if (session.qrLink) {
            return (
              <Image
                source={{ uri: session.qrLink }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            );
          }
          // Fallback: qrCode base64
          if (session.qrCode) {
            const uri = session.qrCode.startsWith('data:')
              ? session.qrCode
              : `data:image/png;base64,${session.qrCode}`;
            return (
              <Image
                source={{ uri }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            );
          }
          // Không có QR — hiện placeholder + thông báo
          return (
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={80} color={Colors.textMuted} />
              <Text style={styles.qrPlaceholderText}>
                Chưa tạo được mã QR.{'\n'}Vui lòng thử lại.
              </Text>
            </View>
          );
        })()}
        {/* Polling spinner */}
        <View style={styles.pollBadge}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.pollText}>Đang chờ thanh toán...</Text>
        </View>
      </View>

      {/* Reference code */}
      <View style={styles.refRow}>
        <Text style={styles.refLabel}>Nội dung chuyển khoản</Text>
        <View style={styles.refCodeBox}>
          <Text style={styles.refCode} selectable>{session.referenceCode}</Text>
        </View>
        <Text style={styles.refNote}>
          Nhập chính xác nội dung này khi chuyển khoản để hệ thống tự nhận.
        </Text>
      </View>

      {/* Countdown */}
      <View style={[styles.countdownRow, countdown === '00:00' && styles.countdownRowExpired]}>
        <Ionicons
          name="timer-outline"
          size={14}
          color={countdown === '00:00' ? Colors.danger : Colors.textMuted}
        />
        <Text style={[styles.countdownText, countdown === '00:00' && styles.countdownTextExpired]}>
          {countdown === '00:00' ? 'Đã hết hạn' : `Hết hạn sau: ${countdown}`}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function WalletTopupScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [amountInput, setAmountInput] = useState('');
  const [session, setSession] = useState<TopupInitResponse | null>(null);
  const [inputError, setInputError] = useState('');

  const mutation = useMutation({
    mutationFn: (amount: number) => initTopup(amount),
    onSuccess: (data) => {
      setSession(data);
    },
    onError: (e: { message?: string }) => {
      Alert.alert('Lỗi', e.message ?? 'Không thể tạo mã QR. Thử lại.');
    },
  });

  const handleCreateQR = () => {
    const raw = amountInput.replace(/\D/g, '');
    const amount = parseInt(raw, 10);
    if (!raw || isNaN(amount) || amount <= 0) {
      setInputError('Vui lòng nhập số tiền hợp lệ (> 0đ)');
      return;
    }
    setInputError('');
    mutation.mutate(amount);
  };

  const handleSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    Alert.alert(
      'Nạp cọc thành công',
      `+${formatVND(session!.amount)} đã được cộng vào ví vận hành.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }, [queryClient, router, session]);

  const handleExpired = useCallback(() => {
    // QRView tự hiển thị expired state
  }, []);

  const handleNewQR = () => {
    setSession(null);
    setAmountInput('');
  };

  const setQuickAmount = (v: number) => {
    setAmountInput(v.toLocaleString('vi-VN'));
    setInputError('');
  };

  const handleAmountChange = (text: string) => {
    // Only digits
    const digits = text.replace(/\D/g, '');
    if (digits === '') {
      setAmountInput('');
    } else {
      setAmountInput(parseInt(digits, 10).toLocaleString('vi-VN'));
    }
    setInputError('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {session ? (
          <QRView
            session={session}
            onSuccess={handleSuccess}
            onExpired={handleExpired}
            onNewQR={handleNewQR}
          />
        ) : (
          <>
            {/* Info box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>
                Nạp tiền vào ví vận hành để đặt hàng B2B. Số tiền bị giam khi đặt hàng,
                hoàn lại sau khi giao hàng thành công.
              </Text>
            </View>

            {/* Amount input */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nhập số tiền nạp</Text>
              <View style={[styles.inputRow, inputError ? styles.inputRowError : undefined]}>
                <Text style={styles.currencySymbol}>₫</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  value={amountInput}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>
              {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}

              {/* Quick amounts */}
              <View style={styles.quickGrid}>
                {QUICK_AMOUNTS.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={styles.quickChip}
                    onPress={() => setQuickAmount(v)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickChipText}>
                      {v >= 1_000_000
                        ? `${v / 1_000_000}tr`
                        : `${v / 1_000}k`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.createBtn, mutation.isPending && styles.createBtnDisabled]}
              onPress={handleCreateQR}
              disabled={mutation.isPending}
              activeOpacity={0.85}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="qr-code-outline" size={20} color="#fff" />
                  <Text style={styles.createBtnText}>Tạo mã QR</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 32 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 54,
    backgroundColor: Colors.background,
  },
  inputRowError: { borderColor: Colors.danger },
  currencySymbol: { fontSize: 20, fontWeight: '700', color: Colors.textMuted, marginRight: 6 },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  errorText: { fontSize: 12, color: Colors.danger, marginTop: 6 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  quickChipText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createBtnDisabled: { opacity: 0.7 },
  createBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // QR view
  qrContainer: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 16,
  },
  amountBanner: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    alignSelf: 'stretch',
  },
  amountBannerLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  amountBannerValue: { fontSize: 24, fontWeight: '800', color: Colors.primary },

  qrWrapper: { position: 'relative', alignItems: 'center' },
  qrImage: { width: 220, height: 220, borderRadius: 8 },
  qrPlaceholder: {
    width: 220,
    height: 220,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qrPlaceholderText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  pollBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  pollText: { fontSize: 12, color: Colors.textMuted },

  refRow: { alignSelf: 'stretch', gap: 6 },
  refLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  refCodeBox: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refCode: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  refNote: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', lineHeight: 16 },

  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
  },
  countdownRowExpired: {},
  countdownText: { fontSize: 12, color: Colors.textMuted },
  countdownTextExpired: { color: Colors.danger, fontWeight: '600' },

  // Expired state
  expiredBox: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expiredTitle: { fontSize: 18, fontWeight: '700', color: Colors.danger },
  expiredSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  newQRBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  newQRBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
