import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWalletBalance, getPayoutAccounts } from '@/src/api/wallet';
import { Colors } from '@/constants/Colors';

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

// ─── Quick link row ────────────────────────────────────────────────────────────

function QuickLink({
  icon,
  label,
  sublabel,
  onPress,
  iconBg,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <TouchableOpacity style={styles.quickLink} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickLinkIcon, iconBg ? { backgroundColor: iconBg } : undefined]}>
        <Ionicons name={icon} size={18} color={iconColor ?? Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.quickLinkLabel}>{label}</Text>
        {sublabel && <Text style={styles.quickLinkSub}>{sublabel}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function WalletCommissionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const balanceQuery = useQuery({ queryKey: ['wallet'], queryFn: getWalletBalance });
  const accountsQuery = useQuery({ queryKey: ['payout-accounts'], queryFn: getPayoutAccounts });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    }, [queryClient]),
  );

  const w = balanceQuery.data;
  const accounts = accountsQuery.data ?? [];
  const primaryAccount = accounts.find((a) => a.isPrimary) ?? accounts[0] ?? null;
  const isLoading = balanceQuery.isLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={balanceQuery.isRefetching || accountsQuery.isRefetching}
            onRefresh={() => {
              balanceQuery.refetch();
              accountsQuery.refetch();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* ── Balance card ─────────────────────────────────── */}
        <View style={styles.balanceCard}>
          <View style={[styles.circle, styles.circleTR]} />
          <View style={[styles.circle, styles.circleBL]} />

          <View style={styles.cardLabelRow}>
            <Ionicons name="gift-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.cardLabel}>Ví hoa hồng</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} />
          ) : (
            <Text style={styles.balanceAmount}>
              {formatVND(w?.commissionBalance ?? 0)}
            </Text>
          )}

          <View style={styles.cardNote}>
            <Ionicons name="information-circle-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={styles.cardNoteText}>
              Công ty chi trả định kỳ hàng tháng (khấu trừ 10% thuế TNCN)
            </Text>
          </View>
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

        {/* ── Lịch sử & Chi tiết ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch sử & Chi tiết</Text>
          <View style={styles.quickLinksCard}>
            <QuickLink
              icon="swap-vertical-outline"
              label="Lịch sử biến động hoa hồng"
              sublabel="Xem tất cả giao dịch cộng/trừ"
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/account/wallet-ledger' as never,
                  params: { walletType: 'COMMISSION' },
                } as never)
              }
            />
            <View style={styles.divider} />
            <QuickLink
              icon="cash-outline"
              label="Lịch sử chi trả hoa hồng"
              sublabel="Các đợt công ty đã chuyển khoản"
              onPress={() => router.push('/(tabs)/account/wallet-payouts' as never)}
            />
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={15} color={Colors.textMuted} />
          <Text style={styles.noteText}>
            Hoa hồng tích lũy tự động sau mỗi giao dịch bán lẻ từ thiết bị vending. Số dư được chi trả định kỳ vào tài khoản đã đăng ký.
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

  // Balance card
  balanceCard: {
    backgroundColor: Colors.success,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
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
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  cardLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 10 },
  cardNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 4 },
  cardNoteText: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 16 },

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
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  quickLinkSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 60 },

  // Note
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
});
