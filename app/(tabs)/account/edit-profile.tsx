import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { getMyProfile, updateMyProfile } from '@/src/api/users';
import { ApiClientError } from '@/src/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['user-profiles', 'me'],
    queryFn: getMyProfile,
  });

  useEffect(() => {
    if (data) {
      setFirstName(data.firstName ?? '');
      setLastName(data.lastName ?? '');
      setAddress(data.address ?? '');
    }
  }, [data?.id]);

  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profiles', 'me'] });
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ.');
      router.back();
    },
  });

  const handleSave = () => {
    updateMutation.mutate(
      { firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined, address: address.trim() || undefined },
      { onError: (e) => Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Lưu thất bại') }
    );
  };

  if (isLoading) return <ActivityIndicator style={styles.loader} />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Họ</Text>
      <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Nguyễn" />
      <Text style={styles.label}>Tên</Text>
      <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Văn A" />
      <Text style={styles.label}>Địa chỉ</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Tùy chọn" />
      <TouchableOpacity
        style={[styles.button, updateMutation.isPending && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Lưu</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loader: { marginTop: 24 },
  label: { marginBottom: 6, fontSize: 14, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#2f95dc', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
