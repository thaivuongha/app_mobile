import { useRouter, useLocalSearchParams, Link } from 'expo-router';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { register } from '@/src/api/auth';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  editable,
  showToggle,
  onToggle,
  showText,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: any;
  secureTextEntry?: boolean;
  editable?: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
  showText?: boolean;
}) {
  return (
    <View style={styles.inputWrapper}>
      <View style={styles.inputIconBox}>
        <Ionicons name={icon} size={18} color={Colors.textMuted} />
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry && !showText}
        autoCapitalize="none"
        editable={editable}
      />
      {showToggle && (
        <TouchableOpacity onPress={onToggle} style={styles.inputToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={showText ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  // Prefill khi quay lại từ verify-otp (vd. gõ nhầm email) — đỡ phải gõ lại SĐT.
  const params = useLocalSearchParams<{ phoneNumber?: string }>();
  const [phoneNumber, setPhoneNumber] = useState(params.phoneNumber ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedPhone = phoneNumber.trim();
    const trimmedEmail = email.trim();
    if (!trimmedPhone || !trimmedEmail || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại, email và mật khẩu');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert('Email không hợp lệ', 'Vui lòng nhập đúng định dạng email (vd: ten@example.com)');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Mật khẩu quá ngắn', 'Mật khẩu tối thiểu 8 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Không khớp', 'Mật khẩu xác nhận không khớp');
      return;
    }
    setLoading(true);
    try {
      await register({ phoneNumber: trimmedPhone, email: trimmedEmail, password });
      router.replace({
        pathname: '/(auth)/verify-otp',
        // justSent=1 (mặc định): OTP vừa được gửi lúc đăng ký → cooldown 60s cho nút "Gửi lại mã".
        params: { phoneNumber: trimmedPhone, justSent: '1' },
      });
    } catch (e) {
      if (e instanceof ApiClientError && e.statusCode === 409) {
        // 409 có 2 lý do khác nhau: (1) SĐT đã có tài khoản THẬT (đã xác thực xong), hoặc
        // (2) email đã được dùng cho một tài khoản khác (1 email = 1 tài khoản). Hiển thị
        // đúng message backend trả về thay vì hard-code — tránh báo sai lý do (vd. báo
        // "SĐT đã đăng ký" trong khi thực ra là email bị trùng).
        Alert.alert('Không thể đăng ký', e.message, [
          { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') },
          { text: 'Đóng', style: 'cancel' },
        ]);
        return;
      }
      const message = e instanceof ApiClientError ? e.message : 'Đăng ký thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.circle, styles.circleTopRight]} />
          <View style={[styles.circle, styles.circleBottomLeft]} />
          <View style={styles.logoWrapper}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoLetter}>E</Text>
            </View>
            <Text style={styles.logoName}>EMBOX</Text>
          </View>
          <Text style={styles.heroTitle}>Tạo tài khoản</Text>
        </View>

        {/* Form card */}
        <ScrollView style={styles.card} contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Số điện thoại</Text>
            <InputField
              icon="call-outline"
              placeholder="0901 234 567"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email xác thực</Text>
            <InputField
              icon="mail-outline"
              placeholder="ten@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mật khẩu</Text>
            <InputField
              icon="lock-closed-outline"
              placeholder="Tối thiểu 8 ký tự"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              showToggle
              showText={showPwd}
              onToggle={() => setShowPwd((v) => !v)}
              editable={!loading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Xác nhận mật khẩu</Text>
            <InputField
              icon="shield-checkmark-outline"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              showToggle
              showText={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.registerBtnText}>Đăng ký</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc</Text>
            <View style={styles.dividerLine} />
          </View>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.loginBtn} activeOpacity={0.8}>
              <Text style={styles.loginBtnText}>Đã có tài khoản? Đăng nhập</Text>
            </TouchableOpacity>
          </Link>
          <View style={{ height: 16 }} />
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
    paddingTop: 24,
    paddingBottom: 44,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
  },
  circle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
  circleTopRight: { width: 160, height: 160, top: -50, right: -40 },
  circleBottomLeft: { width: 100, height: 100, bottom: -20, left: -20 },

  logoWrapper: { alignItems: 'center', gap: 6, marginBottom: 16 },
  logoBadge: {
    width: 52, height: 52, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoLetter: { fontSize: 28, fontWeight: '800', color: '#fff' },
  logoName: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 4 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },

  card: { flex: 1, backgroundColor: Colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20 },
  cardContent: { paddingHorizontal: 28, paddingTop: 28 },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, letterSpacing: 0.2 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, height: 52,
  },
  inputIconBox: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary, height: '100%' },
  inputToggle: { paddingLeft: 8 },

  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, height: 54,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.65 },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, color: Colors.textMuted },

  loginBtn: {
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  loginBtnText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
});
