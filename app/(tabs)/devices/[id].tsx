import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDevice, getDeviceStatus, getDeviceSlots } from '@/src/api/devices';
import { Colors } from '@/constants/Colors';

const REFETCH_INTERVAL = 15000;

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.infoRow}>
      {icon && <Ionicons name={icon} size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />}
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

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
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isOnline = status?.isOnline;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={deviceQuery.isRefetching || statusQuery.isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View style={[styles.statusBanner, isOnline ? styles.bannerOnline : styles.bannerOffline]}>
          <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={[styles.statusText, isOnline ? styles.textOnline : styles.textOffline]}>
            {isOnline ? 'Đang online' : 'Offline'}
          </Text>
          {status?.lastSeenAt && (
            <Text style={styles.lastSeen}>
              · {new Date(status.lastSeenAt).toLocaleString('vi-VN')}
            </Text>
          )}
        </View>

        {/* Device info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Ionicons name="hardware-chip-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Thông tin thiết bị</Text>
          </View>
          <InfoRow label="Tên" value={device.deviceName || '—'} icon="create-outline" />
          <InfoRow label="Serial" value={device.serialNumber} icon="barcode-outline" />
          <InfoRow label="Trạng thái" value={device.status} icon="information-circle-outline" />
        </View>

        {/* Realtime */}
        {status && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconBox}>
                <Ionicons name="pulse-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.cardTitle}>Realtime</Text>
            </View>
            {status.batteryLevel != null && (
              <View style={styles.infoRow}>
                <Ionicons name="battery-half-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
                <Text style={styles.infoLabel}>Pin</Text>
                <View style={styles.batteryBar}>
                  <View style={[styles.batteryFill, { width: `${status.batteryLevel}%` as any, backgroundColor: status.batteryLevel > 30 ? Colors.success : Colors.danger }]} />
                </View>
                <Text style={styles.infoValue}>{status.batteryLevel}%</Text>
              </View>
            )}
            {status.temperature != null && (
              <InfoRow label="Nhiệt độ" value={`${status.temperature}°C`} icon="thermometer-outline" />
            )}
          </View>
        )}

        {/* Slots */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Ionicons name="grid-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>4 khe hàng</Text>
          </View>
          {slots.length === 0 ? (
            <View style={styles.emptySlots}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.emptySlotsText}>Đang tải...</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((slot) => (
                <View key={slot.slotNumber} style={[styles.slotCard, slot.isEmpty && styles.slotCardEmpty]}>
                  <View style={styles.slotNumber}>
                    <Text style={styles.slotNumberText}>{slot.slotNumber}</Text>
                  </View>
                  {slot.isEmpty ? (
                    <Text style={styles.slotEmpty}>Trống</Text>
                  ) : (
                    <>
                      <Text style={styles.slotProduct} numberOfLines={2}>{slot.productName ?? '—'}</Text>
                      {slot.price != null && (
                        <Text style={styles.slotPrice}>{Number(slot.price).toLocaleString('vi-VN')}đ</Text>
                      )}
                    </>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  bannerOnline: { backgroundColor: Colors.successLight ?? '#F0FDF4' },
  bannerOffline: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: Colors.success },
  dotOffline: { backgroundColor: Colors.textMuted },
  statusText: { fontSize: 13, fontWeight: '700' },
  textOnline: { color: Colors.success },
  textOffline: { color: Colors.textMuted },
  lastSeen: { fontSize: 12, color: Colors.textMuted },

  card: {
    backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  batteryBar: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  batteryFill: { height: '100%', borderRadius: 4 },

  emptySlots: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 },
  emptySlotsText: { fontSize: 14, color: Colors.textMuted },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotCard: {
    width: '47%', borderRadius: 12, padding: 12, gap: 4,
    backgroundColor: Colors.primaryLight, borderWidth: 1.5, borderColor: Colors.primary + '30',
  },
  slotCardEmpty: { backgroundColor: Colors.background, borderColor: Colors.border },
  slotNumber: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  slotNumberText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  slotProduct: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, lineHeight: 18 },
  slotPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  slotEmpty: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
});
