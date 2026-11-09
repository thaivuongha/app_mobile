import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { redeemShareCode } from '@/src/api/staffAuth';
import { ApiClientError } from '@/src/api/client';
import { useAuthStore } from '@/src/stores/authStore';
import { Colors } from '@/constants/Colors';

const CODE_LEN = 12;
const GROUP_LEN = 4;

/** Giữ lại chữ+số, viết hoa, cắt tối đa 12 ký tự — dùng khi gõ tay hoặc dán mã có gạch ngang. */
function toRaw(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LEN);
}

/** AAAA-BBBB-CCCC — chèn gạch ngang để dễ đọc/dễ đối chiếu khi gõ. */
function formatDisplay(raw: string): string {
  const groups = raw.match(new RegExp(`.{1,${GROUP_LEN}}`, 'g')) ?? [];
  return groups.join('-');
}

export default function StaffCodeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (text: string) => setRaw(toRaw(text));

  const handleSubmit = async () => {
    if (raw.length !== CODE_LEN) {
      Alert.alert('Mã chưa đủ', `Mã chia sẻ gồm ${CODE_LEN} ký tự (dạng AAAA-BBBB-CCCC).`);
      return;
    }
    setLoading(true);
    try {
      await redeemShareCode(raw);
      // Điện thoại dùng chung: xóa cache của chủ hoặc nhân viên trước đó trước khi vào màn mới.
      queryClient.clear();
      setSession('staff');
      router.replace('/(staff)');
    } catch (e) {
      if (e instanceof ApiClientError && e.statusCode === 429) {
        Alert.alert('Thử lại sau', 'Nhập quá nhiều lần. Đợi một phút rồi thử lại.');
        return;
      }
      const invalid = e instanceof ApiClientError && e.statusCode === 401;
      const message = e instanceof ApiClientError ? e.message : 'Không thể kết nối. Vui lòng thử lại.';
      Alert.alert(invalid ? 'Mã không hợp lệ' : 'Không vào được', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAwareScrollView contentContainerStyle={styles.page}>
        <View style={styles.iconBox}>
          <Ionicons name="key-outline" size={30} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Nhập mã chia sẻ</Text>
        <Text style={styles.subtitle}>
          Xin mã 12 ký tự từ chủ nhà nghỉ/khách sạn để xem danh sách thiết bị và sản phẩm cần
          châm thêm — không cần tài khoản riêng.
        </Text>

        <TextInput
          style={styles.codeInput}
          value={formatDisplay(raw)}
          onChangeText={handleChange}
          placeholder="AAAA-BBBB-CCCC"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!loading}
          maxLength={CODE_LEN + 2} // + 2 gạch ngang hiển thị
        />

        <TouchableOpacity
          style={[styles.submitBtn, (loading || raw.length !== CODE_LEN) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || raw.length !== CODE_LEN}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Xem thiết bị</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  page: { flexGrow: 1, alignItems: 'center', padding: 28, paddingTop: 32 },

  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3 },
  subtitle: {
    fontSize: 13.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 28,
    paddingHorizontal: 8,
  },

  codeInput: {
    width: '100%',
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 3,
    color: Colors.textPrimary,
    marginBottom: 20,
  },

  submitBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 54,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
