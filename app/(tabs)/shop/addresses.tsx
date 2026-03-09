/**
 * Màn hình Địa chỉ giao hàng — truy cập từ Tab Shop
 * Re-use toàn bộ API và logic từ settings/delivery-addresses.tsx
 */
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getDeliveryAddresses,
  deleteDeliveryAddress,
  type DeliveryAddress,
} from '@/src/api/deliveryAddresses';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

export default function ShopAddressesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-addresses'],
    queryFn: getDeliveryAddresses,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDeliveryAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['delivery-addresses'] }),
  });

  const addresses = data?.data ?? [];

  const handleDelete = (addr: DeliveryAddress) => {
    Alert.alert('Xóa địa chỉ', `Xóa địa chỉ của "${addr.recipientName}"?`, [
      { text: 'Hủy', style: 'cancel' },
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Địa chỉ giao hàng</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(tabs)/settings/delivery-address-form')}
        >
          <Ionicons name="add" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={addresses.length === 0 ? styles.listEmpty : styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <AddressCard item={item} onDelete={handleDelete} router={router} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={56} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Chưa có địa chỉ</Text>
              <Text style={styles.emptySubtitle}>
                Thêm địa chỉ để sử dụng khi đặt hàng
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/settings/delivery-address-form')}
              >
                <Text style={styles.emptyButtonText}>+ Thêm địa chỉ</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function AddressCard({
  item,
  onDelete,
  router,
}: {
  item: DeliveryAddress;
  onDelete: (a: DeliveryAddress) => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardIconBox}>
          <Ionicons name="location" size={20} color={Colors.primary} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.recipient}>{item.recipientName}</Text>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Mặc định</Text>
              </View>
            )}
          </View>
          <Text style={styles.phone}>{item.phone}</Text>
          <Text style={styles.addr} numberOfLines={2}>
            {item.addressLine}, {item.ward ? `${item.ward}, ` : ''}{item.district}, {item.city}
          </Text>
          {item.notes && (
            <Text style={styles.notes} numberOfLines={1}>Ghi chú: {item.notes}</Text>
          )}
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/settings/delivery-address-form',
              params: { id: item.id },
            })
          }
        >
          <Ionicons name="create-outline" size={15} color={Colors.primary} />
          <Text style={styles.editBtnText}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(item)}
        >
          <Ionicons name="trash-outline" size={15} color={Colors.danger} />
          <Text style={styles.deleteBtnText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginLeft: 4 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  list: { padding: 16, paddingBottom: 32 },
  listEmpty: { flexGrow: 1 },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  emptyButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTop: { flexDirection: 'row', gap: 12 },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  recipient: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
  },
  defaultBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  phone: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  addr: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  notes: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  deleteBtnText: { fontSize: 13, color: Colors.danger, fontWeight: '500' },
});
