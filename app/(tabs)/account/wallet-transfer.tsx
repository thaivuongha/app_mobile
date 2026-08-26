import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { getWalletBalance, walletTransfer } from '@/src/api/wallet';
import { Colors } from '@/constants/Colors';

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

// ─── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  visible,
  amount,
  depositAfter,
  commissionAfter,
  onConfirm,
  onCancel,
  loading,
}: {
  visible: boolean;
  amount: number;
  depositAfter: number;
  commissionAfter: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Ionicons name="swap-horizontal" size={32} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: 8 }} />
          <Text style={styles.modalTitle}>Xác nhận chuyển vốn</Text>
          <Text style={styles.modalSub}>Hành động này không thể hoàn tác.</Text>

          <View style={styles.modalInfoRows}>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>Số tiền chuyển</Text>
              <Text style={styles.modalRowValue}>{formatVND(amount)}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>Ví vận hành (sau)</Text>
              <Text style={styles.modalRowValue}>{formatVND(depositAfter)}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalRowLabel}>Ví hoa hồng (sau)</Text>
              <Text style={[styles.modalRowValue, { color: Colors.success }]}>
                {formatVND(commissionAfter)}
              </Text>
            </View>
          </View>

          <View style={styles.modalBtnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelBtnText}>Huỷ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.btnDisabled]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>Xác nhận chuyển</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function WalletTransferScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [amountInput, setAmountInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const balanceQuery = useQuery({ queryKey: ['wallet'], queryFn: getWalletBalance });
  const depositBalance = balanceQuery.data?.depositBalance ?? 0;
  const commissionBalance = balanceQuery.data?.commissionBalance ?? 0;

  const transferMutation = useMutation({
    mutationFn: (amount: number) => walletTransfer(amount),
    onSuccess: (data) => {
      setShowConfirm(false);
      queryClient.setQueryData(['wallet'], (old: typeof balanceQuery.data) =>
        old
          ? {
              ...old,
              depositBalance: data.depositBalance,
              commissionBalance: data.commissionBalance,
            }
          : old
      );
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      Alert.alert(
        'Chuyển vốn thành công',
        `${formatVND(data.transferred)} đã được chuyển vào ví hoa hồng.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (e: { message?: string }) => {
      setShowConfirm(false);
      Alert.alert('Lỗi', e.message ?? 'Không thể thực hiện chuyển vốn. Thử lại.');
    },
  });

  const parsedAmount = (): number => {
    const digits = amountInput.replace(/\D/g, '');
    return parseInt(digits, 10) || 0;
  };

  const validate = (): boolean => {
    const amount = parsedAmount();
    if (amount <= 0) {
      setInputError('Vui lòng nhập số tiền hợp lệ (> 0đ)');
      return false;
    }
    if (amount > depositBalance) {
      setInputError('Số tiền vượt mức cọc khả dụng');
      return false;
    }
    setInputError('');
    return true;
  };

  const handleTransfer = () => {
    if (!validate()) return;
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    transferMutation.mutate(parsedAmount());
  };

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    setAmountInput(digits ? parseInt(digits, 10).toLocaleString('vi-VN') : '');
    setInputError('');
  };

  const handleFillMax = () => {
    setAmountInput(depositBalance.toLocaleString('vi-VN'));
    setInputError('');
  };

  const amount = parsedAmount();
  const depositAfter = Math.max(0, depositBalance - amount);
  const commissionAfter = commissionBalance + amount;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar style="dark" />

      <KeyboardAwareScrollView contentContainerStyle={styles.scroll}>
        {/* Warning box */}
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={18} color={Colors.warning} />
          <Text style={styles.warningText}>
            Tiền sau khi chuyển sẽ có trong ví hoa hồng và được chi trả theo đợt định kỳ
            (khấu trừ 10% thuế TNCN). Hành động này không thể hoàn tác.
          </Text>
        </View>

        {/* Current balances */}
        <View style={styles.balancesCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Ví vận hành (khả dụng)</Text>
              {balanceQuery.isLoading ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Text style={styles.balanceValue}>{formatVND(depositBalance)}</Text>
              )}
            </View>
            <Ionicons name="arrow-forward" size={18} color={Colors.textMuted} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Ví hoa hồng</Text>
              {balanceQuery.isLoading ? (
                <ActivityIndicator color={Colors.success} />
              ) : (
                <Text style={[styles.balanceValue, { color: Colors.success }]}>
                  {formatVND(commissionBalance)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Amount input */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Số tiền chuyển</Text>
          <View style={[styles.inputRow, inputError ? styles.inputRowError : undefined]}>
            <Text style={styles.currencySymbol}>₫</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              value={amountInput}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.maxBtn} onPress={handleFillMax}>
              <Text style={styles.maxBtnText}>Tất cả</Text>
            </TouchableOpacity>
          </View>
          {inputError ? <Text style={styles.errorText}>{inputError}</Text> : null}

          {/* Preview after transfer */}
          {amount > 0 && amount <= depositBalance && (
            <View style={styles.previewBox}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Ví vận hành sau</Text>
                <Text style={styles.previewValue}>{formatVND(depositAfter)}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Ví hoa hồng sau</Text>
                <Text style={[styles.previewValue, { color: Colors.success }]}>
                  {formatVND(commissionAfter)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.transferBtn, balanceQuery.isLoading && styles.btnDisabled]}
          onPress={handleTransfer}
          disabled={balanceQuery.isLoading}
          activeOpacity={0.85}
        >
          <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
          <Text style={styles.transferBtnText}>Chuyển vốn</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <ConfirmModal
        visible={showConfirm}
        amount={amount}
        depositAfter={depositAfter}
        commissionAfter={commissionAfter}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        loading={transferMutation.isPending}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 32 },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.warningLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.warning + '50',
  },
  warningText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },

  balancesCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  balanceItem: { flex: 1, gap: 4 },
  balanceLabel: { fontSize: 11, color: Colors.textMuted },
  balanceValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 54,
    backgroundColor: Colors.background,
  },
  inputRowError: { borderColor: Colors.danger },
  currencySymbol: { fontSize: 20, fontWeight: '700', color: Colors.textMuted, marginRight: 6 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  maxBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  maxBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  errorText: { fontSize: 12, color: Colors.danger, marginTop: 6 },

  previewBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewLabel: { fontSize: 12, color: Colors.textMuted },
  previewValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnDisabled: { opacity: 0.6 },
  transferBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Confirm modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  modalSub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginBottom: 8 },
  modalInfoRows: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 8,
  },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalRowLabel: { fontSize: 13, color: Colors.textSecondary },
  modalRowValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
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
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
