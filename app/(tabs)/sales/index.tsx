import { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMyDevices } from '@/src/api/devices';
import { getTransactions } from '@/src/api/transactions';
import { getSalesSummary } from '@/src/api/sales';
import { Colors } from '@/constants/Colors';

// ─── Types ─────────────────────────────────────────────────────────────────────
type GroupBy = 'week' | 'month' | 'year';
type ActiveTab = 'history' | 'summary';

const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: 'week', label: 'Tuần' },
  { key: 'month', label: 'Tháng' },
  { key: 'year', label: 'Năm' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getDateRange(groupBy: GroupBy) {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now);
  if (groupBy === 'week') from.setDate(from.getDate() - 84); // 12 tuần
  else if (groupBy === 'month') from.setMonth(from.getMonth() - 12);
  else from.setFullYear(from.getFullYear() - 5);
  return { dateFrom: from.toISOString().slice(0, 10), dateTo: to };
}

function formatRevenue(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString('vi-VN');
}

// ─── Bar Chart ─────────────────────────────────────────────────────────────────
function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const BAR_MAX_H = 60;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
      <View style={styles.chartBars}>
        {data.map((item, idx) => (
          <View key={idx} style={styles.barWrapper}>
            <Text style={styles.barValue}>{formatRevenue(item.value)}</Text>
            <View style={[styles.bar, { height: Math.max((item.value / max) * BAR_MAX_H, 4) }]} />
            <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Summary Section ──────────────────────────────────────────────────────────
function SummaryTab({
  groupBy,
  setGroupBy,
  deviceId,
}: {
  groupBy: GroupBy;
  setGroupBy: (g: GroupBy) => void;
  deviceId: string | undefined;
}) {
  const { dateFrom, dateTo } = getDateRange(groupBy);

  const summaryQuery = useQuery({
    queryKey: ['sales-summary', groupBy, deviceId],
    queryFn: () => getSalesSummary({ groupBy, dateFrom, dateTo, deviceId }),
  });

  const rawItems = summaryQuery.data?.data ?? [];

  const chartData = useMemo(
    () =>
      rawItems.map((item) => {
        const raw = item.date ?? item.month ?? item.week ?? item.year ?? '';
        let label = raw;
        if (groupBy === 'month' && raw.length >= 7) label = raw.slice(5, 7) + '/' + raw.slice(0, 4);
        if (groupBy === 'week' && raw.includes('-W')) label = raw.replace('-W', '\nW');
        return { label, value: item.totalRevenue };
      }),
    [rawItems, groupBy]
  );

  const totalRevenue = rawItems.reduce((sum, i) => sum + (i.totalRevenue ?? 0), 0);
  const totalTx = rawItems.reduce((sum, i) => sum + (i.transactionCount ?? 0), 0);

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      {/* Group selector */}
      <View style={styles.groupRow}>
        {GROUP_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.groupChip, groupBy === opt.key && styles.groupChipActive]}
            onPress={() => setGroupBy(opt.key)}
          >
            <Text style={[styles.groupChipText, groupBy === opt.key && styles.groupChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: Colors.primaryLight }]}>
          <Text style={styles.kpiLabel}>Tổng doanh thu</Text>
          <Text style={styles.kpiValue}>{totalRevenue.toLocaleString('vi-VN')}đ</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={styles.kpiLabel}>Số giao dịch</Text>
          <Text style={[styles.kpiValue, { color: Colors.warning }]}>{totalTx}</Text>
        </View>
      </View>

      {/* Chart */}
      {summaryQuery.isLoading ? (
        <ActivityIndicator style={{ margin: 24 }} color={Colors.primary} />
      ) : chartData.length > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            Doanh thu theo {groupBy === 'week' ? 'tuần' : groupBy === 'month' ? 'tháng' : 'năm'}
          </Text>
          <MiniBarChart data={chartData} />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Chưa có dữ liệu doanh thu</Text>
        </View>
      )}

      {/* Table */}
      {rawItems.length > 0 && (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableCellDate]}>Kỳ</Text>
            <Text style={[styles.tableCell, styles.tableCellRev]}>Doanh thu</Text>
            <Text style={[styles.tableCell, styles.tableCellTx]}>Giao dịch</Text>
          </View>
          {rawItems.map((item, idx) => {
            const key = item.date ?? item.month ?? item.week ?? item.year ?? String(idx);
            return (
              <View key={key} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.tableCellDate]}>{key}</Text>
                <Text style={[styles.tableCell, styles.tableCellRev, styles.bold]}>
                  {(item.totalRevenue ?? 0).toLocaleString('vi-VN')}đ
                </Text>
                <Text style={[styles.tableCell, styles.tableCellTx, { color: Colors.textSecondary }]}>
                  {item.transactionCount}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ deviceId }: { deviceId: string | undefined }) {
  const dateFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const dateTo = new Date().toISOString().slice(0, 10);

  const txQuery = useQuery({
    queryKey: ['transactions', deviceId, dateFrom, dateTo],
    queryFn: () =>
      getTransactions({ deviceId, dateFrom, dateTo, status: 'PAID', limit: 100 }),
  });

  const transactions = txQuery.data?.data ?? [];
  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.finalPrice), 0);

  return (
    <View style={{ flex: 1 }}>
      {/* Total card */}
      {transactions.length > 0 && (
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>30 ngày gần nhất</Text>
          <Text style={styles.totalValue}>{totalRevenue.toLocaleString('vi-VN')}đ</Text>
          <Text style={styles.totalSub}>{transactions.length} giao dịch</Text>
        </View>
      )}

      {txQuery.isLoading ? (
        <ActivityIndicator style={{ margin: 24 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={transactions.length === 0 ? styles.listEmpty : styles.txList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.txRow}>
              <View style={styles.txIconBox}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              </View>
              <View style={styles.txContent}>
                <Text style={styles.txProduct}>{item.productName ?? 'Sản phẩm'}</Text>
                <Text style={styles.txDevice}>
                  {item.deviceName ?? item.deviceId}
                </Text>
                <Text style={styles.txDate}>
                  {new Date(item.createdAt).toLocaleString('vi-VN')}
                </Text>
              </View>
              <Text style={styles.txPrice}>
                {Number(item.finalPrice).toLocaleString('vi-VN')}đ
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={56} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Chưa có giao dịch</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function SalesScreen() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [groupBy, setGroupBy] = useState<GroupBy>('month');
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

  const devicesQuery = useQuery({
    queryKey: ['my-devices'],
    queryFn: () => getMyDevices(),
  });
  const devices = devicesQuery.data?.data ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Doanh thu</Text>
      </View>

      {/* Device filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.deviceFilter}
      >
        <TouchableOpacity
          style={[styles.deviceChip, !deviceId && styles.deviceChipActive]}
          onPress={() => setDeviceId(undefined)}
        >
          <Text style={[styles.deviceChipText, !deviceId && styles.deviceChipTextActive]}>
            Tất cả
          </Text>
        </TouchableOpacity>
        {devices.map((d) => (
          <TouchableOpacity
            key={d.id}
            style={[styles.deviceChip, deviceId === d.id && styles.deviceChipActive]}
            onPress={() => setDeviceId(deviceId === d.id ? undefined : d.id)}
          >
            <Text
              style={[styles.deviceChipText, deviceId === d.id && styles.deviceChipTextActive]}
              numberOfLines={1}
            >
              {d.deviceName || d.serialNumber}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'summary' && styles.tabItemActive]}
          onPress={() => setActiveTab('summary')}
        >
          <Ionicons
            name={activeTab === 'summary' ? 'bar-chart' : 'bar-chart-outline'}
            size={16}
            color={activeTab === 'summary' ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>
            Tổng hợp
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name={activeTab === 'history' ? 'receipt' : 'receipt-outline'}
            size={16}
            color={activeTab === 'history' ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Lịch sử
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'summary' ? (
          <SummaryTab groupBy={groupBy} setGroupBy={setGroupBy} deviceId={deviceId} />
        ) : (
          <HistoryTab deviceId={deviceId} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },

  // Device filter
  deviceFilter: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  deviceChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deviceChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  deviceChipText: { fontSize: 13, color: Colors.textSecondary },
  deviceChipTextActive: { color: Colors.primary, fontWeight: '600' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 7,
  },
  tabItemActive: { backgroundColor: Colors.primaryLight },
  tabText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '600' },

  content: { flex: 1, paddingHorizontal: 16 },

  // Group selector
  groupRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  groupChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  groupChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  groupChipTextActive: { color: '#fff' },

  // KPI
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
  },
  kpiLabel: { fontSize: 12, color: Colors.textSecondary },
  kpiValue: { fontSize: 20, fontWeight: '700', color: Colors.primary, marginTop: 4 },

  // Chart
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 12 },
  chartScroll: {},
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, minHeight: 100 },
  barWrapper: { alignItems: 'center', width: 44 },
  barValue: { fontSize: 9, color: Colors.textMuted, marginBottom: 2 },
  bar: { width: 24, backgroundColor: Colors.primary, borderRadius: 4, opacity: 0.85 },
  barLabel: { fontSize: 9, color: Colors.textSecondary, marginTop: 4, textAlign: 'center', width: 44 },

  // Table
  tableCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableRowAlt: { backgroundColor: Colors.background },
  tableCell: { fontSize: 13, color: Colors.textPrimary },
  tableCellDate: { flex: 1.2 },
  tableCellRev: { flex: 1.8, textAlign: 'right' },
  tableCellTx: { width: 70, textAlign: 'right' },
  bold: { fontWeight: '600' },

  // Total card
  totalCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 13, color: Colors.primary, flex: 1 },
  totalValue: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  totalSub: { fontSize: 12, color: Colors.textSecondary, marginLeft: 8 },

  // Transaction list
  txList: { paddingBottom: 24 },
  listEmpty: { flexGrow: 1 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txContent: { flex: 1 },
  txProduct: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  txDevice: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  txDate: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  txPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
});
