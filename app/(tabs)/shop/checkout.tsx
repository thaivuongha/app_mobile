import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useCartStore } from '@/src/stores/cartStore';
import { useQuery } from '@tanstack/react-query';
import { getDeliveryAddresses } from '@/src/api/deliveryAddresses';
import { createOrder } from '@/src/api/orders';
import { ApiClientError } from '@/src/api/client';
import { useQueryClient } from '@tanstack/react-query';

export default function CheckoutScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { items, getTotal, clearCart } = useCartStore();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [newAddress, setNewAddress] = useState({
    recipientName: '',
    phone: '',
    addressLine: '',
    district: '',
    city: '',
    notes: '',
  });

  const { data: addressesData } = useQuery({
    queryKey: ['delivery-addresses'],
    queryFn: () => getDeliveryAddresses(),
  });

  const addresses = addressesData?.data ?? [];

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Lỗi', 'Giỏ hàng trống');
      return;
    }
    const hasAddress = selectedAddressId || (useNewAddress &&
      newAddress.recipientName && newAddress.phone && newAddress.addressLine && newAddress.district && newAddress.city);
    if (!hasAddress) {
      Alert.alert('Lỗi', 'Vui lòng chọn địa chỉ giao hàng hoặc nhập địa chỉ mới');
      return;
    }

    setLoading(true);
    try {
      const body: Parameters<typeof createOrder>[0] = {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        notes: notes || undefined,
      };
      if (selectedAddressId) {
        body.addressId = selectedAddressId;
      } else if (useNewAddress) {
        body.deliveryAddress = {
          recipientName: newAddress.recipientName,
          phone: newAddress.phone,
          addressLine: newAddress.addressLine,
          district: newAddress.district,
          city: newAddress.city,
          notes: newAddress.notes || undefined,
        };
      }

      await createOrder(body);
      await queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      clearCart();
      Alert.alert('Thành công', 'Đặt đơn thành công.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/orders') },
      ]);
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Đặt đơn thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  const total = getTotal();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Chọn địa chỉ giao hàng</Text>
      {addresses.map((addr) => (
        <TouchableOpacity
          key={addr.id}
          style={[styles.addressCard, selectedAddressId === addr.id && styles.addressCardSelected]}
          onPress={() => { setSelectedAddressId(addr.id); setUseNewAddress(false); }}
        >
          <Text style={styles.recipient}>{addr.recipientName} — {addr.phone}</Text>
          <Text style={styles.addr}>{addr.addressLine}, {addr.district}, {addr.city}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.addressCard, useNewAddress && styles.addressCardSelected]}
        onPress={() => { setUseNewAddress(true); setSelectedAddressId(null); }}
      >
        <Text style={styles.newAddr}>+ Giao đến địa chỉ mới</Text>
      </TouchableOpacity>

      {useNewAddress && (
        <View style={styles.newForm}>
          <TextInput style={styles.input} placeholder="Họ tên người nhận" value={newAddress.recipientName} onChangeText={(t) => setNewAddress((p) => ({ ...p, recipientName: t }))} />
          <TextInput style={styles.input} placeholder="Số điện thoại" value={newAddress.phone} onChangeText={(t) => setNewAddress((p) => ({ ...p, phone: t }))} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Địa chỉ (số nhà, đường)" value={newAddress.addressLine} onChangeText={(t) => setNewAddress((p) => ({ ...p, addressLine: t }))} />
          <TextInput style={styles.input} placeholder="Quận/Huyện" value={newAddress.district} onChangeText={(t) => setNewAddress((p) => ({ ...p, district: t }))} />
          <TextInput style={styles.input} placeholder="Tỉnh/Thành" value={newAddress.city} onChangeText={(t) => setNewAddress((p) => ({ ...p, city: t }))} />
          <TextInput style={styles.input} placeholder="Ghi chú" value={newAddress.notes} onChangeText={(t) => setNewAddress((p) => ({ ...p, notes: t }))} />
        </View>
      )}

      <Text style={styles.sectionTitle}>Ghi chú đơn hàng</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        placeholder="Ghi chú (tùy chọn)"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <View style={styles.footer}>
        <Text style={styles.total}>Tổng: {total.toLocaleString('vi-VN')}đ</Text>
        <TouchableOpacity
          style={[styles.placeBtn, loading && styles.buttonDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.placeBtnText}>Đặt đơn</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600', margin: 16, marginBottom: 8 },
  addressCard: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  addressCardSelected: { borderColor: '#2f95dc', backgroundColor: '#e3f2fd' },
  recipient: { fontWeight: '600' },
  addr: { fontSize: 14, color: '#666', marginTop: 4 },
  newAddr: { color: '#2f95dc', fontWeight: '500' },
  newForm: { padding: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  notes: { minHeight: 80 },
  footer: { padding: 16, marginBottom: 24 },
  total: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  placeBtn: { backgroundColor: '#2f95dc', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  placeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
