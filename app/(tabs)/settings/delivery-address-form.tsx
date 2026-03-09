import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getDeliveryAddresses,
  createDeliveryAddress,
  updateDeliveryAddress,
  type DeliveryAddress,
} from '@/src/api/deliveryAddresses';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';
import {
  LocationPicker,
  useProvinces,
  fetchDistricts,
  fetchWards,
  type LocationItem,
} from '@/components/LocationPicker';

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

export default function DeliveryAddressFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!params.id;

  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState<LocationItem | null>(null);
  const [district, setDistrict] = useState<LocationItem | null>(null);
  const [ward, setWard] = useState<LocationItem | null>(null);
  const [street, setStreet] = useState('');
  const [notes, setNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  const [districts, setDistricts] = useState<LocationItem[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [wards, setWards] = useState<LocationItem[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);

  const { provinces, loading: loadingProvinces, load: loadProvinces } = useProvinces();

  useEffect(() => { loadProvinces(); }, []);

  const { data } = useQuery({
    queryKey: ['delivery-addresses'],
    queryFn: getDeliveryAddresses,
    enabled: isEdit,
  });

  const existing: DeliveryAddress | null =
    isEdit && params.id ? (data?.data?.find((a) => a.id === params.id) ?? null) : null;

  // Điền dữ liệu khi edit — chỉ điền text, province/district/ward giữ null (không reverse lookup)
  useEffect(() => {
    if (!existing) return;
    setRecipientName(existing.recipientName);
    setPhone(existing.phone);
    setStreet(existing.addressLine);
    setNotes(existing.notes ?? '');
    setIsDefault(existing.isDefault);
    // Ghi chú: khi edit, province/district/ward cần chọn lại vì chỉ lưu text name
  }, [existing]);

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

  const handleSubmit = async () => {
    if (!recipientName.trim() || !phone.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên và số điện thoại');
      return;
    }
    if (!province) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn Tỉnh / Thành phố');
      return;
    }
    if (!district) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn Quận / Huyện');
      return;
    }
    if (!street.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số nhà, tên đường');
      return;
    }

    setLoading(true);
    try {
      const body = {
        recipientName: recipientName.trim(),
        phone: phone.trim(),
        addressLine: street.trim(),
        ward: ward?.name,
        district: district.name,
        city: province.name,
        notes: notes.trim() || undefined,
        isDefault,
      };

      if (isEdit && params.id) {
        await updateDeliveryAddress(params.id, body);
        Alert.alert('Thành công', 'Đã cập nhật địa chỉ.');
      } else {
        await createDeliveryAddress(body);
        Alert.alert('Thành công', 'Đã lưu địa chỉ mới.');
      }
      await queryClient.invalidateQueries({ queryKey: ['delivery-addresses'] });
      router.back();
    } catch (e) {
      Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Lưu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Recipient info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={16} color={Colors.primary} />
            <Text style={styles.cardTitle}>Thông tin người nhận</Text>
          </View>

          <View style={styles.cardBody}>
            <Field label="Họ và tên" required>
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
          </View>
        </View>

        {/* Address */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={16} color={Colors.primary} />
            <Text style={styles.cardTitle}>Địa chỉ giao hàng</Text>
          </View>

          <View style={styles.cardBody}>
            {isEdit && existing && (
              <View style={styles.currentAddrBox}>
                <Text style={styles.currentAddrLabel}>Địa chỉ hiện tại:</Text>
                <Text style={styles.currentAddrText}>
                  {existing.addressLine}
                  {existing.ward ? `, ${existing.ward}` : ''}
                  {`, ${existing.district}, ${existing.city}`}
                </Text>
                <Text style={styles.currentAddrHint}>
                  Chọn lại Tỉnh/Quận/Phường bên dưới để cập nhật địa chỉ
                </Text>
              </View>
            )}

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
                placeholder={province ? 'Chọn Quận / Huyện' : 'Chọn Tỉnh trước'}
                value={district}
                items={districts}
                loading={loadingDistricts}
                disabled={!province}
                onSelect={(d) => { setDistrict(d); setWard(null); }}
              />
            </Field>

            <Field label="Phường / Xã">
              <LocationPicker
                placeholder={district ? 'Chọn Phường / Xã (tùy chọn)' : 'Chọn Quận/Huyện trước'}
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

            <Field label="Ghi chú">
              <TextInput
                style={styles.input}
                placeholder="Tầng 3, toà nhà... (tùy chọn)"
                placeholderTextColor={Colors.textMuted}
                value={notes}
                onChangeText={setNotes}
              />
            </Field>
          </View>
        </View>

        {/* Default toggle */}
        <View style={styles.defaultCard}>
          <View style={styles.defaultLeft}>
            <Ionicons name="star-outline" size={18} color={Colors.primary} />
            <View>
              <Text style={styles.defaultLabel}>Đặt làm địa chỉ mặc định</Text>
              <Text style={styles.defaultSubLabel}>Tự động chọn khi đặt hàng</Text>
            </View>
          </View>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={isDefault ? Colors.primary : Colors.textMuted}
          />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>
                {isEdit ? 'Cập nhật địa chỉ' : 'Lưu địa chỉ'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

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
  scrollContent: { padding: 16, gap: 12 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  cardBody: { padding: 16, gap: 4 },

  // Current address box (edit mode)
  currentAddrBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 3,
  },
  currentAddrLabel: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  currentAddrText: { fontSize: 13, color: Colors.textPrimary },
  currentAddrHint: { fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic' },

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

  defaultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 10,
  },
  defaultLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  defaultLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  defaultSubLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  footer: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
