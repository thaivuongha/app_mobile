import { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvoiceSettings, updateInvoiceSettings } from '@/src/api/invoiceSettings';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

function FormField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  hint,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  hint?: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name={icon} size={16} color={Colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
        />
      </View>
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

export default function InvoiceSettingsScreen() {
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [vatRate, setVatRate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['invoice-settings'],
    queryFn: () => getInvoiceSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: updateInvoiceSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoice-settings'] }),
  });

  useEffect(() => {
    if (data) {
      setCompanyName(data.companyName ?? '');
      setTaxCode(data.taxCode ?? '');
      setCompanyAddress(data.companyAddress ?? '');
      setInvoicePrefix(data.invoicePrefix ?? '');
      setVatRate(data.vatRate != null ? String(data.vatRate) : '');
    }
  }, [data?.id]);

  const handleSave = () => {
    const vat = parseInt(vatRate, 10);
    if (isNaN(vat) || vat < 0 || vat > 100) {
      Alert.alert('Giá trị không hợp lệ', 'Thuế VAT phải từ 0 đến 100');
      return;
    }
    updateMutation.mutate(
      {
        companyName: companyName.trim() || undefined,
        taxCode: taxCode.trim() || undefined,
        companyAddress: companyAddress.trim() || undefined,
        invoicePrefix: invoicePrefix.trim() || undefined,
        vatRate: vat,
      },
      {
        onError: (e) =>
          Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Lưu thất bại'),
        onSuccess: () => Alert.alert('Đã lưu', 'Cài đặt hóa đơn đã được cập nhật.'),
      },
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBox}>
                <Ionicons name="business-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Thông tin doanh nghiệp</Text>
            </View>

            <FormField
              label="Tên công ty"
              icon="business-outline"
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Công ty TNHH X"
            />
            <FormField
              label="Mã số thuế"
              icon="barcode-outline"
              value={taxCode}
              onChangeText={setTaxCode}
              placeholder="0123456789"
              keyboardType="number-pad"
            />
            <FormField
              label="Địa chỉ công ty"
              icon="location-outline"
              value={companyAddress}
              onChangeText={setCompanyAddress}
              placeholder="123 Đường Y, Quận Z, TP. HCM"
            />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBox}>
                <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Cài đặt hóa đơn</Text>
            </View>

            <FormField
              label="Tiền tố hóa đơn"
              icon="receipt-outline"
              value={invoicePrefix}
              onChangeText={setInvoicePrefix}
              placeholder="INV"
              hint="Số hóa đơn sẽ có dạng: INV-0001"
            />
            <FormField
              label="Thuế VAT (%)"
              icon="calculator-outline"
              value={vatRate}
              onChangeText={setVatRate}
              placeholder="10"
              keyboardType="number-pad"
              hint="Nhập giá trị từ 0 đến 100"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, updateMutation.isPending && styles.btnDisabled]}
            onPress={handleSave}
            disabled={updateMutation.isPending}
            activeOpacity={0.85}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Lưu cài đặt</Text>
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
  content: { paddingHorizontal: 16, paddingTop: 16 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  card: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 7 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 12, height: 46,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  fieldHint: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, height: 54,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  btnDisabled: { opacity: 0.65 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
