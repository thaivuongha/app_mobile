import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getOrder, cancelOrder } from '@/src/api/orders';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = id!;

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
    enabled: !!orderId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
  });

  const handleCancel = () => {
    Alert.alert('Hủy đơn hàng', 'Bạn có chắc muốn hủy đơn hàng này?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy đơn',
        style: 'destructive',
        onPress: () =>
          cancelMutation.mutate(undefined, {
            onError: (e) => {
              Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Hủy đơn thất bại');
            },
            onSuccess: () =>
              Alert.alert('Thành công', 'Đã hủy đơn.', [{ text: 'OK', onPress: () => router.back() }]),
          }),
      },
    ]);
  };

  if (isLoading || !order) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const canCancel = order.status === 'PENDING';
  const total = order.items.reduce((s, i) => s + Number(i.priceAtOrder) * i.quantity, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View style={styles.statusCard}>
          <Ionicons name="receipt-outline" size={22} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusText}>{STATUS_LABEL[order.status] ?? order.status}</Text>
            <Text style={styles.statusDate}>{new Date(order.createdAt).toLocaleString('vi-VN')}</Text>
          </View>
        </View>

        {/* Address */}
        {order.shippingAddress && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>Địa chỉ giao hàng</Text>
            </View>
            <Text style={styles.addrName}>{order.shippingAddress.recipientName} — {order.shippingAddress.phone}</Text>
            <Text style={styles.addrDetail}>
              {order.shippingAddress.addressLine}, {order.shippingAddress.district}, {order.shippingAddress.city}
            </Text>
          </View>
        )}

        {/* Items */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cube-outline" size={16} color={Colors.primary} />
            <Text style={styles.cardTitle}>Sản phẩm ({order.items.length})</Text>
          </View>
          {order.items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={2}>{item.productName ?? '—'}</Text>
              <Text style={styles.itemQty}>×{item.quantity}</Text>
              <Text style={styles.itemPrice}>{Number(item.priceAtOrder).toLocaleString('vi-VN')}đ</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{total.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>Ghi chú</Text>
            </View>
            <Text style={styles.noteText}>{order.notes}</Text>
          </View>
        )}

        {canCancel && (
          <TouchableOpacity
            style={[styles.cancelBtn, cancelMutation.isPending && styles.btnDisabled]}
            onPress={handleCancel}
            disabled={cancelMutation.isPending}
            activeOpacity={0.85}
          >
            {cancelMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color="#fff" />
                <Text style={styles.cancelBtnText}>Hủy đơn hàng</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.primaryLight, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  statusText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  statusDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  addrName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 3 },
  addrDetail: { fontSize: 13, color: Colors.textMuted },

  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: Colors.border },
  itemName: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  itemQty: { fontSize: 13, color: Colors.textSecondary, marginHorizontal: 8 },
  itemPrice: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 10, borderTopWidth: 1.5, borderTopColor: Colors.primary + '30',
  },
  totalLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  totalValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },

  noteText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.danger, borderRadius: 14, height: 52,
    shadowColor: Colors.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  btnDisabled: { opacity: 0.65 },
  cancelBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
