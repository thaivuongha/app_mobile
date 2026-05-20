import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWalletLedger, LEDGER_LABELS } from '@/src/api/wallet';
import type { LedgerEntry } from '@/src/api/wallet';
import { Colors } from '@/constants/Colors';

const PAGE_SIZE = 20;

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type WalletFilter = 'ALL' | 'DEPOSIT' | 'COMMISSION';

const FILTERS: { label: string; value: WalletFilter }[] = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Vận hành', value: 'DEPOSIT' },
  { label: 'Hoa hồng', value: 'COMMISSION' },
];

function parseWalletFilterParam(raw?: string): WalletFilter {
  if (raw === 'DEPOSIT' || raw === 'COMMISSION' || raw === 'ALL') return raw;
  return 'ALL';
}

// ─── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({ entry }: { entry: LedgerEntry }) {
  const isCredit = entry.direction === 'CREDIT';
  const isCommission = entry.walletType === 'COMMISSION';

  const iconName: keyof typeof Ionicons.glyphMap = isCredit
    ? 'arrow-down-circle-outline'
    : 'arrow-up-circle-outline';

  const amountColor = isCredit ? Colors.success : Colors.danger;

  return (
    <View style={styles.entryRow}>
      {/* Icon */}
      <View style={[styles.entryIcon, isCredit ? styles.entryIconCredit : styles.entryIconDebit]}>
        <Ionicons name={iconName} size={18} color={isCredit ? Colors.success : Colors.danger} />
      </View>

      {/* Info */}
      <View style={styles.entryInfo}>
        <Text style={styles.entryType}>{LEDGER_LABELS[entry.entryType] ?? entry.entryType}</Text>
        <View style={styles.entryMeta}>
          <View style={[styles.walletBadge, isCommission ? styles.walletBadgeHH : undefined]}>
            <Text style={[styles.walletBadgeText, isCommission ? styles.walletBadgeTextHH : undefined]}>
              {isCommission ? 'Hoa hồng' : 'Vận hành'}
            </Text>
          </View>
          <Text style={styles.entryDate}>{formatDate(entry.createdAt)}</Text>
        </View>
        {entry.note && <Text style={styles.entryNote} numberOfLines={1}>{entry.note}</Text>}
      </View>

      {/* Amount + balance */}
      <View style={styles.entryRight}>
        <Text style={[styles.entryAmount, { color: amountColor }]}>
          {isCredit ? '+' : '-'}{formatVND(entry.amount)}
        </Text>
        <Text style={styles.entryBalance}>{formatVND(entry.balanceAfter)}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function WalletLedgerScreen() {
  const params = useLocalSearchParams<{ walletType?: string | string[] }>();
  const rawType = params.walletType;
  const walletTypeStr =
    typeof rawType === 'string' ? rawType : Array.isArray(rawType) ? rawType[0] : undefined;
  const initialFilter = parseWalletFilterParam(walletTypeStr);
  const [filter, setFilter] = useState<WalletFilter>(initialFilter);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['wallet-ledger', filter],
    queryFn: ({ pageParam = 0 }) =>
      getWalletLedger({
        walletType: filter === 'ALL' ? undefined : filter,
        limit: PAGE_SIZE,
        offset: pageParam as number,
      }),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((s, p) => s + p.data.length, 0);
      return loaded < last.meta.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });

  const entries: LedgerEntry[] = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar style="dark" />

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterChipText, filter === f.value && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
        {!isLoading && (
          <Text style={styles.totalCount}>{total} mục</Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Chưa có lịch sử biến động</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EntryRow entry={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          onRefresh={refetch}
          refreshing={isRefetching}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  totalCount: { marginLeft: 'auto', fontSize: 12, color: Colors.textMuted },

  list: { paddingVertical: 8 },
  separator: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },

  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryIconCredit: { backgroundColor: Colors.successLight },
  entryIconDebit: { backgroundColor: Colors.dangerLight },
  entryInfo: { flex: 1, gap: 3 },
  entryType: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  walletBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
  },
  walletBadgeHH: { backgroundColor: Colors.successLight },
  walletBadgeText: { fontSize: 10, fontWeight: '600', color: Colors.primary },
  walletBadgeTextHH: { color: Colors.success },
  entryDate: { fontSize: 11, color: Colors.textMuted },
  entryNote: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },
  entryRight: { alignItems: 'flex-end', gap: 3 },
  entryAmount: { fontSize: 14, fontWeight: '700' },
  entryBalance: { fontSize: 11, color: Colors.textMuted },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 40,
  },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
});
