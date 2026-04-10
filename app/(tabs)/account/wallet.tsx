import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWalletBalance, getPayoutAccounts } from '@/src/api/wallet';
import { Colors } from '@/constants/Colors';

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

// ─── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({
  icon,
  label,
  onPress,
  variant = 'primary',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, variant === 'outline' && styles.actionBtnOutline]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon}
        size={18}
        color={variant === 'outline' ? Colors.primary : '#fff'}
      />
      <Text style={[styles.actionBtnText, variant === 'outline' && styles.actionBtnTextOutline]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Quick link row ────────────────────────────────────────────────────────────

function QuickLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickLink} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.quickLinkIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.quickLinkLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function WalletScreen() {
  const router = useRouter();

  const balanceQuery = useQuery({ queryKey: ['wallet'], queryFn: getWalletBalance });
  const accountsQuery = useQuery({ queryKey: ['payout-accounts'], queryFn: getPayoutAccounts });

  const w = balanceQuery.data;
  const accounts = accountsQuery.data ?? [];
  const primaryAccount = accounts.find((a) => a.isPrimary) ?? accounts[0] ?? null;

  const isLoading = balanceQuery.isLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={balanceQuery.isRefetching}
            onRefresh={() => {
              balanceQuery.refetch();
              accountsQuery.refetch();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* ── Ví vận hành ──────────────────────────────────── */}
        <View style={styles.depositCard}>
          {/* Decorative circles */}
          <View style={[styles.circle, styles.circleTR]} />
          <View style={[styles.circle, styles.circleBL]} />

          <Text style={styles.cardLabel}>Ví vận hành</Text>

          {isLoading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} />
          ) : (
            <>
              <Text style={styles.depositBalance}>
                {formatVND(w?.depositBalance ?? 0)}
              </Text>
              {(w?.reservedBalance ?? 0) > 0 && (
                <View style={styles.reservedRow}>
                  <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.reservedText}>
                    Đang giam: {formatVND(w!.reservedBalance)}
                  </Text>
                </View>
              )}
            </>
          )}

          <View style={styles.actionRow}>
            <ActionBtn
              icon="qr-code-outline"
              label="Nạp cọc"
              onPress={() => router.push('/(tabs)/account/wallet-topup' as never)}
            />
            <ActionBtn
              icon="swap-horizontal-outline"
              label="Chuyển vốn"
              variant="outline"
              onPress={() => router.push('/(tabs)/account/wallet-transfer' as never)}
            />
          </View>
        </View>

        {/* ── Ví hoa hồng ──────────────────────────────────── */}
        <View style={styles.commissionCard}>
          <View style={styles.commissionHeader}>
            <View style={styles.commissionIconWrapper}>
              <Ionicons name="gift-outline" size={18} color={Colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.commissionTitle}>Ví hoa hồng</Text>
              <Text style={styles.commissionNote}>Công ty chi trả định kỳ hàng tháng</Text>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 8 }} />
          ) : (
            <Text style={styles.commissionBalance}>
              {formatVND(w?.commissionBalance ?? 0)}
            </Text>
          )}
        </View>

        {/* ── Tài khoản nhận hoa hồng ──────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tài khoản nhận hoa hồng</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/account/wallet-payout-accounts' as never)}>
              <Text style={styles.sectionAction}>Quản lý</Text>
            </TouchableOpacity>
          </View>

          {accountsQuery.isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
          ) : primaryAccount ? (
            <View style={styles.bankCard}>
              <View style={styles.bankIconWrapper}>
                <Ionicons name="business-outline" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bankName}>{primaryAccount.bankName}</Text>
                <Text style={styles.bankAccount}>
                  {primaryAccount.accountNumber.replace(/(\d{4})(?=\d)/g, '$1 ')}
                </Text>
                <Text style={styles.bankHolder}>{primaryAccount.accountHolder}</Text>
              </View>
              {primaryAccount.isPrimary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Chính</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addAccountBtn}
              onPress={() => router.push('/(tabs)/account/wallet-payout-accounts' as never)}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.addAccountText}>Thêm tài khoản nhận hoa hồng</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Quick links ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch sử & Chi tiết</Text>
          <View style={styles.quickLinksCard}>
            <QuickLink
              icon="swap-vertical-outline"
              label="Lịch sử biến động ví"
              onPress={() => router.push('/(tabs)/account/wallet-ledger' as never)}
            />
            <View style={styles.divider} />
            <QuickLink
              icon="cash-outline"
              label="Lịch sử chi trả hoa hồng"
              onPress={() => router.push('/(tabs)/account/wallet-payouts' as never)}
            />
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.noteText}>
            Hoa hồng được tính tự động sau mỗi giao dịch bán lẻ. Công ty sẽ chi trả định kỳ
            vào tài khoản đã đăng ký (khấu trừ 10% thuế TNCN).
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16 },

  // Deposit card (purple gradient-like)
  depositCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circleTR: { width: 180, height: 180, top: -60, right: -60 },
  circleBL: { width: 120, height: 120, bottom: -40, left: -20 },
  cardLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  depositBalance: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  reservedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  reservedText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  actionBtnOutline: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  actionBtnTextOutline: { color: Colors.primary },

  // Commission card
  commissionCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  commissionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  commissionIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commissionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  commissionNote: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  commissionBalance: { fontSize: 26, fontWeight: '800', color: Colors.success },

  // Section
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionAction: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  // Bank card
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bankIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  bankAccount: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, letterSpacing: 1 },
  bankHolder: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  primaryBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  primaryBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    paddingVertical: 14,
  },
  addAccountText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  // Quick links
  quickLinksCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  quickLinkIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 60 },

  // Note
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
