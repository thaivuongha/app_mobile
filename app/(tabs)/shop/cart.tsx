import { useRouter } from 'expo-router';
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  StatusBar,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore, type CartItem } from '@/src/stores/cartStore';
import { Colors } from '@/constants/Colors';
import { useState } from 'react';

// ─── Cart item row ─────────────────────────────────────────────────────────────

function CartRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const [inputVal, setInputVal] = useState(String(item.quantity));

  // Sync inputVal khi quantity thay đổi từ bên ngoài
  const displayQty = item.quantity;

  const handleMinus = () => {
    if (item.quantity <= 1) {
      Alert.alert('Xóa sản phẩm', `Xóa "${item.name}" khỏi giỏ hàng?`, [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => removeItem(item.productId) },
      ]);
    } else {
      const next = item.quantity - 1;
      updateQuantity(item.productId, -1);
      setInputVal(String(next));
    }
  };

  const handlePlus = () => {
    if (item.quantity >= 999) return;
    const next = item.quantity + 1;
    updateQuantity(item.productId, 1);
    setInputVal(String(next));
  };

  const handleInputChange = (text: string) => {
    setInputVal(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
      setQuantity(item.productId, parsed);
    }
  };

  const handleInputBlur = () => {
    setInputVal(String(displayQty));
  };

  const handleRemove = () => {
    Alert.alert('Xóa sản phẩm', `Xóa "${item.name}" khỏi giỏ hàng?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => removeItem(item.productId) },
    ]);
  };

  const subtotal = Number(item.price) * item.quantity;

  return (
    <View style={styles.cartRow}>
      {/* Ảnh sản phẩm */}
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
      ) : (
        <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
          <Ionicons name="cube-outline" size={26} color={Colors.primary} />
        </View>
      )}

      {/* Nội dung */}
      <View style={styles.itemContent}>
        {/* Tên + nút xóa */}
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>
          <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Đơn giá */}
        <Text style={styles.itemUnit}>
          {Number(item.price).toLocaleString('vi-VN')}đ / cái
        </Text>

        {/* Thành tiền + bộ chọn số lượng */}
        <View style={styles.itemFooter}>
          <Text style={styles.subtotal}>{subtotal.toLocaleString('vi-VN')}đ</Text>

          <View style={styles.qtyControls}>
            <TouchableOpacity style={styles.qtyBtn} onPress={handleMinus}>
              <Ionicons
                name={item.quantity <= 1 ? 'trash-outline' : 'remove'}
                size={15}
                color={item.quantity <= 1 ? Colors.danger : Colors.primary}
              />
            </TouchableOpacity>

            <TextInput
              style={styles.qtyInput}
              value={inputVal}
              onChangeText={handleInputChange}
              onBlur={handleInputBlur}
              keyboardType="number-pad"
              selectTextOnFocus
              maxLength={3}
            />

            <TouchableOpacity
              style={[styles.qtyBtn, item.quantity >= 999 && styles.qtyBtnDisabled]}
              onPress={handlePlus}
              disabled={item.quantity >= 999}
            >
              <Ionicons
                name="add"
                size={15}
                color={item.quantity >= 999 ? Colors.textMuted : Colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CartScreen() {
  const router = useRouter();
  const { items, getTotalCost, getTotalCommission, clearCart } = useCartStore();

  const total = getTotalCost();
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const handleClear = () => {
    Alert.alert('Xóa giỏ hàng', 'Bạn có chắc muốn xóa toàn bộ giỏ hàng?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa tất cả', style: 'destructive', onPress: clearCart },
    ]);
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Giỏ hàng</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={Colors.border} />
          <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
          <Text style={styles.emptySubtitle}>Thêm sản phẩm để bắt đầu đặt hàng</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.back()}>
            <Ionicons name="storefront-outline" size={18} color="#fff" />
            <Text style={styles.shopBtnText}>Tiếp tục mua hàng</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Giỏ hàng</Text>
          <Text style={styles.headerSubtitle}>{itemCount} sản phẩm</Text>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Items + Footer — wrapped để keyboard không che quantity input */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => <CartRow item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Số lượng</Text>
            <Text style={styles.summaryValue}>{itemCount} sản phẩm</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Hoa hồng ước tính</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              +{getTotalCommission().toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Vốn giữ</Text>
            <Text style={styles.totalValue}>{total.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push('/(tabs)/shop/checkout')}
        >
          <View style={styles.checkoutLeft}>
            <View style={styles.checkoutBadge}>
              <Text style={styles.checkoutBadgeText}>{itemCount}</Text>
            </View>
            <Text style={styles.checkoutBtnText}>Đặt hàng</Text>
          </View>
          <Text style={styles.checkoutTotal}>{total.toLocaleString('vi-VN')}đ</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // List
  listContent: { padding: 16, paddingBottom: 8 },
  separator: { height: 10 },

  // Cart row
  cartRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  // Product image
  itemImage: {
    width: 90,
    height: 110,
  },
  itemImagePlaceholder: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },

  // Item content
  itemContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
    gap: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  itemUnit: { fontSize: 12, color: Colors.textSecondary },

  // Footer row inside item
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  subtotal: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Quantity controls
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 4,
    paddingVertical: 4,
    height: 36,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyInput: {
    width: 48,
    height: 28,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    padding: 0,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  shopBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Footer
  footer: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  summaryDivider: { height: 1, backgroundColor: Colors.border },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },

  // Checkout button
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  checkoutLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkoutBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  checkoutBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  checkoutBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  checkoutTotal: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
