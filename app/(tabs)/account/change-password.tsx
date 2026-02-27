import { useRouter } from 'expo-router';
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
import { changePassword } from '@/src/api/auth';
import { ApiClientError } from '@/src/api/client';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Lỗi', 'Mật khẩu mới tối thiểu 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Xác nhận mật khẩu không khớp');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Thành công', 'Đổi mật khẩu thành công.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Đổi mật khẩu thất bại';
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
        <Text style={styles.label}>Mật khẩu hiện tại</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Nhập mật khẩu hiện tại"
          secureTextEntry
          editable={!loading}
        />
        <Text style={styles.label}>Mật khẩu mới (tối thiểu 8 ký tự)</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Mật khẩu mới"
          secureTextEntry
          editable={!loading}
        />
        <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Nhập lại mật khẩu mới"
          secureTextEntry
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
            <Text style={styles.buttonText}>Đổi mật khẩu</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  form: { padding: 8 },
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
});
