import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Text, View } from '@/components/Themed';
import { createCommissionSetting } from '@/src/api/commissionSettings';
import { ApiClientError } from '@/src/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';

export default function CommissionFormScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [commissionType, setCommissionType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [commissionValue, setCommissionValue] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const val = commissionType === 'PERCENTAGE' ? parseFloat(commissionValue) : parseInt(commissionValue, 10);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Lỗi', 'Nhập giá trị > 0');
      return;
    }
    if (commissionType === 'PERCENTAGE' && val > 100) {
      Alert.alert('Lỗi', 'Phần trăm không quá 100');
      return;
    }
    setLoading(true);
    try {
      await createCommissionSetting({
        commissionType,
        commissionValue: val,
        isDefault,
      });
      await queryClient.invalidateQueries({ queryKey: ['commission-settings'] });
      Alert.alert('Thành công', 'Đã thêm rule lợi nhuận.');
      router.back();
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Thêm thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={16}
      enableResetScrollToCoords={false}
    >
      <Text style={styles.label}>Loại</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.chip, commissionType === 'PERCENTAGE' && styles.chipActive]}
          onPress={() => setCommissionType('PERCENTAGE')}
        >
          <Text style={commissionType === 'PERCENTAGE' ? styles.chipTextActive : undefined}>Phần trăm (%)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, commissionType === 'FIXED_AMOUNT' && styles.chipActive]}
          onPress={() => setCommissionType('FIXED_AMOUNT')}
        >
          <Text style={commissionType === 'FIXED_AMOUNT' ? styles.chipTextActive : undefined}>Số tiền cố định (đ)</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.label}>Giá trị</Text>
      <TextInput
        style={styles.input}
        value={commissionValue}
        onChangeText={setCommissionValue}
        placeholder={commissionType === 'PERCENTAGE' ? '20' : '5000'}
        keyboardType="decimal-pad"
      />
      <TouchableOpacity style={styles.checkRow} onPress={() => setIsDefault(!isDefault)}>
        <Text>Đặt làm mặc định</Text>
        <Text>{isDefault ? '✓' : ''}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color={Colors.textPrimary} /> : <Text style={styles.buttonText}>Lưu</Text>}
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  label: { marginBottom: 6, fontSize: 14, fontWeight: '500', color: Colors.textSecondary },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  chip: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: Colors.surface, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTextActive: { color: Colors.textPrimary, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, backgroundColor: Colors.surface, color: Colors.textPrimary },
  checkRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 16 },
  button: { backgroundColor: Colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' },
});
