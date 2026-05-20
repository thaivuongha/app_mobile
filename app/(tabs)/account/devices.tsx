import React, { useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMyDevices, removeDevice } from '@/src/api/devices';
import type { Device } from '@/src/api/devices';
import { Colors } from '@/constants/Colors';
import { displayName } from '@/app/(tabs)/index';

// ─── Status helpers ────────────────────────────────────────────────────────────
function statusLabel(status: string) {
  switch (status) {
    case 'ACTIVE': return 'Online';
    case 'MAINTENANCE': return 'Bảo trì';
    case 'INACTIVE': return 'Không hoạt động';
    default: return 'Offline';
  }
}
function statusColor(status: string) {
  switch (status) {
    case 'ACTIVE': return Colors.success;
    case 'MAINTENANCE': return Colors.warning;
    default: return Colors.textMuted;
  }
}

// ─── Floor badge ───────────────────────────────────────────────────────────────
function FloorBadge({ floor }: { floor: number | null }) {
  if (floor == null) return null;
  return (
    <View style={styles.floorBadge}>
      <Ionicons name="layers-outline" size={11} color={Colors.primary} />
      <Text style={styles.floorBadgeText}>Tầng {floor}</Text>
    </View>
  );
}

// ─── Device Row ────────────────────────────────────────────────────────────────
function DeviceRow({
  device,
  onRemove,
  isRemoving,
}: {
  device: Device;
  onRemove: (device: Device) => void;
  isRemoving: boolean;
}) {
  const color = statusColor(device.status);

  return (
    <View style={styles.deviceRow}>
      {/* Icon + Info */}
      <View style={styles.deviceIconBox}>
        <Ionicons name="cube-outline" size={26} color={color} />
      </View>

      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName} numberOfLines={1}>
          {displayName(device)}
        </Text>
        <Text style={styles.deviceSerial} numberOfLines={1}>
          {device.serialNumber}
        </Text>
        <View style={styles.deviceMeta}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusLabel, { color }]}>{statusLabel(device.status)}</Text>
          <FloorBadge floor={device.floor} />
        </View>
      </View>

      {/* Remove button */}
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => onRemove(device)}
        disabled={isRemoving}
        activeOpacity={0.7}
      >
        {isRemoving ? (
          <ActivityIndicator size="small" color={Colors.danger} />
        ) : (
          <Ionicons name="trash-outline" size={20} color={Colors.danger} />
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Floor Group ───────────────────────────────────────────────────────────────
function FloorGroup({
  title,
  devices,
  onRemove,
  removingId,
}: {
  title: string;
  devices: Device[];
  onRemove: (device: Device) => void;
  removingId: string | null;
}) {
  const isUnknown = title === 'Chưa phân tầng';
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Ionicons
          name={isUnknown ? 'help-circle-outline' : 'layers'}
          size={14}
          color={isUnknown ? Colors.textMuted : Colors.primary}
        />
        <Text style={[styles.groupTitle, isUnknown && styles.groupTitleMuted]}>
          {title}
        </Text>
        <Text style={styles.groupCount}>{devices.length} máy</Text>
      </View>
      <View style={styles.groupCard}>
        {devices.map((d, i) => (
          <View key={d.id}>
            <DeviceRow
              device={d}
              onRemove={onRemove}
              isRemoving={removingId === d.id}
            />
            {i < devices.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function DeviceListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-devices'],
    queryFn: () => getMyDevices(),
  });

  const devices = data?.data ?? [];

  // Gom nhóm theo tầng
  const groups = React.useMemo(() => {
    const map = new Map<number | null, Device[]>();
    for (const d of devices) {
      const key = d.floor ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    const known = Array.from(map.keys())
      .filter((k) => k !== null)
      .sort((a, b) => (a as number) - (b as number)) as (number | null)[];
    if (map.has(null)) known.push(null);
    return known.map((floor) => ({
      floor,
      title: floor !== null ? `Tầng ${floor}` : 'Chưa phân tầng',
      devices: map.get(floor)!,
    }));
  }, [devices]);

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeDevice(id),
    onMutate: (id) => setRemovingId(id),
    onSettled: () => setRemovingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-devices'] });
    },
    onError: () => {
      Alert.alert('Lỗi', 'Không thể xóa thiết bị. Vui lòng thử lại.');
    },
  });

  const handleRemove = useCallback((device: Device) => {
    Alert.alert(
      'Xóa thiết bị',
      `Bạn có chắc muốn xóa "${displayName(device)}" khỏi tài khoản?\n\nSản phẩm trong máy sẽ được trả về kho. Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => removeMutation.mutate(device.id),
        },
      ],
    );
  }, [removeMutation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{devices.length}</Text>
            <Text style={styles.statLabel}>Tổng thiết bị</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.success }]}>
              {devices.filter((d) => d.status === 'ACTIVE').length}
            </Text>
            <Text style={styles.statLabel}>Đang online</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {groups.filter((g) => g.floor !== null).length}
            </Text>
            <Text style={styles.statLabel}>Tầng</Text>
          </View>
        </View>

        {/* Claim button */}
        <TouchableOpacity
          style={styles.claimButton}
          onPress={() => router.push('/(tabs)/devices/claim')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.claimButtonText}>Claim thiết bị mới</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>

        {/* Empty state */}
        {devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Chưa có thiết bị</Text>
            <Text style={styles.emptySubtitle}>
              Nhấn "Claim thiết bị mới" để bắt đầu
            </Text>
          </View>
        ) : (
          groups.map((g) => (
            <FloorGroup
              key={g.title}
              title={g.title}
              devices={g.devices}
              onRemove={handleRemove}
              removingId={removingId}
            />
          ))
        )}

        {/* Hint */}
        {devices.length > 0 && (
          <Text style={styles.hint}>
            Nhấn biểu tượng 🗑 để xóa thiết bị khỏi tài khoản.{'\n'}
            Sản phẩm trong máy sẽ được trả về kho.
          </Text>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 24 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 12 },

  // Claim button
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  claimButtonText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.primary },

  // Group
  group: { marginHorizontal: 16, marginTop: 20 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  groupTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.primary },
  groupTitleMuted: { color: Colors.textMuted },
  groupCount: { fontSize: 12, color: Colors.textMuted },
  groupCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 72 },

  // Device row
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  deviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  deviceSerial: { fontSize: 11, color: Colors.textMuted, marginTop: 1, letterSpacing: 0.3 },
  deviceMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusLabel: { fontSize: 12, fontWeight: '500' },
  floorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  floorBadgeText: { fontSize: 10, fontWeight: '600', color: Colors.primary },

  // Remove button
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, textAlign: 'center' },

  // Hint
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
    marginHorizontal: 24,
    lineHeight: 18,
  },
});
