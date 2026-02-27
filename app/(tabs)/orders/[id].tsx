import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { getOrder, cancelOrder } from '@/src/api/orders';
import { ApiClientError } from '@/src/api/client';

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
    Alert.alert('Hủy đơn', 'Bạn có chắc muốn hủy đơn hàng này?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy đơn',
        style: 'destructive',
        onPress: () => {
          cancelMutation.mutate(undefined, {
            onError: (e) => {
              const msg = e instanceof ApiClientError ? e.message : 'Hủy đơn thất bại';
              Alert.alert('Lỗi', msg);
            },
            onSuccess: () => Alert.alert('Thành công', 'Đã hủy đơn.', [{ text: 'OK', onPress: () => router.back() }]),
          });
        },
      },
    ]);
  };

  if (isLoading || !order) {
    return <ActivityIndicator style={styles.loader} />;
  }

  const canCancel = order.status === 'PENDING';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Trạng thái</Text>
        <Text style={styles.value}>{STATUS_LABEL[order.status] ?? order.status}</Text>
        <Text style={styles.muted}>Tạo lúc: {new Date(order.createdAt).toLocaleString('vi-VN')}</Text>
      </View>

      {order.shippingAddress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
          <Text>{order.shippingAddress.recipientName} — {order.shippingAddress.phone}</Text>
          <Text style={styles.muted}>
            {order.shippingAddress.addressLine}, {order.shippingAddress.district}, {order.shippingAddress.city}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sản phẩm</Text>
        {order.items.map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.productName} × {item.quantity}</Text>
            <Text>{Number(item.priceAtOrder).toLocaleString('vi-VN')}đ</Text>
          </View>
        ))}
      </View>

      {order.notes && (
        <View style={styles.section}>
          <Text style={styles.label}>Ghi chú</Text>
          <Text>{order.notes}</Text>
        </View>
      )}

      {canCancel && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
          disabled={cancelMutation.isPending}
        >
          {cancelMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.cancelBtnText}>Hủy đơn hàng</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 24 },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  label: { fontSize: 14, color: '#666', marginBottom: 4 },
  value: { fontSize: 16 },
  muted: { fontSize: 14, color: '#666', marginTop: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  itemName: { flex: 1 },
  cancelBtn: {
    margin: 16,
    padding: 14,
    backgroundColor: '#d32f2f',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
