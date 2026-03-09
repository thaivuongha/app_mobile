import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
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

export default function DeliveryAddressesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { from } = useLocalSearchParams<{ from?: string }>();
  // Nếu được mở từ account tab thì sub-navigation dùng account stack
  const formPath = from === 'account'
    ? '/(tabs)/account/delivery-address-form'
    : '/(tabs)/settings/delivery-address-form';

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
    Alert.alert('Xóa địa chỉ', `Xóa địa chỉ của "${addr.recipientName}"?`, [
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

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push(formPath as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Thêm địa chỉ mới</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.cardIconBox}>
                <Ionicons name="location-outline" size={18} color={Colors.primary} />
              </View>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTopRow}>
                <Text style={styles.recipient}>{item.recipientName}</Text>
                {item.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Mặc định</Text>
                  </View>
                )}
              </View>
              <Text style={styles.phone}>{item.phone}</Text>
              <Text style={styles.addr} numberOfLines={2}>
                {item.addressLine}, {item.district}, {item.city}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() =>
                    router.push({
                      pathname: formPath as any,
                      params: { id: item.id },
                    })
                  }
                >
                  <Ionicons name="create-outline" size={14} color={Colors.primary} />
                  <Text style={styles.editBtnText}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                  <Text style={styles.deleteBtnText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}>
              <Ionicons name="location-outline" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có địa chỉ</Text>
            <Text style={styles.emptyDesc}>Thêm địa chỉ để đặt hàng nhanh hơn</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  list: { padding: 16, paddingBottom: 40, gap: 10 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, height: 52,
    marginBottom: 6,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  card: {
    flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 12,
  },
  cardLeft: {},
  cardIconBox: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  recipient: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  defaultBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  defaultBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  phone: { fontSize: 13, color: Colors.textSecondary, marginBottom: 3 },
  addr: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },

  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary + '60', backgroundColor: Colors.primaryLight },
  editBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: Colors.danger + '40', backgroundColor: Colors.dangerLight },
  deleteBtnText: { fontSize: 13, color: Colors.danger, fontWeight: '600' },

  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 10 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});
