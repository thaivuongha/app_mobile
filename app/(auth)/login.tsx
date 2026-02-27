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
import { login } from '@/src/api/auth';
import { ApiClientError } from '@/src/api/client';
import { useAuthStore } from '@/src/stores/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const setHasToken = useAuthStore((s) => s.setHasToken);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmed = phoneNumber.trim();
    if (!trimmed || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại và mật khẩu');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Lỗi', 'Mật khẩu tối thiểu 8 ký tự');
      return;
    }
    setLoading(true);
    try {
      await login({ phoneNumber: trimmed, password });
      setHasToken(true);
      router.replace('/(tabs)');
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Đăng nhập thất bại';
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
        <Text style={styles.label}>Số điện thoại</Text>
        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="0901234567"
          keyboardType="phone-pad"
          autoCapitalize="none"
          editable={!loading}
        />
        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Mật khẩu (tối thiểu 8 ký tự)"
          secureTextEntry
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>
        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Quên mật khẩu?</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Chưa có tài khoản? Đăng ký</Text>
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
