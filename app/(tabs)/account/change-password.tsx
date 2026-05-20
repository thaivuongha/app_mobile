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
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { changePassword } from '@/src/api/auth';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

function InputField({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  editable,
  showText,
  onToggle,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  editable?: boolean;
  showText: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <View style={styles.inputIcon}>
          <Ionicons name={icon} size={18} color={Colors.textMuted} />
        </View>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={!showText}
          editable={editable}
        />
        <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={showText ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mật khẩu hiện tại');
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
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Icon header */}
          <View style={styles.iconSection}>
            <View style={styles.iconBox}>
              <Ionicons name="lock-closed" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Đổi mật khẩu</Text>
            <Text style={styles.sectionSub}>Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật</Text>
          </View>

          <View style={styles.card}>
            <InputField
              label="Mật khẩu hiện tại"
              icon="lock-closed-outline"
              placeholder="Nhập mật khẩu hiện tại"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!loading}
              showText={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
            />
            <InputField
              label="Mật khẩu mới"
              icon="lock-open-outline"
              placeholder="Tối thiểu 8 ký tự"
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!loading}
              showText={showNew}
              onToggle={() => setShowNew((v) => !v)}
            />
            <InputField
              label="Xác nhận mật khẩu mới"
              icon="shield-checkmark-outline"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
              showText={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
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
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Cập nhật mật khẩu</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },

  iconSection: { alignItems: 'center', marginBottom: 24 },
  iconBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: Colors.primaryLight, borderWidth: 1.5, borderColor: Colors.primary + '30',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 12, height: 48,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, height: 54,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  btnDisabled: { opacity: 0.65 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
