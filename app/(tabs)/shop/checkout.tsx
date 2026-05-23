import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '@/src/stores/cartStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDeliveryAddresses,
  createDeliveryAddress,
  type DeliveryAddress,
} from '@/src/api/deliveryAddresses';
import { createOrder } from '@/src/api/orders';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';
import {
  LocationPicker,
  useProvinces,
  fetchDistricts,
  fetchWards,
  type LocationItem,
} from '@/components/LocationPicker';

// ─── Saved address card ────────────────────────────────────────────────────────

function SavedAddressCard({
  addr,
  selected,
  onSelect,
}: {
  addr: DeliveryAddress;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.addrCard, selected && styles.addrCardSelected]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <View style={styles.addrCardLeft}>
        <View style={[styles.addrIcon, selected && styles.addrIconSelected]}>
          <Ionicons
            name="location"
            size={18}
            color={selected ? '#fff' : Colors.primary}
          />
        </View>
        <View style={styles.addrInfo}>
          <View style={styles.addrTitleRow}>
            <Text style={[styles.addrName, selected && styles.addrNameSelected]}>
              {addr.recipientName}
            </Text>
            {addr.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Mặc định</Text>
              </View>
            )}
          </View>
          <Text style={styles.addrPhone}>{addr.phone}</Text>
          <Text style={styles.addrText} numberOfLines={2}>
            {addr.addressLine}
            {addr.ward ? `, ${addr.ward}` : ''}
            {`, ${addr.district}, ${addr.city}`}
          </Text>
        </View>
      </View>

      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBox}>
          <Ionicons name={icon as any} size={16} color={Colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={styles.fieldRequired}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

// ─── Main checkout screen ──────────────────────────────────────────────────────

export default function CheckoutScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { items, getTotalCost: getTotal, getTotalCommission, clearCart } = useCartStore();

  // Address tabs: 'saved' | 'new'
  const [addrTab, setAddrTab] = useState<'saved' | 'new'>('saved');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // New address form
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState<LocationItem | null>(null);
  const [district, setDistrict] = useState<LocationItem | null>(null);
  const [ward, setWard] = useState<LocationItem | null>(null);
  const [street, setStreet] = useState('');
  const [addrNotes, setAddrNotes] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  // Districts & wards loading
  const [districts, setDistricts] = useState<LocationItem[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [wards, setWards] = useState<LocationItem[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  const { provinces, loading: loadingProvinces, load: loadProvinces } = useProvinces();

  const { data: addressesData } = useQuery({
    queryKey: ['delivery-addresses'],
    queryFn: getDeliveryAddresses,
  });

  const addresses = addressesData?.data ?? [];

  // Auto-select mặc định hoặc đầu tiên
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses]);

  // Switch to 'new' nếu chưa có địa chỉ nào
  useEffect(() => {
    if (addressesData && addresses.length === 0) setAddrTab('new');
  }, [addressesData]);

  // Load provinces khi mở tab 'new'
  useEffect(() => {
    if (addrTab === 'new') loadProvinces();
  }, [addrTab]);

  // Load districts khi chọn province
  useEffect(() => {
    if (!province) return;
    setDistrict(null);
    setWard(null);
    setDistricts([]);
    setWards([]);
    setLoadingDistricts(true);
    fetchDistricts(province.code)
      .then(setDistricts)
      .catch(() => {})
      .finally(() => setLoadingDistricts(false));
  }, [province]);

  // Load wards khi chọn district
  useEffect(() => {
    if (!district) return;
    setWard(null);
    setWards([]);
    setLoadingWards(true);
    fetchWards(district.code)
      .then(setWards)
      .catch(() => {})
      .finally(() => setLoadingWards(false));
  }, [district]);

  const validateNewAddress = useCallback(() => {
    if (!recipientName.trim()) return 'Vui lòng nhập họ tên người nhận';
    if (!phone.trim()) return 'Vui lòng nhập số điện thoại';
    if (!province) return 'Vui lòng chọn Tỉnh / Thành phố';
    if (!district) return 'Vui lòng chọn Quận / Huyện';
    if (!street.trim()) return 'Vui lòng nhập số nhà, đường';
    return null;
  }, [recipientName, phone, province, district, street]);

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Lỗi', 'Giỏ hàng trống');
      return;
    }

    let addressId: string | undefined;
    let deliveryAddress: Parameters<typeof createOrder>[0]['deliveryAddress'];

    if (addrTab === 'saved') {
      if (!selectedAddressId) {
        Alert.alert('Lỗi', 'Vui lòng chọn địa chỉ giao hàng');
        return;
      }
      addressId = selectedAddressId;
    } else {
      const err = validateNewAddress();
      if (err) { Alert.alert('Thiếu thông tin', err); return; }

      const addrBody = {
        recipientName: recipientName.trim(),
        phone: phone.trim(),
        addressLine: street.trim(),
        ward: ward?.name,
        district: district!.name,
        city: province!.name,
        notes: addrNotes.trim() || undefined,
        isDefault,
      };

      // Lưu địa chỉ nếu user bật toggle
      if (saveAddress) {
        try {
          const saved = await createDeliveryAddress(addrBody);
          await queryClient.invalidateQueries({ queryKey: ['delivery-addresses'] });
          addressId = saved.id;
        } catch {
          // Nếu lưu lỗi vẫn tiến hành đặt hàng với deliveryAddress inline
          deliveryAddress = addrBody;
        }
      } else {
        deliveryAddress = addrBody;
      }
    }

    setLoading(true);
    try {
      await createOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        notes: notes.trim() || undefined,
        addressId,
        deliveryAddress,
      });
      await queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      clearCart();

      // Pop shop stack về root (shop/index) trước khi show alert để tránh:
      // - GO_BACK error do checkout ở root stack
      // - cross-tab navigation từ nested stack bị bug với react-native-screens cũ
      router.dismissAll();

      // Defer Alert sang tick sau để dismissAll hoàn tất animation
      setTimeout(() => {
        Alert.alert('Đặt hàng thành công! 🎉', 'Đơn hàng của bạn đang được xử lý.', [
          { text: 'Tiếp tục mua hàng', style: 'cancel' },
          {
            text: 'Xem đơn hàng',
            // setTimeout để escape Alert dismiss animation trên iOS
            onPress: () => setTimeout(() => router.push('/(tabs)/orders'), 0),
          },
        ]);
      }, 0);
    } catch (e) {
      Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Đặt đơn thất bại');
    } finally {
      setLoading(false);
    }
  };

  const total = getTotal();
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.dismissAll()}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận đơn hàng</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Order summary ────────────────────────────────────────── */}
        <Section icon="bag-outline" title={`Tóm tắt đơn hàng (${items.length} loại)`}>
          <View style={styles.summaryBox}>
            {/* Item list */}
            {items.map((item, index) => {
              const subtotal = Number(item.price) * item.quantity;
              return (
                <View
                  key={item.productId}
                  style={[
                    styles.summaryItemCard,
                    index < items.length - 1 && styles.summaryItemCardBorder,
                  ]}
                >
                  {/* Ảnh sản phẩm */}
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.summaryItemImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.summaryItemImg, styles.summaryItemImgPlaceholder]}>
                      <Ionicons name="cube-outline" size={20} color={Colors.primary} />
                    </View>
                  )}

                  {/* Tên + đơn giá */}
                  <View style={styles.summaryItemMid}>
                    <Text style={styles.summaryItemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.summaryItemMeta}>
                      <View style={styles.summaryQtyBadge}>
                        <Text style={styles.summaryQtyText}>×{item.quantity}</Text>
                      </View>
                      <Text style={styles.summaryUnitPrice}>
                        {Number(item.price).toLocaleString('vi-VN')}đ / cái
                      </Text>
                    </View>
                  </View>

                  {/* Thành tiền */}
                  <Text style={styles.summarySubtotal}>
                    {subtotal.toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              );
            })}

            {/* Tổng cộng */}
            <View style={styles.summaryTotalRow}>
              <View style={styles.summaryTotalLeft}>
                <Text style={styles.summaryTotalLabel}>Vốn giữ</Text>
                <Text style={styles.summaryTotalCount}>{itemCount} sản phẩm</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.summaryTotalValue}>
                  {total.toLocaleString('vi-VN')}đ
                </Text>
                <Text style={styles.summaryCommission}>
                  +{getTotalCommission().toLocaleString('vi-VN')}đ hoa hồng
                </Text>
              </View>
            </View>
          </View>
        </Section>

        {/* ── Delivery address ─────────────────────────────────────── */}
        <Section icon="location-outline" title="Địa chỉ giao hàng">
          {/* Tabs */}
          {addresses.length > 0 && (
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, addrTab === 'saved' && styles.tabActive]}
                onPress={() => setAddrTab('saved')}
              >
                <Text style={[styles.tabText, addrTab === 'saved' && styles.tabTextActive]}>
                  Địa chỉ đã lưu
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, addrTab === 'new' && styles.tabActive]}
                onPress={() => setAddrTab('new')}
              >
                <Text style={[styles.tabText, addrTab === 'new' && styles.tabTextActive]}>
                  Địa chỉ mới
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Saved addresses */}
          {addrTab === 'saved' && (
            <View style={styles.savedList}>
              {addresses.map((addr) => (
                <SavedAddressCard
                  key={addr.id}
                  addr={addr}
                  selected={selectedAddressId === addr.id}
                  onSelect={() => setSelectedAddressId(addr.id)}
                />
              ))}
              {addresses.length === 0 && (
                <View style={styles.noAddrBox}>
                  <Text style={styles.noAddrText}>Chưa có địa chỉ đã lưu</Text>
                </View>
              )}
            </View>
          )}

          {/* New address form */}
          {addrTab === 'new' && (
            <View style={styles.newForm}>
              <Field label="Họ tên người nhận" required>
                <TextInput
                  style={styles.input}
                  placeholder="Nguyễn Văn A"
                  placeholderTextColor={Colors.textMuted}
                  value={recipientName}
                  onChangeText={setRecipientName}
                />
              </Field>

              <Field label="Số điện thoại" required>
                <TextInput
                  style={styles.input}
                  placeholder="09xxxxxxxx"
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </Field>

              <Field label="Tỉnh / Thành phố" required>
                <LocationPicker
                  placeholder="Chọn Tỉnh / Thành phố"
                  value={province}
                  items={provinces}
                  loading={loadingProvinces}
                  onSelect={(p) => { setProvince(p); setDistrict(null); setWard(null); }}
                />
              </Field>

              <Field label="Quận / Huyện" required>
                <LocationPicker
                  placeholder="Chọn Quận / Huyện"
                  value={district}
                  items={districts}
                  loading={loadingDistricts}
                  disabled={!province}
                  onSelect={(d) => { setDistrict(d); setWard(null); }}
                />
              </Field>

              <Field label="Phường / Xã">
                <LocationPicker
                  placeholder="Chọn Phường / Xã (tùy chọn)"
                  value={ward}
                  items={wards}
                  loading={loadingWards}
                  disabled={!district}
                  onSelect={setWard}
                />
              </Field>

              <Field label="Số nhà, tên đường" required>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 123 Nguyễn Huệ"
                  placeholderTextColor={Colors.textMuted}
                  value={street}
                  onChangeText={setStreet}
                />
              </Field>

              <Field label="Ghi chú địa chỉ">
                <TextInput
                  style={styles.input}
                  placeholder="Tầng 3, toà A... (tùy chọn)"
                  placeholderTextColor={Colors.textMuted}
                  value={addrNotes}
                  onChangeText={setAddrNotes}
                />
              </Field>

              {/* Save address toggle */}
              <View style={styles.saveRow}>
                <View style={styles.saveRowLeft}>
                  <Ionicons name="bookmark-outline" size={18} color={Colors.primary} />
                  <View>
                    <Text style={styles.saveLabel}>Lưu địa chỉ này</Text>
                    <Text style={styles.saveSubLabel}>Dùng lại cho lần đặt tiếp theo</Text>
                  </View>
                </View>
                <Switch
                  value={saveAddress}
                  onValueChange={setSaveAddress}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={saveAddress ? Colors.primary : Colors.textMuted}
                />
              </View>

              {saveAddress && (
                <View style={styles.defaultRow}>
                  <Text style={styles.defaultLabel}>Đặt làm địa chỉ mặc định</Text>
                  <Switch
                    value={isDefault}
                    onValueChange={setIsDefault}
                    trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                    thumbColor={isDefault ? Colors.primary : Colors.textMuted}
                  />
                </View>
              )}
            </View>
          )}
        </Section>

        {/* ── Order notes ───────────────────────────────────────────── */}
        <Section icon="create-outline" title="Ghi chú đơn hàng">
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Ghi chú cho đơn hàng (tùy chọn)"
            placeholderTextColor={Colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Section>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Tổng cộng</Text>
          <Text style={styles.footerTotalValue}>{total.toLocaleString('vi-VN')}đ</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeBtn, loading && styles.placeBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.placeBtnText}>Đặt đơn hàng</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  // Section
  section: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  // Order summary
  summaryBox: { gap: 0 },

  summaryItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryItemCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  summaryItemImg: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  summaryItemImgPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  summaryItemMid: {
    flex: 1,
    gap: 6,
  },
  summaryItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  summaryItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryQtyBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  summaryQtyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryUnitPrice: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  summarySubtotal: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 80,
    textAlign: 'right',
  },

  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.primaryLight,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryTotalLeft: { gap: 2 },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summaryTotalCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  summaryTotalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  summaryCommission: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 2,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    margin: 12,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.card, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },

  // Saved addresses
  savedList: { padding: 12, gap: 10 },
  addrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 10,
  },
  addrCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  addrCardLeft: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  addrIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addrIconSelected: { backgroundColor: Colors.primary },
  addrInfo: { flex: 1 },
  addrTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  addrName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  addrNameSelected: { color: Colors.primary },
  defaultBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  defaultBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  addrPhone: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  addrText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  noAddrBox: { padding: 24, alignItems: 'center' },
  noAddrText: { color: Colors.textMuted, fontSize: 14 },

  // New address form
  newForm: { padding: 16, gap: 4 },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  fieldRequired: { color: Colors.danger },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.card,
  },
  notesInput: { minHeight: 80, paddingTop: 13 },

  // Save address toggle
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    gap: 10,
  },
  saveRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  saveLabel: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  saveSubLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  defaultLabel: { fontSize: 13, color: Colors.textSecondary },

  // Footer
  footer: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerTotalLabel: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  footerTotalValue: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  placeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  placeBtnDisabled: { opacity: 0.65 },
  placeBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
