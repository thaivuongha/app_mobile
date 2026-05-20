import { useInfiniteQuery } from '@tanstack/react-query';
import {
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWalletPayouts } from '@/src/api/wallet';
import type { CommissionPayout } from '@/src/api/wallet';
import { Colors } from '@/constants/Colors';

const PAGE_SIZE = 20;

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CommissionPayout['status'] }) {
  const isPaid = status === 'PAID';
  return (
    <View style={[styles.statusBadge, isPaid ? styles.statusBadgePaid : styles.statusBadgePending]}>
      <Text style={[styles.statusText, isPaid ? styles.statusTextPaid : styles.statusTextPending]}>
        {isPaid ? 'Đã chi' : 'Đang xử lý'}
      </Text>
    </View>
  );
}

// ─── Payout card ──────────────────────────────────────────────────────────────

function PayoutCard({ payout }: { payout: CommissionPayout }) {
  const taxPct = Math.round(payout.taxRate * 100);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="cash-outline" size={18} color={Colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Chi trả hoa hồng</Text>
          <Text style={styles.cardDate}>
            {payout.status === 'PAID' && payout.processedAt
              ? `Ngày chi: ${formatDate(payout.processedAt)}`
              : `Tạo: ${formatDate(payout.createdAt)}`}
          </Text>
        </View>
        <StatusBadge status={payout.status} />
      </View>

      <View style={styles.amounts}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Tổng hoa hồng (gross)</Text>
          <Text style={styles.amountValue}>{formatVND(payout.grossAmount)}</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Thuế TNCN ({taxPct}%)</Text>
          <Text style={[styles.amountValue, { color: Colors.danger }]}>
            -{formatVND(payout.taxAmount)}
          </Text>
        </View>
        <View style={[styles.amountRow, styles.amountRowFinal]}>
          <Text style={styles.amountLabelFinal}>Thực nhận (net)</Text>
          <Text style={styles.amountValueFinal}>{formatVND(payout.netAmount)}</Text>
        </View>
      </View>

      {payout.payoutAccount && (
        <View style={styles.accountRow}>
          <Ionicons name="business-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.accountText}>
            {payout.payoutAccount.bankName} — {payout.payoutAccount.accountNumber}
          </Text>
        </View>
      )}

      {payout.note && (
        <Text style={styles.note} numberOfLines={2}>{payout.note}</Text>
      )}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function WalletPayoutsScreen() {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['wallet-payouts'],
    queryFn: ({ pageParam = 0 }) =>
      getWalletPayouts({ limit: PAGE_SIZE, offset: pageParam as number }),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((s, p) => s + p.data.length, 0);
      return loaded < last.meta.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });

  const payouts: CommissionPayout[] = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar style="dark" />

      {/* Summary header */}
      {!isLoading && total > 0 && (
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryText}>{total} lần chi trả</Text>
          <View style={styles.taxNote}>
            <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.taxNoteText}>Khấu trừ 10% thuế TNCN theo quy định</Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : payouts.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="cash-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Chưa có lịch sử chi trả</Text>
          <Text style={styles.emptySub}>
            Hoa hồng sẽ được công ty chi trả định kỳ hàng tháng vào tài khoản của bạn.
          </Text>
        </View>
      ) : (
        <FlatList
          data={payouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PayoutCard payout={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 32 },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  taxNote: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taxNoteText: { fontSize: 11, color: Colors.textMuted },

  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  cardDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgePaid: { backgroundColor: Colors.successLight },
  statusBadgePending: { backgroundColor: Colors.warningLight },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusTextPaid: { color: Colors.success },
  statusTextPending: { color: Colors.warning },

  amounts: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountRowFinal: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 2,
  },
  amountLabel: { fontSize: 13, color: Colors.textSecondary },
  amountValue: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  amountLabelFinal: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  amountValueFinal: { fontSize: 16, fontWeight: '800', color: Colors.success },

  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  accountText: { fontSize: 12, color: Colors.textMuted },
  note: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', marginTop: 6 },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
