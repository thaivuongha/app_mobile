import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyDevices } from '@/src/api/devices';
import type { Device } from '@/src/api/devices';
import { Colors } from '@/constants/Colors';
import { formatLastSeen } from '@/src/utils/lastSeen';

function DeviceCard({ item, onPress }: { item: Device; onPress: () => void }) {
  const isOnline = item.liveStatus?.isOnline ?? false;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.cardAccent, isOnline ? styles.cardAccentActive : styles.cardAccentInactive]} />
      <View style={styles.cardBody}>
        <View style={styles.cardIconBox}>
          <Ionicons name="hardware-chip-outline" size={22} color={Colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.deviceName || item.serialNumber}</Text>
          <Text style={styles.cardSerial}>Serial: {item.serialNumber}</Text>
          <View style={styles.cardLastSeen}>
            <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
            <Text style={styles.cardLastSeenText} numberOfLines={1}>
              Hoạt động {formatLastSeen(item.liveStatus?.lastSeenAt)}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, isOnline ? styles.statusActive : styles.statusInactive]}>
          <View style={[styles.statusDot, isOnline ? styles.statusDotActive : styles.statusDotInactive]} />
          <Text style={[styles.statusText, isOnline ? styles.statusTextActive : styles.statusTextInactive]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

export default function DevicesListScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-devices'],
    queryFn: () => getMyDevices(),
  });

  const devices = data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : devices.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIcon}>
            <Ionicons name="hardware-chip-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có thiết bị</Text>
          <Text style={styles.emptyDesc}>Nhấn "Claim thiết bị" để thêm máy bán hàng đầu tiên</Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DeviceCard item={item} onPress={() => router.push(`/(tabs)/devices/${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}

      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(tabs)/devices/claim')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.fabText}>Claim thiết bị</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },

  card: {
    backgroundColor: Colors.card, borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center',
  },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardAccentActive: { backgroundColor: Colors.success },
  cardAccentInactive: { backgroundColor: Colors.border },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  cardSerial: { fontSize: 12, color: Colors.textMuted },
  cardLastSeen: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  cardLastSeenText: { fontSize: 11, color: Colors.textMuted, flexShrink: 1 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusActive: { backgroundColor: Colors.successLight ?? '#F0FDF4' },
  statusInactive: { backgroundColor: Colors.background },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotActive: { backgroundColor: Colors.success },
  statusDotInactive: { backgroundColor: Colors.textMuted },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusTextActive: { color: Colors.success },
  statusTextInactive: { color: Colors.textMuted },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  fabWrapper: { position: 'absolute', bottom: 28, left: 20, right: 20 },
  fab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, height: 54,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
