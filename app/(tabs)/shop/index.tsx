import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getProducts } from '@/src/api/products';
import { useCartStore } from '@/src/stores/cartStore';
import { useQuery as useOrdersBadge } from '@tanstack/react-query';
import { getMyOrders } from '@/src/api/orders';
import type { Product } from '@/src/api/products';
import { Colors } from '@/constants/Colors';
import { useState } from 'react';

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const cartItems = useCartStore((s) => s.items);
  const cartQty = cartItems.find((i) => i.productId === product.id)?.quantity ?? 0;

  return (
    <View style={styles.card}>
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="cube-outline" size={32} color={Colors.textMuted} />
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.brand} numberOfLines={1}>{product.brandName}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.price}>{Number(product.price).toLocaleString('vi-VN')}đ</Text>
          <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
            {cartQty > 0 ? (
              <View style={styles.addBtnActive}>
                <Text style={styles.addBtnQty}>{cartQty}</Text>
              </View>
            ) : (
              <Ionicons name="add" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function ShopScreen() {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts({ limit: 100 }),
  });

  const ordersQuery = useOrdersBadge({
    queryKey: ['my-orders', 'pending-count'],
    queryFn: () => getMyOrders({ limit: 1, status: 'PENDING' }),
  });
  const pendingCount = ordersQuery.data?.meta?.total ?? 0;

  const products = (data?.data ?? []).filter((p) =>
    search.length === 0 ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brandName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddToCart = (product: Product) => {
    addItem(product.id, product.name, product.price, 1);
  };

  const renderItem = ({ item }: { item: Product }) => (
    <ProductCard product={item} onAdd={() => handleAddToCart(item)} />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shop</Text>
        <View style={styles.headerActions}>
          {/* Delivery addresses */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/(tabs)/shop/addresses')}
          >
            <Ionicons name="location-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Orders */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/(tabs)/orders')}
          >
            <Ionicons name="receipt-outline" size={22} color={Colors.textSecondary} />
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {pendingCount > 99 ? '99+' : String(pendingCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Cart */}
          <TouchableOpacity
            style={[styles.iconBtn, styles.cartBtn]}
            onPress={() => router.push('/(tabs)/shop/cart')}
          >
            <Ionicons name="cart-outline" size={22} color={cartCount > 0 ? '#fff' : Colors.textSecondary} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : String(cartCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm sản phẩm..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Products */}
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={products.length === 0 ? styles.listEmpty : styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={56} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {search.length > 0 ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cartBtn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  badge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: Colors.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: Colors.warning,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Search
  searchRow: { paddingHorizontal: 16, paddingVertical: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  // List
  list: { padding: 8, paddingBottom: 24 },
  listEmpty: { flexGrow: 1 },
  row: { justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 12 },

  // Card
  card: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 110 },
  imagePlaceholder: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 10 },
  productName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, lineHeight: 18 },
  brand: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  price: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnActive: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnQty: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // States
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
});
