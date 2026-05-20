import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getPayoutAccounts,
  createPayoutAccount,
  updatePayoutAccount,
  deletePayoutAccount,
} from '@/src/api/wallet';
import type { PayoutAccount } from '@/src/api/wallet';
import { Colors } from '@/constants/Colors';

// ─── Danh sách ngân hàng Việt Nam ─────────────────────────────────────────────

const VIETNAMESE_BANKS = [
  { code: 'VCB',   name: 'Vietcombank',               fullName: 'Ngân hàng TMCP Ngoại thương Việt Nam' },
  { code: 'BIDV',  name: 'BIDV',                       fullName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { code: 'CTG',   name: 'VietinBank',                 fullName: 'Ngân hàng TMCP Công Thương Việt Nam' },
  { code: 'AGR',   name: 'Agribank',                   fullName: 'Ngân hàng Nông nghiệp và PTNT Việt Nam' },
  { code: 'TCB',   name: 'Techcombank',                fullName: 'Ngân hàng TMCP Kỹ thương Việt Nam' },
  { code: 'MB',    name: 'MB Bank',                    fullName: 'Ngân hàng TMCP Quân đội' },
  { code: 'ACB',   name: 'ACB',                        fullName: 'Ngân hàng TMCP Á Châu' },
  { code: 'VPB',   name: 'VPBank',                     fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { code: 'TPB',   name: 'TPBank',                     fullName: 'Ngân hàng TMCP Tiên Phong' },
  { code: 'STB',   name: 'Sacombank',                  fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
  { code: 'HDB',   name: 'HDBank',                     fullName: 'Ngân hàng TMCP Phát triển TP. HCM' },
  { code: 'VIB',   name: 'VIB',                        fullName: 'Ngân hàng TMCP Quốc tế Việt Nam' },
  { code: 'SHB',   name: 'SHB',                        fullName: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
  { code: 'EIB',   name: 'Eximbank',                   fullName: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam' },
  { code: 'MSB',   name: 'MSB',                        fullName: 'Ngân hàng TMCP Hàng Hải Việt Nam' },
  { code: 'OCB',   name: 'OCB',                        fullName: 'Ngân hàng TMCP Phương Đông' },
  { code: 'LPB',   name: 'LienVietPostBank',           fullName: 'Ngân hàng TMCP Bưu điện Liên Việt' },
  { code: 'KLB',   name: 'KienLongBank',               fullName: 'Ngân hàng TMCP Kiên Long' },
  { code: 'NAB',   name: 'Nam A Bank',                 fullName: 'Ngân hàng TMCP Nam Á' },
  { code: 'PGB',   name: 'PGBank',                     fullName: 'Ngân hàng TMCP Xăng dầu Petrolimex' },
  { code: 'VAB',   name: 'VietABank',                  fullName: 'Ngân hàng TMCP Việt Á' },
  { code: 'BAB',   name: 'BacABank',                   fullName: 'Ngân hàng TMCP Bắc Á' },
  { code: 'SEAB',  name: 'SeABank',                    fullName: 'Ngân hàng TMCP Đông Nam Á' },
  { code: 'CAKE',  name: 'CAKE',                       fullName: 'Ngân hàng số CAKE by VPBank' },
  { code: 'UBANK', name: 'Ubank',                      fullName: 'Ngân hàng số Ubank by VPBank' },
  { code: 'TIMO',  name: 'Timo',                       fullName: 'Timo Plus' },
  { code: 'VCCB',  name: 'BVBank',                     fullName: 'Ngân hàng TMCP Bản Việt' },
  { code: 'PBVN',  name: 'PublicBank',                 fullName: 'Ngân hàng TNHH MTV Public Việt Nam' },
  { code: 'HSBC',  name: 'HSBC Việt Nam',              fullName: 'Ngân hàng TNHH MTV HSBC Việt Nam' },
  { code: 'SCB',   name: 'Standard Chartered',         fullName: 'Ngân hàng TNHH MTV Standard Chartered Việt Nam' },
  { code: 'SHBVN', name: 'Shinhan Bank',               fullName: 'Ngân hàng TNHH MTV Shinhan Việt Nam' },
  { code: 'KBHCM', name: 'KookminBank HCM',            fullName: 'Ngân hàng Kookmin - Chi nhánh TP. HCM' },
  { code: 'KBHN',  name: 'KookminBank HN',             fullName: 'Ngân hàng Kookmin - Chi nhánh Hà Nội' },
  { code: 'IBK',   name: 'IBK',                        fullName: 'Ngân hàng IBK - Chi nhánh TP. HCM' },
  { code: 'MOMO',  name: 'Ví MoMo',                   fullName: 'Ví điện tử MoMo' },
  { code: 'ZALOPAY', name: 'ZaloPay',                  fullName: 'Ví điện tử ZaloPay' },
] as const;

type BankInfo = typeof VIETNAMESE_BANKS[number];

// ─── Bank picker modal ─────────────────────────────────────────────────────────

function BankPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string;
  onSelect: (bank: BankInfo) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return VIETNAMESE_BANKS;
    return VIETNAMESE_BANKS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.fullName.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <TouchableOpacity style={pickerStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={pickerStyles.sheet}
        >
          <View style={pickerStyles.handle} />
          <Text style={pickerStyles.title}>Chọn ngân hàng</Text>

          {/* Search */}
          <View style={pickerStyles.searchRow}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
            <TextInput
              style={pickerStyles.searchInput}
              placeholder="Tìm tên hoặc mã ngân hàng..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(b) => b.code}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={pickerStyles.list}
            renderItem={({ item }) => {
              const isSelected = selected === item.name;
              return (
                <TouchableOpacity
                  style={[pickerStyles.bankRow, isSelected && pickerStyles.bankRowSelected]}
                  onPress={() => { onSelect(item); onClose(); }}
                  activeOpacity={0.7}
                >
                  <View style={[pickerStyles.bankCode, isSelected && pickerStyles.bankCodeSelected]}>
                    <Text style={[pickerStyles.bankCodeText, isSelected && pickerStyles.bankCodeTextSelected]}>
                      {item.code.slice(0, 4)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[pickerStyles.bankName, isSelected && pickerStyles.bankNameSelected]}>
                      {item.name}
                    </Text>
                    <Text style={pickerStyles.bankFullName} numberOfLines={1}>
                      {item.fullName}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={pickerStyles.empty}>
                <Text style={pickerStyles.emptyText}>Không tìm thấy ngân hàng</Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '80%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17, fontWeight: '700', color: Colors.textPrimary,
    paddingHorizontal: 20, marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: Colors.textPrimary,
  },
  list: { paddingHorizontal: 12, paddingBottom: 32 },
  bankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 8,
    borderRadius: 12, marginBottom: 2,
  },
  bankRowSelected: { backgroundColor: Colors.primaryLight },
  bankCode: {
    width: 52, height: 36, borderRadius: 9,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  bankCodeSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  bankCodeText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  bankCodeTextSelected: { color: '#fff' },
  bankName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  bankNameSelected: { color: Colors.primary },
  bankFullName: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});

// ─── Form modal ───────────────────────────────────────────────────────────────

interface FormValues {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

function AccountFormModal({
  visible,
  initial,
  onClose,
  onSubmit,
  loading,
}: {
  visible: boolean;
  initial: Partial<FormValues>;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
  loading: boolean;
}) {
  const [bankName, setBankName] = useState(initial.bankName ?? '');
  const [accountNumber, setAccountNumber] = useState(initial.accountNumber ?? '');
  const [accountHolder, setAccountHolder] = useState(initial.accountHolder ?? '');
  const [errors, setErrors] = useState<Partial<FormValues>>({});
  const [showBankPicker, setShowBankPicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setBankName(initial.bankName ?? '');
    setAccountNumber(initial.accountNumber ?? '');
    setAccountHolder(initial.accountHolder ?? '');
    setErrors({});
    setShowBankPicker(false);
  }, [visible, initial.bankName, initial.accountNumber, initial.accountHolder]);

  const validate = (): boolean => {
    const e: Partial<FormValues> = {};
    if (!bankName.trim()) e.bankName = 'Vui lòng chọn ngân hàng';
    if (!accountNumber.trim()) e.accountNumber = 'Số tài khoản không được để trống';
    if (!accountHolder.trim()) e.accountHolder = 'Tên chủ tài khoản không được để trống';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({ bankName: bankName.trim(), accountNumber: accountNumber.trim(), accountHolder: accountHolder.trim() });
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView
          style={styles.modalWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
          <View style={styles.formSheet}>
            <View style={styles.formHandle} />
            <Text style={styles.formTitle}>
              {initial.bankName ? 'Sửa tài khoản' : 'Thêm tài khoản nhận hoa hồng'}
            </Text>

            {/* Ngân hàng — dropdown */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Ngân hàng</Text>
              <TouchableOpacity
                style={[styles.fieldInput, styles.selectRow, errors.bankName ? styles.fieldInputError : undefined]}
                onPress={() => setShowBankPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={bankName ? styles.selectText : styles.selectPlaceholder} numberOfLines={1}>
                  {bankName || 'Chọn ngân hàng...'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              {errors.bankName ? <Text style={styles.fieldError}>{errors.bankName}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Số tài khoản</Text>
              <TextInput
                style={[styles.fieldInput, errors.accountNumber ? styles.fieldInputError : undefined]}
                value={accountNumber}
                onChangeText={(t) => { setAccountNumber(t); setErrors((e) => ({ ...e, accountNumber: undefined })); }}
                placeholder="Số tài khoản ngân hàng"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                returnKeyType="next"
              />
              {errors.accountNumber ? <Text style={styles.fieldError}>{errors.accountNumber}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Tên chủ tài khoản</Text>
              <TextInput
                style={[styles.fieldInput, errors.accountHolder ? styles.fieldInputError : undefined]}
                value={accountHolder}
                onChangeText={(t) => { setAccountHolder(t); setErrors((e) => ({ ...e, accountHolder: undefined })); }}
                placeholder="Tên in hoa trên thẻ ngân hàng"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                returnKeyType="done"
              />
              {errors.accountHolder ? <Text style={styles.fieldError}>{errors.accountHolder}</Text> : null}
            </View>

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelBtnText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BankPickerModal
        visible={showBankPicker}
        selected={bankName}
        onSelect={(bank) => {
          setBankName(bank.name);
          setErrors((e) => ({ ...e, bankName: undefined }));
        }}
        onClose={() => setShowBankPicker(false)}
      />
    </>
  );
}

// ─── Account card ─────────────────────────────────────────────────────────────

function AccountCard({
  account,
  onEdit,
  onDelete,
  onSetPrimary,
}: {
  account: PayoutAccount;
  onEdit: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
}) {
  const masked = account.accountNumber.replace(
    /^(\d{4})\d+(\d{4})$/,
    (_, head, tail) => `${head} ${'*'.repeat(account.accountNumber.length - 8)} ${tail}`
  );

  return (
    <View style={[styles.accountCard, account.isPrimary && styles.accountCardPrimary]}>
      {account.isPrimary && (
        <View style={styles.primaryBadge}>
          <Ionicons name="star" size={11} color={Colors.primary} />
          <Text style={styles.primaryBadgeText}>Tài khoản chính</Text>
        </View>
      )}

      <View style={styles.accountTop}>
        <View style={styles.bankIconWrap}>
          <Ionicons name="business-outline" size={18} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bankName}>{account.bankName}</Text>
          <Text style={styles.accountNumber}>{masked}</Text>
          <Text style={styles.accountHolder}>{account.accountHolder}</Text>
        </View>
      </View>

      <View style={styles.accountActions}>
        {!account.isPrimary && (
          <TouchableOpacity style={styles.actionChip} onPress={onSetPrimary} activeOpacity={0.7}>
            <Ionicons name="star-outline" size={13} color={Colors.primary} />
            <Text style={styles.actionChipText}>Đặt chính</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionChip} onPress={onEdit} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={13} color={Colors.textSecondary} />
          <Text style={[styles.actionChipText, { color: Colors.textSecondary }]}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionChip, styles.actionChipDanger]}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={13} color={Colors.danger} />
          <Text style={[styles.actionChipText, { color: Colors.danger }]}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function WalletPayoutAccountsScreen() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<PayoutAccount | null>(null);

  const { data: accounts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['payout-accounts'],
    queryFn: getPayoutAccounts,
  });

  const createMutation = useMutation({
    mutationFn: createPayoutAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-accounts'] });
      setShowForm(false);
    },
    onError: (e: { message?: string }) => {
      Alert.alert('Lỗi', e.message ?? 'Không thể thêm tài khoản. Thử lại.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updatePayoutAccount>[1] }) =>
      updatePayoutAccount(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-accounts'] });
      setShowForm(false);
      setEditTarget(null);
    },
    onError: (e: { message?: string }) => {
      Alert.alert('Lỗi', e.message ?? 'Không thể cập nhật tài khoản. Thử lại.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePayoutAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-accounts'] });
    },
    onError: (e: { message?: string }) => {
      Alert.alert('Lỗi', e.message ?? 'Không thể xóa tài khoản. Thử lại.');
    },
  });

  const handleFormSubmit = (values: FormValues) => {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, body: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleDelete = (account: PayoutAccount) => {
    Alert.alert(
      'Xóa tài khoản',
      `Xóa tài khoản ${account.bankName} - ${account.accountNumber}?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => deleteMutation.mutate(account.id) },
      ]
    );
  };

  const handleSetPrimary = (account: PayoutAccount) => {
    updateMutation.mutate({ id: account.id, body: { isPrimary: true } });
  };

  const formLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar style="dark" />

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AccountCard
              account={item}
              onEdit={() => { setEditTarget(item); setShowForm(true); }}
              onDelete={() => handleDelete(item)}
              onSetPrimary={() => handleSetPrimary(item)}
            />
          )}
          contentContainerStyle={accounts.length === 0 ? styles.emptyContainer : styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Chưa có tài khoản</Text>
              <Text style={styles.emptySub}>
                Thêm tài khoản ngân hàng để nhận hoa hồng từ công ty.
              </Text>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => { setEditTarget(null); setShowForm(true); }}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Thêm tài khoản</Text>
            </TouchableOpacity>
          }
        />
      )}

      <AccountFormModal
        visible={showForm}
        initial={editTarget ? { bankName: editTarget.bankName, accountNumber: editTarget.accountNumber, accountHolder: editTarget.accountHolder } : {}}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 16 },
  emptyContainer: { flex: 1 },

  accountCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  accountCardPrimary: {
    borderColor: Colors.primary + '50',
    borderWidth: 1.5,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  primaryBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  accountTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  bankIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  accountNumber: { fontSize: 14, color: Colors.textSecondary, marginTop: 2, letterSpacing: 1 },
  accountHolder: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },

  accountActions: { flexDirection: 'row', gap: 8 },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionChipDanger: { backgroundColor: Colors.dangerLight },
  actionChipText: { fontSize: 12, fontWeight: '500', color: Colors.primary },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Form modal
  modalWrapper: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  formSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  formHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  formTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 20 },

  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  fieldInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  fieldInputError: { borderColor: Colors.danger },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  selectText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  selectPlaceholder: { fontSize: 15, color: Colors.textMuted, flex: 1 },
  fieldError: { fontSize: 11, color: Colors.danger, marginTop: 4 },

  formBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
