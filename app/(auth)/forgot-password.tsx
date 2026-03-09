import { useRouter, Link } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { forgotPassword } from '@/src/api/auth';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = phoneNumber.trim();
    if (!trimmed) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(trimmed);
      Alert.alert(
        'Đã gửi mã',
        `${res.message} Mã có hiệu lực ${Math.round(res.expiresIn / 60)} phút. Vui lòng nhập mã từ SMS ở bước tiếp theo.`,
        [{ text: 'OK', onPress: () => router.replace('/(auth)/reset-password') }],
      );
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Gửi mã thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.circle, styles.circleTopRight]} />
          <View style={[styles.circle, styles.circleBottomLeft]} />
          <View style={styles.iconBox}>
            <Ionicons name="key-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Quên mật khẩu?</Text>
          <Text style={styles.heroSub}>
            Nhập số điện thoại đã đăng ký để nhận mã đặt lại qua SMS
          </Text>
        </View>

        {/* Form card */}
        <ScrollView style={styles.card} contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled">
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Số điện thoại đăng ký</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconBox}>
                <Ionicons name="call-outline" size={18} color={Colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="0901 234 567"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Gửi mã đặt lại mật khẩu</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc</Text>
            <View style={styles.dividerLine} />
          </View>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.backBtn} activeOpacity={0.8}>
              <Ionicons name="arrow-back-outline" size={16} color={Colors.primary} />
              <Text style={styles.backBtnText}>Quay lại đăng nhập</Text>
            </TouchableOpacity>
          </Link>
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
    paddingHorizontal: 14, height: 52,
  },
  inputIconBox: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, height: 54,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.65 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, color: Colors.textMuted },

  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, height: 52 },
  backBtnText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
});
