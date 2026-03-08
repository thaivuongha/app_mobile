import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getPaymentMethods,
  deletePaymentMethod,
  type PaymentMethod,
} from '@/src/api/paymentMethods';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

// ─── Constants ────────────────────────────────────────────────────────────────
const BANK_COLORS: Record<string, string> = {
  VCB: '#007B40',
  BIDV: '#00488A',
  MB: '#00508F',
  TCB: '#D71920',
  CTG: '#1E5AA8',
  ACB: '#1C419B',
  VPB: '#FF6600',
  TPB: '#E30613',
  STB: '#063A81',
  LPB: '#004A97',
  OCB: '#F7941D',
  MSB: '#E11931',
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  MOMO: 'Ví MoMo',
  ZALOPAY: 'Ví ZaloPay',
  VNPAY: 'VNPay',
  CASH: 'Tiền mặt',
  CREDIT_CARD: 'Thẻ tín dụng',
  PAYPAL: 'PayPal',
};

function getBankColor(bankCode?: string): string {
  if (bankCode && BANK_COLORS[bankCode.toUpperCase()]) {
    return BANK_COLORS[bankCode.toUpperCase()];
  }
  return Colors.primary;
}

function getBankInitials(bankName: string, bankCode?: string): string {
  if (bankCode) return bankCode.slice(0, 3).toUpperCase();
  const words = bankName.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ─── Bank Card Visual ─────────────────────────────────────────────────────────
function BankCard({
  method,
  onEdit,
  onDelete,
}: {
  method: PaymentMethod;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const bankColor = getBankColor(method.bankCode);
  const initials = getBankInitials(method.bankName, method.bankCode);
  const typeLabel = PAYMENT_TYPE_LABELS[method.paymentType] ?? method.paymentType;

  return (
    <View style={styles.cardWrapper}>
      {/* Card header with bank color accent */}
      <View style={[styles.cardAccent, { backgroundColor: bankColor }]} />

      <View style={styles.card}>
        {/* Top row: bank avatar + bank name */}
        <View style={styles.cardTop}>
          <View style={[styles.bankAvatar, { backgroundColor: bankColor }]}>
            <Text style={styles.bankAvatarText}>{initials}</Text>
          </View>
          <View style={styles.bankTitleBlock}>
            <Text style={styles.bankName}>{method.bankName}</Text>
            <View style={styles.typeBadge}>
              <Ionicons name="card-outline" size={11} color={Colors.textSecondary} />
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
          </View>
          {/* Edit button top-right */}
          <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
            <Ionicons name="create-outline" size={16} color={Colors.primary} />
            <Text style={styles.editBtnText}>Sửa</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Account info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Số tài khoản</Text>
            <Text style={styles.infoValueMono}>{method.accountNumber}</Text>
          </View>
          {method.accountHolderName ? (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Chủ tài khoản</Text>
              <Text style={styles.infoValue}>{method.accountHolderName}</Text>
            </View>
          ) : null}
        </View>

        {/* QR hint */}
        <View style={styles.qrHintRow}>
          <Ionicons name="qr-code-outline" size={15} color={Colors.success} />
          <Text style={styles.qrHintText}>
            Tài khoản này dùng để tạo mã QR khi khách thanh toán
          </Text>
        </View>
      </View>

      {/* Delete link */}
      <TouchableOpacity style={styles.deleteRow} onPress={onDelete}>
        <Ionicons name="trash-outline" size={15} color={Colors.textMuted} />
        <Text style={styles.deleteText}>Xóa tài khoản thanh toán</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onSetup }: { onSetup: () => void }) {
  return (
    <View style={styles.emptyWrapper}>
      <View style={styles.emptyIconBg}>
        <Ionicons name="card-outline" size={40} color={Colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Chưa có tài khoản thanh toán</Text>
      <Text style={styles.emptySubtitle}>
        Thêm tài khoản ngân hàng để khách có thể thanh toán qua mã QR VietQR khi mua hàng tại máy của bạn.
      </Text>
      <TouchableOpacity style={styles.setupBtn} onPress={onSetup}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.setupBtnText}>Thiết lập tài khoản</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PaymentMethodsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const formPath = from === 'account'
    ? '/(tabs)/account/payment-method-form'
    : '/(tabs)/settings/payment-method-form';

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => getPaymentMethods(),
  });

  // Lấy tài khoản đầu tiên (primary hoặc mới nhất)
  const allMethods = data?.data ?? [];
  const method: PaymentMethod | undefined =
    allMethods.find((m) => m.isPrimary) ?? allMethods[0];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
    onError: (e) => {
      Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Xóa thất bại');
    },
  });

  const handleEdit = () => {
    if (!method) return;
    router.push({
      pathname: formPath as any,
      params: {
        id: method.id,
        bankName: method.bankName,
        bankCode: method.bankCode ?? '',
        paymentType: method.paymentType,
        accountHolderName: method.accountHolderName ?? '',
        isPrimary: '1',
      },
    });
  };

  const handleSetup = () => {
    router.push(formPath as any);
  };

  const handleDelete = () => {
    if (!method) return;
    Alert.alert(
      'Xóa tài khoản thanh toán',
      `Bạn có chắc muốn xóa tài khoản ${method.bankName}?\nKhách sẽ không thể thanh toán qua QR cho đến khi bạn thêm tài khoản mới.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(method.id),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="qr-code" size={20} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBannerTitle}>Tài khoản nhận tiền VietQR</Text>
            <Text style={styles.infoBannerText}>
              Khi khách quét QR tại máy vending, tiền sẽ được chuyển vào tài khoản này.
            </Text>
          </View>
        </View>

        {method ? (
          <BankCard
            method={method}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <EmptyState onSetup={handleSetup} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20, flexGrow: 1 },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.primaryLight,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 20,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  infoBannerText: {
    fontSize: 13,
    color: Colors.primaryDark,
    lineHeight: 18,
  },

  // Card wrapper
  cardWrapper: { gap: 0 },

  // Accent bar on top of card
  cardAccent: {
    height: 6,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },

  // Main card
  card: {
    backgroundColor: Colors.card,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 18,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  bankAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankAvatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  bankTitleBlock: { flex: 1 },
  bankName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 5,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 12, color: Colors.textSecondary },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  editBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },

  infoGrid: { gap: 12, marginBottom: 14 },
  infoItem: { gap: 3 },
  infoLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  infoValueMono: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1.5,
  },

  qrHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
  },
  qrHintText: { fontSize: 12, color: Colors.success, flex: 1, lineHeight: 16 },

  // Delete link
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  deleteText: { fontSize: 13, color: Colors.textMuted },

  // Empty state
  emptyWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  setupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  setupBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
