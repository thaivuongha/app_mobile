import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { getMyOrders } from '@/src/api/orders';
import type { Order } from '@/src/api/orders';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export default function OrdersListScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => getMyOrders({ limit: 50 }),
  });

  const orders = data?.data ?? [];

  const renderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(tabs)/orders/${item.id}`)}
      activeOpacity={0.7}
    >
      <Text style={styles.orderId}>#{item.id.slice(0, 8)}</Text>
      <Text style={styles.status}>{STATUS_LABEL[item.status] ?? item.status}</Text>
      <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Text>
      {item.itemsCount != null && (
        <Text style={styles.muted}>{item.itemsCount} sản phẩm</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : orders.length === 0 ? (
        <Text style={styles.empty}>Chưa có đơn hàng.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  orderId: { fontSize: 16, fontWeight: '600' },
  status: { fontSize: 14, color: '#2f95dc', marginTop: 4 },
  date: { fontSize: 14, color: '#666', marginTop: 2 },
  muted: { fontSize: 12, color: '#888', marginTop: 2 },
  loader: { marginTop: 24 },
  empty: { padding: 24, textAlign: 'center', color: '#666' },
});
