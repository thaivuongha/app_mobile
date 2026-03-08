import { useState, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyOrders, getOrder, cancelOrder, type Order } from '@/src/api/orders';
import { Colors } from '@/constants/Colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  PENDING:   { label: 'Chờ xác nhận', color: '#D97706', bg: '#FEF3C7', icon: 'time-outline' },
  CONFIRMED: { label: 'Đã xác nhận',  color: '#7C3AED', bg: '#EDE9FE', icon: 'checkmark-circle-outline' },
  SHIPPED:   { label: 'Đang giao',    color: '#2563EB', bg: '#DBEAFE', icon: 'bicycle-outline' },
  DELIVERED: { label: 'Đã giao',      color: '#059669', bg: '#D1FAE5', icon: 'bag-check-outline' },
  CANCELLED: { label: 'Đã hủy',       color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' },
};

const STATUS_FILTERS = [
  { key: undefined,   label: 'Tất cả' },
  { key: 'PENDING',   label: 'Chờ xác nhận' },
  { key: 'CONFIRMED', label: 'Xác nhận' },
  { key: 'SHIPPED',   label: 'Đang giao' },
  { key: 'DELIVERED', label: 'Đã giao' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

function formatOrderCode(code?: number) {
  if (!code) return '—';
  return '#' + String(code).padStart(6, '0');
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${time} · ${date}`;
}

function calcTotal(items: Order['items']) {
  return items.reduce(
    (sum, i) => sum + Number(i.priceAtOrder) * i.quantity,
    0,
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: Colors.textSecondary,
    bg: Colors.border,
    icon: 'help-circle-outline',
  };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const total = order.totalAmount ?? calcTotal(order.items ?? []);
  const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) ?? order.itemsCount ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardCode}>{formatOrderCode(order.orderCode)}</Text>
          <Text style={styles.cardDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      {/* Items preview */}
      {(order.items ?? []).length > 0 && (
        <View style={styles.cardItems}>
          {order.items.slice(0, 2).map((item, idx) => (
            <View key={idx} style={styles.cardItemRow}>
              <View style={styles.cardItemDot} />
              <Text style={styles.cardItemText} numberOfLines={1}>
                {item.productName}
                {item.brandName ? ` (${item.brandName})` : ''}
              </Text>
              <Text style={styles.cardItemQty}>×{item.quantity}</Text>
            </View>
          ))}
          {order.items.length > 2 && (
            <Text style={styles.cardMoreItems}>+ {order.items.length - 2} sản phẩm khác</Text>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.cardFooterLeft}>
          <Ionicons name="cube-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.cardFooterMeta}>{itemCount} sản phẩm</Text>
        </View>
        <View style={styles.cardFooterRight}>
          <Text style={styles.cardTotal}>{total.toLocaleString('vi-VN')}đ</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
  highlight,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={15} color={highlight ? Colors.primary : Colors.textMuted} />
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text
        style={[
          styles.detailRowValue,
          highlight && styles.detailRowValueHighlight,
          accent && styles.detailRowValueAccent,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

function OrderDetailModal({
  orderId,
  visible,
  onClose,
  onCancelled,
}: {
  orderId: string | null;
  visible: boolean;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => getOrder(orderId!),
    enabled: !!orderId && visible,
  });

  const handleCancel = () => {
    Alert.alert('Hủy đơn hàng', 'Bạn có chắc muốn hủy đơn này?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy đơn',
        style: 'destructive',
        onPress: async () => {
          if (!orderId) return;
          setCancelling(true);
          try {
            await cancelOrder(orderId);
            queryClient.invalidateQueries({ queryKey: ['my-orders'] });
            queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
            onCancelled();
          } catch {
            Alert.alert('Lỗi', 'Không thể hủy đơn. Vui lòng thử lại.');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const total = order ? calcTotal(order.items ?? []) : 0;
  const cfg = order ? (STATUS_CONFIG[order.status] ?? null) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafe}>
        {/* Modal header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
          <View style={{ width: 24 }} />
        </View>

        {isLoading ? (
          <View style={styles.modalLoading}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : order ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>

            {/* Status banner */}
            {cfg && (
              <View style={[styles.statusBanner, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon as any} size={28} color={cfg.color} />
                <View style={{ gap: 2 }}>
                  <Text style={[styles.statusBannerLabel, { color: cfg.color }]}>{cfg.label}</Text>
                  <Text style={styles.statusBannerDate}>{formatDate(order.updatedAt)}</Text>
                </View>
              </View>
            )}

            {/* Order meta */}
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Thông tin đơn hàng</Text>
              <DetailRow icon="receipt-outline" label="Mã đơn" value={formatOrderCode(order.orderCode)} highlight />
              <DetailRow icon="calendar-outline" label="Đặt lúc" value={formatDate(order.createdAt)} />
              <DetailRow icon="refresh-outline"  label="Cập nhật" value={formatDate(order.updatedAt)} />
              {order.notes ? (
                <DetailRow icon="chatbubble-outline" label="Ghi chú" value={order.notes} />
              ) : null}
              {order.adminNotes ? (
                <DetailRow icon="megaphone-outline" label="Phản hồi" value={order.adminNotes} accent />
              ) : null}
            </View>

            {/* Items */}
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Sản phẩm đã đặt</Text>
              {(order.items ?? []).map((item, idx) => {
                const subtotal = Number(item.priceAtOrder) * item.quantity;
                return (
                  <View
                    key={idx}
                    style={[styles.itemRow, idx < order.items.length - 1 && styles.itemRowBorder]}
                  >
                    <View style={styles.itemIconBox}>
                      <Ionicons name="cube-outline" size={18} color={Colors.primary} />
                    </View>
                    <View style={styles.itemMid}>
                      <Text style={styles.itemName}>{item.productName}</Text>
                      {item.brandName ? (
                        <Text style={styles.itemBrand}>{item.brandName}</Text>
                      ) : null}
                      <View style={styles.itemPriceLine}>
                        <View style={styles.qtyBadge}>
                          <Text style={styles.qtyBadgeText}>×{item.quantity}</Text>
                        </View>
                        <Text style={styles.itemUnitPrice}>
                          {Number(item.priceAtOrder).toLocaleString('vi-VN')}đ / cái
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.itemSubtotal}>{subtotal.toLocaleString('vi-VN')}đ</Text>
                  </View>
                );
              })}

              {/* Total */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tổng cộng</Text>
                <Text style={styles.totalValue}>{total.toLocaleString('vi-VN')}đ</Text>
              </View>
            </View>

            {/* Shipping address */}
            {order.shippingAddress && (
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Địa chỉ giao hàng</Text>
                <View style={styles.addrBox}>
                  <View style={styles.addrIconRow}>
                    <Ionicons name="person-outline" size={15} color={Colors.primary} />
                    <Text style={styles.addrName}>{order.shippingAddress.recipientName}</Text>
                    <Text style={styles.addrPhone}>{order.shippingAddress.phone}</Text>
                  </View>
                  <View style={styles.addrIconRow}>
                    <Ionicons name="location-outline" size={15} color={Colors.textSecondary} />
                    <Text style={styles.addrText}>
                      {[
                        order.shippingAddress.addressLine,
                        order.shippingAddress.ward,
                        order.shippingAddress.district,
                        order.shippingAddress.city,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </View>
                  {order.shippingAddress.notes ? (
                    <View style={styles.addrIconRow}>
                      <Ionicons name="chatbubble-outline" size={15} color={Colors.textMuted} />
                      <Text style={styles.addrNote}>{order.shippingAddress.notes}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}

            {/* Cancel button */}
            {order.status === 'PENDING' && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancel}
                disabled={cancelling}
                activeOpacity={0.8}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color={Colors.danger} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
                    <Text style={styles.cancelBtnText}>Hủy đơn hàng</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['my-orders', selectedStatus],
    queryFn: () => getMyOrders({ status: selectedStatus, limit: 50 }),
  });

  const orders = data?.data ?? [];

  const handleCancelled = useCallback(() => {
    refetch();
    setDetailId(null);
  }, [refetch]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
        {data?.meta && (
          <Text style={styles.headerSub}>{data.meta.total} đơn</Text>
        )}
      </View>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {STATUS_FILTERS.map((f) => {
          const active = selectedStatus === f.key;
          return (
            <TouchableOpacity
              key={String(f.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSelectedStatus(f.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centerStateText}>Đang tải...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.centerStateText}>Không tải được đơn hàng</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="bag-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.centerStateTitle}>Chưa có đơn hàng nào</Text>
          <Text style={styles.centerStateText}>
            {selectedStatus
              ? 'Không có đơn nào ở trạng thái này'
              : 'Bạn chưa đặt hàng lần nào'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => setDetailId(item.id)} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListFooterComponent={<View style={{ height: 24 }} />}
        />
      )}

      {/* Detail modal */}
      <OrderDetailModal
        orderId={detailId}
        visible={!!detailId}
        onClose={() => setDetailId(null)}
        onCancelled={handleCancelled}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },

  filterBar: { flexGrow: 0 },
  filterBarContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  centerStateTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  centerStateText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  list: { paddingHorizontal: 16, paddingTop: 4 },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  cardCode: { fontSize: 16, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5 },
  cardDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  cardItems: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  cardItemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardItemDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    opacity: 0.5,
  },
  cardItemText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  cardItemQty: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  cardMoreItems: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', paddingLeft: 11 },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cardFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardFooterMeta: { fontSize: 12, color: Colors.textMuted },
  cardFooterRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTotal: { fontSize: 16, fontWeight: '700', color: Colors.primary },

  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  modalLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { paddingBottom: 40 },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
  },
  statusBannerLabel: { fontSize: 16, fontWeight: '700' },
  statusBannerDate: { fontSize: 12, color: Colors.textSecondary },

  detailCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  detailCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailRowLabel: { fontSize: 13, color: Colors.textSecondary, width: 80 },
  detailRowValue: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: 'right',
    fontWeight: '500',
  },
  detailRowValueHighlight: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  detailRowValueAccent: { color: Colors.warning },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMid: { flex: 1, gap: 4 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  itemBrand: { fontSize: 12, color: Colors.textMuted },
  itemPriceLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  qtyBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  qtyBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  itemUnitPrice: { fontSize: 12, color: Colors.textSecondary },
  itemSubtotal: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'right',
    minWidth: 75,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.primaryLight,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },

  addrBox: { padding: 16, gap: 10 },
  addrIconRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  addrName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  addrPhone: { fontSize: 13, color: Colors.textSecondary, marginLeft: 8 },
  addrText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  addrNote: { flex: 1, fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 18 },

  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.danger },
});
