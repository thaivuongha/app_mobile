import { useState } from 'react';
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
  StatusBar,
} from 'react-native';
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

  const validate = (): boolean => {
    const e: Partial<FormValues> = {};
    if (!bankName.trim()) e.bankName = 'Tên ngân hàng không được để trống';
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

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tên ngân hàng</Text>
            <TextInput
              style={[styles.fieldInput, errors.bankName ? styles.fieldInputError : undefined]}
              value={bankName}
              onChangeText={(t) => { setBankName(t); setErrors((e) => ({ ...e, bankName: undefined })); }}
              placeholder="VD: Vietcombank, BIDV, MB..."
              placeholderTextColor={Colors.textMuted}
              returnKeyType="next"
            />
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
      <StatusBar barStyle="dark-content" />

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
