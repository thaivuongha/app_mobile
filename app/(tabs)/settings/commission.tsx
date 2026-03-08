import { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCommissionSettings,
  createCommissionSetting,
  updateCommissionSetting,
} from '@/src/api/commissionSettings';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

export default function CommissionScreen() {
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['commission-settings'],
    queryFn: () => getCommissionSettings(),
  });

  // Lấy setting PERCENTAGE mặc định đầu tiên
  const existing = data?.find(
    (s) => s.commissionType === 'PERCENTAGE' && s.isDefault,
  ) ?? data?.[0];

  useEffect(() => {
    if (existing) {
      setValue(String(existing.commissionValue));
    }
  }, [existing?.id]);

  const handleSave = async () => {
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num) || num < 0 || num > 100) {
      Alert.alert('Giá trị không hợp lệ', 'Phần trăm lợi nhuận phải từ 0 đến 100');
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await updateCommissionSetting(existing.id, {
          commissionValue: num,
          commissionType: 'PERCENTAGE',
          isDefault: true,
        });
      } else {
        await createCommissionSetting({
          commissionType: 'PERCENTAGE',
          commissionValue: num,
          isDefault: true,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['commission-settings'] });
      Alert.alert('Đã lưu', `Lợi nhuận đã được đặt thành ${num}%`);
    } catch (e) {
      Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const numVal = parseFloat(value.replace(',', '.'));
  const isValid = !isNaN(numVal) && numVal >= 0 && numVal <= 100;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Icon header */}
          <View style={styles.heroSection}>
            <View style={styles.iconBox}>
              <Ionicons name="trending-up" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Lợi nhuận của bạn</Text>
            <Text style={styles.heroSub}>
              Cài đặt tỷ lệ phần trăm lợi nhuận thu được từ mỗi giao dịch bán hàng qua thiết bị vending.
            </Text>
          </View>

          {/* Input card */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Phần trăm lợi nhuận (%)</Text>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.bigInput}
                value={value}
                onChangeText={setValue}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                maxLength={5}
              />
              <View style={styles.unitBox}>
                <Text style={styles.unitText}>%</Text>
              </View>
            </View>

            <Text style={styles.hint}>
              Mỗi giao dịch bán được, bạn nhận {isValid ? numVal : '?'}% doanh thu.
            </Text>
          </View>

          {/* Preview card */}
          {isValid && numVal > 0 && (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Ionicons name="calculator-outline" size={16} color={Colors.primary} />
                <Text style={styles.previewTitle}>Ví dụ tính toán</Text>
              </View>
              {[50000, 100000, 200000].map((price) => (
                <View key={price} style={styles.previewRow}>
                  <Text style={styles.previewPrice}>{price.toLocaleString('vi-VN')}đ</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
                  <Text style={styles.previewProfit}>
                    +{Math.round(price * numVal / 100).toLocaleString('vi-VN')}đ lợi nhuận
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, (!isValid || saving) && styles.btnDisabled]}
            onPress={handleSave}
            disabled={!isValid || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Lưu cài đặt</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 28 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  heroSection: { alignItems: 'center', marginBottom: 28, gap: 10 },
  iconBox: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5, borderColor: Colors.primary + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  heroSub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },

  card: {
    backgroundColor: Colors.card, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 14 },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  bigInput: {
    flex: 1, fontSize: 48, fontWeight: '800', color: Colors.primary,
    textAlign: 'center', height: 80,
    backgroundColor: Colors.primaryLight, borderRadius: 16,
    borderWidth: 2, borderColor: Colors.primary + '30',
  },
  unitBox: {
    width: 64, height: 80, borderRadius: 16,
    backgroundColor: Colors.primaryLight, borderWidth: 2, borderColor: Colors.primary + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  unitText: { fontSize: 36, fontWeight: '800', color: Colors.primary },

  hint: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  previewCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  previewTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  previewPrice: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  previewProfit: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 16, height: 56,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
