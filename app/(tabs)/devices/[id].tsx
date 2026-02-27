import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, View } from '@/components/Themed';
import { getDevice, getDeviceStatus, getDeviceSlots } from '@/src/api/devices';

const REFETCH_INTERVAL = 15000; // 15s poll

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deviceId = id!;

  const deviceQuery = useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => getDevice(deviceId),
    enabled: !!deviceId,
  });

  const statusQuery = useQuery({
    queryKey: ['device-status', deviceId],
    queryFn: () => getDeviceStatus(deviceId),
    enabled: !!deviceId,
    refetchInterval: REFETCH_INTERVAL,
  });

  const slotsQuery = useQuery({
    queryKey: ['device-slots', deviceId],
    queryFn: () => getDeviceSlots(deviceId),
    enabled: !!deviceId,
    refetchInterval: REFETCH_INTERVAL,
  });

  const refetch = () => {
    deviceQuery.refetch();
    statusQuery.refetch();
    slotsQuery.refetch();
  };

  const device = deviceQuery.data;
  const status = statusQuery.data;
  const slots = slotsQuery.data?.data ?? [];

  if (deviceQuery.isLoading || !device) {
    return <Text style={styles.centered}>Đang tải...</Text>;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={deviceQuery.isRefetching || statusQuery.isRefetching}
          onRefresh={refetch}
        />
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin</Text>
        <Text>Tên: {device.deviceName || '—'}</Text>
        <Text>Serial: {device.serialNumber}</Text>
        <Text>Trạng thái: {device.status}</Text>
      </View>

      {status && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Realtime</Text>
          <Text>Online: {status.isOnline ? 'Có' : 'Không'}</Text>
          {status.batteryLevel != null && <Text>Pin: {status.batteryLevel}%</Text>}
          {status.temperature != null && <Text>Nhiệt độ: {status.temperature}°C</Text>}
          {status.lastSeenAt && (
            <Text style={styles.muted}>Cập nhật lúc: {new Date(status.lastSeenAt).toLocaleString()}</Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4 khe (chỉ xem)</Text>
        {slots.length === 0 ? (
          <Text style={styles.muted}>Đang tải khe...</Text>
        ) : (
          slots.map((slot) => (
            <View key={slot.slotNumber} style={styles.slotRow}>
              <Text style={styles.slotNum}>Khe {slot.slotNumber}</Text>
              {slot.isEmpty ? (
                <Text style={styles.muted}>Trống</Text>
              ) : (
                <Text>
                  {slot.productName ?? '—'} — {slot.price ?? '—'}đ
                </Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, textAlign: 'center', marginTop: 24 },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  slotNum: { fontWeight: '500' },
  muted: { color: '#666', fontSize: 14 },
});
