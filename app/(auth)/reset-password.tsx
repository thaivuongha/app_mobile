import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { resetPassword } from '@/src/api/auth';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; phone?: string }>();
  const [token, setToken] = useState(params.token ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token.trim()) {
      Alert.alert('Thiếu mã', 'Vui lòng dán mã đặt lại nhận được qua email');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Mật khẩu quá ngắn', 'Mật khẩu mới tối thiểu 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Không khớp', 'Xác nhận mật khẩu không khớp');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token.trim(), newPassword);
      Alert.alert('Thành công', 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Đặt lại mật khẩu thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar style="light" />
      <KeyboardAwareScrollView contentContainerStyle={styles.page}>
        <View style={styles.hero}>
          <View style={[styles.circle, styles.circleTopRight]} />
          <View style={[styles.circle, styles.circleBottomLeft]} />
          <View style={styles.iconBox}>
            <Ionicons name="lock-open-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Đặt lại mật khẩu</Text>
          <Text style={styles.heroSub}>Dán mã xác nhận từ email và nhập mật khẩu mới của bạn</Text>
        </View>

        <View style={styles.card}>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mã xác nhận (từ email)</Text>
            <InputField
              icon="barcode-outline"
              placeholder="Dán mã từ email vào đây"
              value={token}
              onChangeText={setToken}
              editable={!loading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mật khẩu mới</Text>
            <InputField
              icon="lock-closed-outline"
              placeholder="Tối thiểu 8 ký tự"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              showToggle
              showText={showNew}
              onToggle={() => setShowNew((v) => !v)}
              editable={!loading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Xác nhận mật khẩu mới</Text>
            <InputField
              icon="shield-checkmark-outline"
              placeholder="Nhập lại mật khẩu mới"
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
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Đặt lại mật khẩu</Text>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  page: { flexGrow: 1 },

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

  card: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 28,
    paddingTop: 32,
  },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, height: 52,
  },
  inputIconBox: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  inputToggle: { paddingLeft: 8 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, height: 54, marginTop: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.65 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
