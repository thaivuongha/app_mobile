import { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvoiceSettings, updateInvoiceSettings } from '@/src/api/invoiceSettings';
import { ApiClientError } from '@/src/api/client';

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
      Alert.alert('Lỗi', 'VAT 0-100');
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
        onError: (e) => Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Lưu thất bại'),
        onSuccess: () => Alert.alert('Thành công', 'Đã cập nhật cài đặt hóa đơn.'),
      }
    );
  };

  if (isLoading) return <ActivityIndicator style={styles.loader} />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Tên công ty</Text>
      <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder="Công ty TNHH X" />
      <Text style={styles.label}>Mã số thuế</Text>
      <TextInput style={styles.input} value={taxCode} onChangeText={setTaxCode} placeholder="0123456789" />
      <Text style={styles.label}>Địa chỉ công ty</Text>
      <TextInput style={styles.input} value={companyAddress} onChangeText={setCompanyAddress} placeholder="123 Đường Y" />
      <Text style={styles.label}>Tiền tố hóa đơn</Text>
      <TextInput style={styles.input} value={invoicePrefix} onChangeText={setInvoicePrefix} placeholder="INV" />
      <Text style={styles.label}>Thuế VAT (%)</Text>
      <TextInput style={styles.input} value={vatRate} onChangeText={setVatRate} placeholder="10" keyboardType="number-pad" />
      <TouchableOpacity
        style={[styles.button, updateMutation.isPending && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Lưu</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loader: { marginTop: 24 },
  label: { marginBottom: 6, fontSize: 14, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#2f95dc', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
