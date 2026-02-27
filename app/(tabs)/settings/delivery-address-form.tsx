import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import {
  getDeliveryAddresses,
  createDeliveryAddress,
  updateDeliveryAddress,
  type DeliveryAddress,
} from '@/src/api/deliveryAddresses';
import { ApiClientError } from '@/src/api/client';
import { useQueryClient } from '@tanstack/react-query';

export default function DeliveryAddressFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const isEdit = !!params.id;

  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [ward, setWard] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data } = useQuery({
    queryKey: ['delivery-addresses'],
    queryFn: () => getDeliveryAddresses(),
    enabled: isEdit,
  });

  const address = isEdit && params.id ? data?.data?.find((a: DeliveryAddress) => a.id === params.id) : null;

  useEffect(() => {
    if (address) {
      setRecipientName(address.recipientName);
      setPhone(address.phone);
      setAddressLine(address.addressLine);
      setWard(address.ward ?? '');
      setDistrict(address.district);
      setCity(address.city);
      setNotes(address.notes ?? '');
      setIsDefault(address.isDefault);
    }
  }, [address]);

  const handleSubmit = async () => {
    if (!recipientName.trim() || !phone.trim() || !addressLine.trim() || !district.trim() || !city.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đủ: Họ tên, SĐT, Địa chỉ, Quận/Huyện, Tỉnh/Thành');
      return;
    }
    setLoading(true);
    try {
      const body = {
        recipientName: recipientName.trim(),
        phone: phone.trim(),
        addressLine: addressLine.trim(),
        ward: ward.trim() || undefined,
        district: district.trim(),
        city: city.trim(),
        notes: notes.trim() || undefined,
        isDefault,
      };
      if (isEdit && params.id) {
        await updateDeliveryAddress(params.id, body);
        Alert.alert('Thành công', 'Đã cập nhật địa chỉ.');
      } else {
        await createDeliveryAddress(body);
        Alert.alert('Thành công', 'Đã thêm địa chỉ.');
      }
      await queryClient.invalidateQueries({ queryKey: ['delivery-addresses'] });
      router.back();
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Lưu thất bại';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Họ tên người nhận</Text>
      <TextInput style={styles.input} value={recipientName} onChangeText={setRecipientName} placeholder="Nguyễn Văn A" />
      <Text style={styles.label}>Số điện thoại</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="0901234567" keyboardType="phone-pad" />
      <Text style={styles.label}>Địa chỉ (số nhà, đường)</Text>
      <TextInput style={styles.input} value={addressLine} onChangeText={setAddressLine} placeholder="123 Đường X" />
      <Text style={styles.label}>Phường/Xã</Text>
      <TextInput style={styles.input} value={ward} onChangeText={setWard} placeholder="Tùy chọn" />
      <Text style={styles.label}>Quận/Huyện</Text>
      <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder="Quận 1" />
      <Text style={styles.label}>Tỉnh/Thành</Text>
      <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="TP.HCM" />
      <Text style={styles.label}>Ghi chú</Text>
      <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Tùy chọn" />
      <TouchableOpacity style={styles.checkRow} onPress={() => setIsDefault(!isDefault)}>
        <Text>Đặt làm địa chỉ mặc định</Text>
        <Text>{isDefault ? '✓' : ''}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Lưu</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { marginBottom: 6, fontSize: 14, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  checkRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 16 },
  button: { backgroundColor: '#2f95dc', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
