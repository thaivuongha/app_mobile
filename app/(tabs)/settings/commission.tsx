import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import {
  getCommissionSettings,
  deleteCommissionSetting,
  type CommissionSetting,
} from '@/src/api/commissionSettings';
import { ApiClientError } from '@/src/api/client';
import { useQueryClient } from '@tanstack/react-query';

export default function CommissionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['commission-settings'],
    queryFn: () => getCommissionSettings(),
  });

  const list = data ?? [];

  const handleDelete = (item: CommissionSetting) => {
    Alert.alert('Xóa rule lợi nhuận', 'Bạn có chắc?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () =>
          deleteCommissionSetting(item.id)
            .then(() => queryClient.invalidateQueries({ queryKey: ['commission-settings'] }))
            .catch((e) => Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Xóa thất bại')),
      },
    ]);
  };

  if (isLoading) return <ActivityIndicator style={styles.loader} />;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => router.push('/(tabs)/settings/commission-form')}
      >
        <Text style={styles.addBtnText}>+ Thêm rule lợi nhuận</Text>
      </TouchableOpacity>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.type}>{item.commissionType}</Text>
            <Text style={styles.value}>
              {item.commissionType === 'PERCENTAGE' ? `${item.commissionValue}%` : `${item.commissionValue}đ`}
            </Text>
            {item.isDefault && <Text style={styles.badge}>Mặc định</Text>}
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Text style={styles.deleteLink}>Xóa</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có rule. Nhấn "Thêm rule".</Text>}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 24 },
  addBtn: {
    margin: 16,
    padding: 14,
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  type: { fontWeight: '600' },
  value: { fontSize: 14, marginTop: 4 },
  badge: { fontSize: 12, color: '#2f95dc', marginTop: 4 },
  deleteLink: { color: '#d32f2f', marginTop: 8 },
  empty: { padding: 24, textAlign: 'center', color: '#666' },
});
