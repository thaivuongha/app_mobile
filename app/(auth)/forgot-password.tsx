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
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { forgotPassword } from '@/src/api/auth';
import { ApiClientError } from '@/src/api/client';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = phoneNumber.trim();
    if (!trimmed) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(trimmed);
      Alert.alert(
        'Thành công',
        `${res.message} Mã có hiệu lực ${Math.round(res.expiresIn / 60)} phút. Vui lòng nhập mã từ SMS và mật khẩu mới ở màn hình tiếp theo.`,
        [{ text: 'OK', onPress: () => router.replace('/(auth)/reset-password') }]
      );
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Gửi mã thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text style={styles.label}>Số điện thoại đăng ký</Text>
        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="0901234567"
          keyboardType="phone-pad"
          autoCapitalize="none"
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Gửi mã đặt lại mật khẩu</Text>
          )}
        </TouchableOpacity>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  form: { padding: 16 },
  label: { marginBottom: 6, fontSize: 14, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2f95dc',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#2f95dc', fontSize: 14 },
});
