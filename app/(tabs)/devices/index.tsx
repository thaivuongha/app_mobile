import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { getMyDevices } from '@/src/api/devices';
import type { Device } from '@/src/api/devices';

export default function DevicesListScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['my-devices'],
    queryFn: () => getMyDevices(),
  });

  const devices = data?.data ?? [];

  const renderItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(tabs)/devices/${item.id}`)}
      activeOpacity={0.7}
    >
      <Text style={styles.cardTitle}>{item.deviceName || item.serialNumber}</Text>
      <Text style={styles.cardSub}>Serial: {item.serialNumber}</Text>
      <Text style={[styles.badge, item.status === 'ACTIVE' && styles.badgeActive]}>
        {item.status}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.claimButton}
        onPress={() => router.push('/(tabs)/devices/claim')}
      >
        <Text style={styles.claimButtonText}>+ Claim thiết bị mới</Text>
      </TouchableOpacity>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : devices.length === 0 ? (
        <Text style={styles.empty}>Chưa có thiết bị. Nhấn "Claim thiết bị mới" để thêm.</Text>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  claimButton: {
    margin: 16,
    padding: 14,
    backgroundColor: '#2f95dc',
    borderRadius: 8,
    alignItems: 'center',
  },
  claimButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#666', marginBottom: 8 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#eee',
    fontSize: 12,
  },
  badgeActive: { backgroundColor: '#c8e6c9' },
  loader: { marginTop: 24 },
  empty: { padding: 24, textAlign: 'center', color: '#666' },
});
