import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import {
  getDeliveryAddresses,
  deleteDeliveryAddress,
  type DeliveryAddress,
} from '@/src/api/deliveryAddresses';
import { ApiClientError } from '@/src/api/client';

export default function DeliveryAddressesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-addresses'],
    queryFn: () => getDeliveryAddresses(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDeliveryAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['delivery-addresses'] }),
  });

  const addresses = data?.data ?? [];

  const handleDelete = (addr: DeliveryAddress) => {
    Alert.alert('Xóa địa chỉ', `Xóa "${addr.recipientName}"?`, [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () =>
          deleteMutation.mutate(addr.id, {
            onError: (e) =>
              Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Xóa thất bại'),
          }),
      },
    ]);
  };

  if (isLoading) return <ActivityIndicator style={styles.loader} />;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => router.push('/(tabs)/settings/delivery-address-form')}
      >
        <Text style={styles.addBtnText}>+ Thêm địa chỉ</Text>
      </TouchableOpacity>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.recipient}>{item.recipientName} — {item.phone}</Text>
            <Text style={styles.addr}>
              {item.addressLine}, {item.district}, {item.city}
            </Text>
            {item.isDefault && (
              <Text style={styles.badge}>Mặc định</Text>
            )}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/settings/delivery-address-form',
                    params: { id: item.id },
                  })
                }
              >
                <Text style={styles.link}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)}>
                <Text style={styles.deleteLink}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có địa chỉ. Nhấn "Thêm địa chỉ".</Text>}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 24 },
  addBtn: {
    margin: 16,
    padding: 14,
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  recipient: { fontWeight: '600' },
  addr: { fontSize: 14, color: '#666', marginTop: 4 },
  badge: { fontSize: 12, color: '#2f95dc', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 12, gap: 16 },
  link: { color: '#2f95dc' },
  deleteLink: { color: '#d32f2f' },
  empty: { padding: 24, textAlign: 'center', color: '#666' },
});
