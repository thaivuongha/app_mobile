import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verifyOtp, resendOtp } from '@/src/api/auth';
import { ApiClientError } from '@/src/api/client';
import { useAuthStore } from '@/src/stores/authStore';
import { Colors } from '@/constants/Colors';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOtpScreen() {
  const router = useRouter();
  const setHasToken = useAuthStore((s) => s.setHasToken);
  const params = useLocalSearchParams<{ phoneNumber?: string; justSent?: string }>();
  const phoneNumber = params.phoneNumber ?? '';
  // Chỉ ép cooldown khi vừa gửi OTP từ màn Đăng ký. Nếu vào từ Đăng nhập (tài khoản có
  // sẵn nhưng chưa xác thực), mã cũ có thể đã hết hạn từ lâu → cho phép bấm "Gửi lại mã" ngay.
  const justSent = params.justSent !== '0';

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(justSent ? RESEND_COOLDOWN_SECONDS : 0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleVerify = async () => {
    // Ràng buộc chặt: chỉ chấp nhận đúng 6 chữ số, tránh gửi sai định dạng lên server.
    if (!/^\d{6}$/.test(otpCode)) {
      Alert.alert('Mã không hợp lệ', 'Vui lòng nhập đúng 6 chữ số nhận được qua email');
      return;
    }
    if (!phoneNumber) {
      Alert.alert('Lỗi', 'Thiếu số điện thoại. Vui lòng đăng ký lại.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phoneNumber, otpCode);
      setHasToken(true);
      Alert.alert('Xác thực thành công', 'Tài khoản của bạn đã sẵn sàng sử dụng.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Xác thực thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phoneNumber || cooldown > 0) return;
    setResending(true);
    try {
      const res = await resendOtp(phoneNumber);
      Alert.alert('Đã gửi lại', res.message);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Gửi lại mã thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setResending(false);
    }
  };

  // Gõ nhầm email lúc đăng ký? Chỉ cần quay lại màn Đăng ký và gửi lại với email đúng —
  // vì tài khoản thật CHƯA được tạo cho tới khi verify-otp thành công, gọi lại register()
  // sẽ ghi đè yêu cầu đăng ký cũ (kể cả email) một cách an toàn, không bị "kẹt" SĐT.
  const handleBackToRegister = () => {
    router.replace({
      pathname: '/(auth)/register',
      params: phoneNumber ? { phoneNumber } : undefined,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.circle, styles.circleTopRight]} />
          <View style={[styles.circle, styles.circleBottomLeft]} />
          <View style={styles.iconBox}>
            <Ionicons name="mail-open-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Xác thực tài khoản</Text>
          <Text style={styles.heroSub}>
            Nhập mã 6 chữ số vừa được gửi tới email bạn đã đăng ký
            {phoneNumber ? ` cho SĐT ${phoneNumber}` : ''}
          </Text>
        </View>

        {/* Form card */}
        <ScrollView style={styles.card} contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled">
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mã OTP (từ email)</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconBox}>
                <Ionicons name="keypad-outline" size={18} color={Colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                value={otpCode}
                onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
                autoFocus
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Xác thực</Text>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={handleResend}
            disabled={resending || cooldown > 0}
            activeOpacity={0.7}
          >
            {resending ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={[styles.resendText, cooldown > 0 && styles.resendTextDisabled]}>
                {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã OTP'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeEmailToggle}
            onPress={handleBackToRegister}
            activeOpacity={0.7}
          >
            <Text style={styles.changeEmailToggleText}>Nhập sai email? Quay lại đăng ký</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  flex: { flex: 1 },

  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 48,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    gap: 10,
  },
  circle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
  circleTopRight: { width: 160, height: 160, top: -50, right: -40 },
  circleBottomLeft: { width: 120, height: 120, bottom: -30, left: -20 },

  iconBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20 },

  card: { flex: 1, backgroundColor: Colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20 },
  cardContent: { paddingHorizontal: 28, paddingTop: 32 },

  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, height: 56,
  },
  inputIconBox: { marginRight: 10 },
  input: { flex: 1, fontSize: 20, fontWeight: '700', letterSpacing: 4, color: Colors.textPrimary },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, height: 54,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.65 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  resendBtn: { alignItems: 'center', justifyContent: 'center', marginTop: 20, height: 24 },
  resendText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  resendTextDisabled: { color: Colors.textMuted },

  changeEmailToggle: { alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  changeEmailToggleText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textDecorationLine: 'underline' },
});
