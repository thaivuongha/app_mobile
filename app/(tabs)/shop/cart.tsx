import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useCartStore } from '@/src/stores/cartStore';

export default function CartScreen() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Giỏ hàng trống.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Quay lại mua hàng</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const total = getTotal();

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.price}>
                {Number(item.price).toLocaleString('vi-VN')}đ × {item.quantity}
              </Text>
            </View>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => updateQuantity(item.productId, -1)}
              >
                <Text>-</Text>
              </TouchableOpacity>
              <Text style={styles.qty}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => updateQuantity(item.productId, 1)}
              >
                <Text>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => removeItem(item.productId)}>
              <Text style={styles.remove}>Xóa</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
      <View style={styles.footer}>
        <Text style={styles.total}>Tổng: {total.toLocaleString('vi-VN')}đ</Text>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push('/(tabs)/shop/checkout')}
        >
          <Text style={styles.checkoutBtnText}>Đặt hàng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 16 },
  button: {
    margin: 24,
    padding: 14,
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16 },
  list: { padding: 16, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowLeft: { flex: 1 },
  name: { fontWeight: '600' },
  price: { fontSize: 14, color: '#666', marginTop: 2 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  qtyBtn: { padding: 8 }, qty: { minWidth: 24, textAlign: 'center' },
  remove: { color: '#d32f2f', fontSize: 14 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  total: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  checkoutBtn: {
    backgroundColor: '#2f95dc',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
