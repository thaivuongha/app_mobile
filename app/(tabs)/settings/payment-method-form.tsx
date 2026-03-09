import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createPaymentMethod, updatePaymentMethod } from '@/src/api/paymentMethods';
import { ApiClientError } from '@/src/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAYMENT_TYPES = [
  { key: 'BANK_TRANSFER', label: 'Ngân hàng', icon: 'card-outline' as const },
  { key: 'MOMO', label: 'MoMo', icon: 'phone-portrait-outline' as const },
  { key: 'ZALOPAY', label: 'ZaloPay', icon: 'phone-portrait-outline' as const },
  { key: 'VNPAY', label: 'VNPay', icon: 'phone-portrait-outline' as const },
];

const POPULAR_BANKS = [
  { code: 'VCB', name: 'Vietcombank', color: '#007B40' },
  { code: 'MB', name: 'MB Bank', color: '#00508F' },
  { code: 'TCB', name: 'Techcombank', color: '#D71920' },
  { code: 'BIDV', name: 'BIDV', color: '#00488A' },
  { code: 'CTG', name: 'VietinBank', color: '#1E5AA8' },
  { code: 'ACB', name: 'ACB', color: '#1C419B' },
  { code: 'VPB', name: 'VPBank', color: '#FF6600' },
  { code: 'TPB', name: 'TPBank', color: '#E30613' },
  { code: 'STB', name: 'Sacombank', color: '#063A81' },
  { code: 'LPB', name: 'LienVietPost', color: '#004A97' },
  { code: 'OCB', name: 'OCB', color: '#F7941D' },
  { code: 'MSB', name: 'MSB', color: '#E11931' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {required && <Text style={styles.requiredMark}>*</Text>}
      </View>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PaymentMethodFormScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    id?: string;
    bankName?: string;
    bankCode?: string;
    paymentType?: string;
    accountHolderName?: string;
    isPrimary?: string;
  }>();

  const isEdit = !!params.id;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [paymentType, setPaymentType] = useState(params.paymentType ?? 'BANK_TRANSFER');
  const [selectedBankCode, setSelectedBankCode] = useState(params.bankCode ?? '');
  const [bankName, setBankName] = useState(params.bankName ?? '');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(
    params.accountHolderName ?? ''
  );
  // Luôn là primary vì chỉ có 1 tài khoản duy nhất
  const [isPrimary] = useState(true);
  const [loading, setLoading] = useState(false);

  const isBankTransfer = paymentType === 'BANK_TRANSFER';

  // ─── Bank selection ──────────────────────────────────────────────────────────
  const handleBankSelect = (code: string, name: string) => {
    if (selectedBankCode === code) {
      setSelectedBankCode('');
      setBankName('');
    } else {
      setSelectedBankCode(code);
      setBankName(name);
    }
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const resolvedBankName = bankName.trim();
    const resolvedAccountNumber = accountNumber.trim();

    if (isBankTransfer && !resolvedAccountNumber && !isEdit) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số tài khoản');
      return;
    }
    if (!resolvedBankName) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn hoặc nhập tên ngân hàng');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const body: Record<string, unknown> = {
          paymentType,
          bankName: resolvedBankName,
          isPrimary,
        };
        if (selectedBankCode) body.bankCode = selectedBankCode;
        if (accountHolderName.trim()) body.accountHolderName = accountHolderName.trim();
        if (resolvedAccountNumber) body.accountNumber = resolvedAccountNumber;

        await updatePaymentMethod(params.id!, body);
        Alert.alert('Đã cập nhật', 'Thông tin thanh toán đã được lưu.');
      } else {
        await createPaymentMethod({
          paymentType,
          accountNumber: resolvedAccountNumber,
          bankName: resolvedBankName,
          bankCode: selectedBankCode || undefined,
          accountHolderName: accountHolderName.trim() || undefined,
          isPrimary,
        });
        Alert.alert('Đã thêm', 'Thêm tài khoản thanh toán thành công.');
      }
      await queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      router.back();
    } catch (e) {
      const message =
        e instanceof ApiClientError ? e.message : 'Thao tác thất bại. Kiểm tra kết nối.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Loại thanh toán ── */}
          <SectionTitle>Loại thanh toán</SectionTitle>
          <View style={styles.typeRow}>
            {PAYMENT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeChip, paymentType === t.key && styles.typeChipActive]}
                onPress={() => setPaymentType(t.key)}
              >
                <Ionicons
                  name={t.icon}
                  size={18}
                  color={paymentType === t.key ? Colors.primary : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    paymentType === t.key && styles.typeChipTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Chọn ngân hàng (chỉ khi BANK_TRANSFER) ── */}
          {isBankTransfer && (
            <>
              <SectionTitle>Ngân hàng</SectionTitle>
              <View style={styles.bankGrid}>
                {POPULAR_BANKS.map((b) => {
                  const isSelected = selectedBankCode === b.code;
                  return (
                    <TouchableOpacity
                      key={b.code}
                      style={[
                        styles.bankChip,
                        isSelected && { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
                      ]}
                      onPress={() => handleBankSelect(b.code, b.name)}
                    >
                      <View style={[styles.bankChipDot, { backgroundColor: b.color }]}>
                        <Text style={styles.bankChipDotText}>{b.code.slice(0, 2)}</Text>
                      </View>
                      <Text
                        style={[
                          styles.bankChipLabel,
                          isSelected && { color: Colors.primary, fontWeight: '600' },
                        ]}
                        numberOfLines={1}
                      >
                        {b.code}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Tên ngân hàng (custom hoặc auto-filled) ── */}
          <FormField
            label={isBankTransfer ? 'Tên đầy đủ ngân hàng' : 'Tên ví / dịch vụ'}
            required
            hint={
              isBankTransfer
                ? 'Chọn ngân hàng ở trên hoặc nhập tay nếu không có trong danh sách'
                : undefined
            }
          >
            <TextInput
              style={styles.input}
              value={bankName}
              onChangeText={(v) => {
                setBankName(v);
                if (isBankTransfer) setSelectedBankCode('');
              }}
              placeholder={isBankTransfer ? 'Ví dụ: Vietcombank' : 'Ví dụ: MoMo'}
              placeholderTextColor={Colors.textMuted}
            />
          </FormField>

          {/* ── Số tài khoản ── */}
          <FormField
            label={isBankTransfer ? 'Số tài khoản (STK)' : 'Số điện thoại / tài khoản'}
            required={!isEdit}
            hint={
              isEdit
                ? 'Để trống nếu không muốn thay đổi số tài khoản'
                : undefined
            }
          >
            <TextInput
              style={styles.input}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder={isEdit ? '(không thay đổi)' : '0852240768'}
              keyboardType="number-pad"
              placeholderTextColor={Colors.textMuted}
            />
          </FormField>

          {/* ── Chủ tài khoản ── */}
          <FormField
            label="Tên chủ tài khoản"
            hint="Viết in HOA, đúng như in trong thẻ ngân hàng"
          >
            <TextInput
              style={styles.input}
              value={accountHolderName}
              onChangeText={(v) => setAccountHolderName(v.toUpperCase())}
              placeholder="NGUYEN VAN A"
              autoCapitalize="characters"
              placeholderTextColor={Colors.textMuted}
            />
          </FormField>

          {/* isPrimary luôn = true, không cần hiển thị toggle */}

          {/* ── Nút lưu ── */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={isEdit ? 'save-outline' : 'add-circle-outline'} size={20} color="#fff" />
                <Text style={styles.submitBtnText}>
                  {isEdit ? 'Lưu thay đổi' : 'Thêm tài khoản'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 20 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },

  // Payment type chips
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  typeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeChipText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  typeChipTextActive: { color: Colors.primary, fontWeight: '600' },

  // Bank grid
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  bankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minWidth: 72,
  },
  bankChipDot: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankChipDotText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  bankChipLabel: { fontSize: 13, color: Colors.textPrimary },

  // Form fields
  fieldGroup: { marginBottom: 16 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 2 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  requiredMark: { fontSize: 14, color: Colors.danger },
  fieldHint: { fontSize: 12, color: Colors.textMuted, marginTop: 4, lineHeight: 16 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.card,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 24,
    gap: 12,
  },
  toggleRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  toggleInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  toggleSubLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
