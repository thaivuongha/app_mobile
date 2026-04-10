import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  StatusBar,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getProducts } from '@/src/api/products';
import { useCartStore } from '@/src/stores/cartStore';
import { useQuery as useOrdersBadge } from '@tanstack/react-query';
import { getMyOrders } from '@/src/api/orders';
import type { Product } from '@/src/api/products';
import { Colors } from '@/constants/Colors';
import { useState, useCallback } from 'react';

// ─── Add-to-cart popup ────────────────────────────────────────────────────────

function AddToCartModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const [qty, setQty] = useState(1);
  const [inputVal, setInputVal] = useState('1');

  const cartQty = product
    ? (cartItems.find((i) => i.productId === product.id)?.quantity ?? 0)
    : 0;

  const changeQty = useCallback((next: number) => {
    const clamped = Math.max(1, Math.min(99, next));
    setQty(clamped);
    setInputVal(String(clamped));
  }, []);

  const handleInputChange = (text: string) => {
    setInputVal(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed)) changeQty(parsed);
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputVal, 10);
    if (isNaN(parsed) || parsed < 1) {
      setQty(1);
      setInputVal('1');
    }
  };

  const handleAdd = () => {
    if (!product) return;
    addItem(
      product.id,
      product.name,
      product.price,
      product.commissionAmount,
      product.sellingPrice,
      product.imageUrl ?? null,
      qty
    );
    onClose();
  };

  if (!product) return null;

  return (
    <Modal
      visible={!!product}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View style={styles.modalSheet}>
          {/* Handle bar */}
          <View style={styles.sheetHandle} />

          {/* Product info */}
          <View style={styles.modalProduct}>
            {product.imageUrl ? (
              <Image
                source={{ uri: product.imageUrl }}
                style={styles.modalImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.modalImage, styles.modalImagePlaceholder]}>
                <Ionicons name="cube-outline" size={36} color={Colors.textMuted} />
              </View>
            )}
            <View style={styles.modalProductInfo}>
              <Text style={styles.modalProductName} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.modalBrand}>{product.brandName}</Text>
              <View style={styles.modalPriceBlock}>
                <View style={styles.modalPriceRow}>
                  <Text style={styles.modalPriceLabel}>Giá nhập</Text>
                  <Text style={styles.modalPriceValue}>
                    {Number(product.price).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
                <View style={styles.modalPriceRow}>
                  <Text style={styles.modalPriceLabel}>Hoa hồng</Text>
                  <Text style={styles.modalCommissionValue}>
                    +{Number(product.commissionAmount).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
                <View style={[styles.modalPriceRow, styles.modalPriceRowFinal]}>
                  <Text style={styles.modalPriceFinalLabel}>Giá bán</Text>
                  <Text style={styles.modalPriceFinalValue}>
                    {Number(product.sellingPrice).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              </View>
              {cartQty > 0 && (
                <Text style={styles.modalCartNote}>
                  Đang có {cartQty} trong giỏ
                </Text>
              )}
            </View>
          </View>

          {product.description ? (
            <Text style={styles.modalDesc} numberOfLines={3}>
              {product.description}
            </Text>
          ) : null}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Quantity selector */}
          <Text style={styles.qtyLabel}>Chọn số lượng</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={[styles.qtyCircle, qty <= 1 && styles.qtyCircleDisabled]}
              onPress={() => changeQty(qty - 1)}
              disabled={qty <= 1}
            >
              <Ionicons
                name="remove"
                size={20}
                color={qty <= 1 ? Colors.textMuted : Colors.primary}
              />
            </TouchableOpacity>

            <TextInput
              style={styles.qtyInput}
              value={inputVal}
              onChangeText={handleInputChange}
              onBlur={handleInputBlur}
              keyboardType="number-pad"
              selectTextOnFocus
              maxLength={2}
            />

            <TouchableOpacity
              style={[styles.qtyCircle, qty >= 99 && styles.qtyCircleDisabled]}
              onPress={() => changeQty(qty + 1)}
              disabled={qty >= 99}
            >
              <Ionicons
                name="add"
                size={20}
                color={qty >= 99 ? Colors.textMuted : Colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Total */}
          <View style={styles.modalTotalRow}>
            <View>
              <Text style={styles.modalTotalLabel}>Vốn giữ</Text>
              <Text style={styles.modalTotalSub}>
                +{(Number(product.commissionAmount) * qty).toLocaleString('vi-VN')}đ hoa hồng
              </Text>
            </View>
            <Text style={styles.modalTotalValue}>
              {(Number(product.price) * qty).toLocaleString('vi-VN')}đ
            </Text>
          </View>

          {/* Add button */}
          <TouchableOpacity style={styles.addToCartBtn} onPress={handleAdd}>
            <Ionicons name="cart" size={20} color="#fff" />
            <Text style={styles.addToCartBtnText}>Thêm vào giỏ hàng</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const cartQty = useCartStore(
    (s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0
  );

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {product.imageUrl ? (
        <Image
          source={{ uri: product.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="cube-outline" size={32} color={Colors.textMuted} />
        </View>
      )}

      {cartQty > 0 && (
        <View style={styles.cartBadgeOnCard}>
          <Text style={styles.cartBadgeText}>{cartQty}</Text>
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.brand} numberOfLines={1}>
          {product.brandName}
        </Text>
        {/* 3-tier pricing */}
        <View style={styles.priceBlock}>
          <View style={styles.priceRow}>
            <Text style={styles.priceRowLabel}>Nhập</Text>
            <Text style={styles.priceRowValue}>
              {Number(product.price).toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={styles.priceRow}>
            <View style={styles.commissionBadge}>
              <Text style={styles.commissionBadgeText}>HH</Text>
            </View>
            <Text style={styles.commissionValue}>
              +{Number(product.commissionAmount).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.priceSellLabel}>Giá bán</Text>
            <Text style={styles.priceSell}>
              {Number(product.sellingPrice).toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={styles.addBtn}>
            <Ionicons name="add" size={18} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const router = useRouter();
  const cartCount = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.quantity, 0)
  );
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts({ limit: 100 }),
    retry: 2,
  });

  // Refetch danh sách sản phẩm mỗi khi user mở tab Shop (để thấy sản phẩm admin vừa tạo)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const ordersQuery = useOrdersBadge({
    queryKey: ['my-orders', 'pending-count'],
    queryFn: () => getMyOrders({ limit: 1, status: 'PENDING' }),
  });
  const pendingCount = ordersQuery.data?.meta?.total ?? 0;

  const products = (data?.data ?? []).filter(
    (p) =>
      search.length === 0 ||
      (p.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.brandName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard product={item} onPress={() => setSelectedProduct(item)} />
    ),
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shop</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/(tabs)/shop/addresses')}
          >
            <Ionicons name="location-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

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

          <TouchableOpacity
            style={[styles.iconBtn, styles.cartIconBtn]}
            onPress={() => router.push('/(tabs)/shop/cart')}
          >
            <Ionicons
              name="cart-outline"
              size={22}
              color={cartCount > 0 ? '#fff' : Colors.textSecondary}
            />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.badgeText}>
                  {cartCount > 99 ? '99+' : String(cartCount)}
                </Text>
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

      {/* Product list */}
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
        </View>
      ) : isError ? (
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.danger} />
          <Text style={styles.errorTitle}>Không tải được sản phẩm</Text>
          <Text style={styles.errorMsg}>
            {(error as { message?: string })?.message ??
              'Lỗi kết nối. Kiểm tra lại mạng và thử lại.'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={
            products.length === 0 ? styles.listEmpty : styles.list
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
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

      {/* Add-to-cart popup — key theo product.id giúp reset state (qty) khi đổi sản phẩm */}
      <AddToCartModal
        key={selectedProduct?.id ?? 'none'}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
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
  cartIconBtn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
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
  cartBadgeOnCard: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 10 },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  brand: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  // 3-tier pricing on card
  priceBlock: { marginTop: 6, gap: 3 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceRowLabel: { fontSize: 10, color: Colors.textMuted, width: 28 },
  priceRowValue: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  commissionBadge: {
    width: 18,
    height: 14,
    borderRadius: 3,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commissionBadgeText: { fontSize: 8, fontWeight: '800', color: Colors.success },
  commissionValue: { fontSize: 11, color: Colors.success, fontWeight: '600' },
  priceSellLabel: { fontSize: 10, color: Colors.textMuted },
  priceSell: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // States
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.danger,
    textAlign: 'center',
  },
  errorMsg: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Modal / bottom sheet
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 28,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalProduct: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  modalImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  modalImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  modalProductInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  modalProductName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  modalBrand: { fontSize: 13, color: Colors.textSecondary },
  // 3-tier pricing in modal
  modalPriceBlock: { marginTop: 6, gap: 4 },
  modalPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalPriceRowFinal: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalPriceLabel: { fontSize: 12, color: Colors.textMuted },
  modalPriceValue: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  modalCommissionValue: { fontSize: 13, fontWeight: '600', color: Colors.success },
  modalPriceFinalLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  modalPriceFinalValue: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  modalCartNote: { fontSize: 12, color: Colors.primary, marginTop: 2 },
  modalDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 4 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  qtyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  qtyCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyCircleDisabled: { borderColor: Colors.border },
  qtyInput: {
    width: 72,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 20,
  },
  modalTotalLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  modalTotalSub: { fontSize: 11, color: Colors.success, marginTop: 2 },
  modalTotalValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  addToCartBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
