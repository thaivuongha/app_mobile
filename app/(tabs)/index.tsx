import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  SectionList,
} from 'react-native';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMyDevices, getDeviceSlots, getDeviceStatus } from '@/src/api/devices';
import type { Device, DeviceSlot } from '@/src/api/devices';
import { Colors } from '@/constants/Colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunkPairs<T>(arr: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) rows.push(arr.slice(i, i + 2));
  return rows;
}

/** Ưu tiên deviceName, fallback serial 8 ký tự cuối */
export function displayName(device: Device): string {
  if (device.deviceName?.trim()) return device.deviceName.trim();
  return `#${device.serialNumber.slice(-8).toUpperCase()}`;
}

interface FloorSection {
  floor: number | null;
  title: string;
  data: Device[][];
}

function groupByFloor(devices: Device[]): FloorSection[] {
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
    data: chunkPairs(map.get(floor)!),
  }));
}

// ─── Device Card ───────────────────────────────────────────────────────────────
function DeviceCard({ device, onPress }: { device: Device; onPress: () => void }) {
  const isOnline = device.status === 'ACTIVE';
  const hasIssue = device.status === 'MAINTENANCE' || device.status === 'INACTIVE';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusDot, isOnline ? styles.dotOnline : hasIssue ? styles.dotWarning : styles.dotOffline]} />
        <Text style={[styles.statusText, isOnline ? styles.textOnline : hasIssue ? styles.textWarning : styles.textOffline]}>
          {isOnline ? 'Online' : hasIssue ? 'Lỗi' : 'Offline'}
        </Text>
      </View>
      <View style={styles.deviceIconWrapper}>
        <Ionicons name="cube-outline" size={36} color={isOnline ? Colors.primary : Colors.textMuted} />
      </View>
      <Text style={styles.cardName} numberOfLines={2}>{displayName(device)}</Text>
      <Text style={styles.cardSerial} numberOfLines={1}>{device.serialNumber}</Text>
    </TouchableOpacity>
  );
}

// ─── Battery Icon helper ───────────────────────────────────────────────────────
function batteryIcon(level: number): keyof typeof Ionicons.glyphMap {
  if (level >= 80) return 'battery-full';
  if (level >= 40) return 'battery-half';
  return 'battery-dead';
}
function batteryColor(level: number): string {
  if (level > 20) return Colors.success;
  return Colors.danger;
}

// ─── Slot Card (2×2 grid) ─────────────────────────────────────────────────────
function SlotCard({ slot }: { slot: DeviceSlot }) {
  const filled = !slot.isEmpty && !!slot.productName;
  return (
    <View style={[styles.slotCard, !filled && styles.slotCardEmpty]}>
      {/* Số khe */}
      <View style={[styles.slotBadge, !filled && styles.slotBadgeEmpty]}>
        <Text style={[styles.slotBadgeText, !filled && styles.slotBadgeTextEmpty]}>
          {slot.slotNumber}
        </Text>
      </View>

      {filled ? (
        <>
          {/* Icon sản phẩm */}
          <View style={styles.slotProductIcon}>
            <Ionicons name="cube" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.slotProductName} numberOfLines={2}>
            {slot.productName}
          </Text>
          {slot.brandName && (
            <Text style={styles.slotBrandName} numberOfLines={1}>
              {slot.brandName}
            </Text>
          )}
          {slot.price && (
            <Text style={styles.slotPrice}>
              {Number(slot.price).toLocaleString('vi-VN')}đ
            </Text>
          )}
        </>
      ) : (
        <>
          <View style={styles.slotEmptyIcon}>
            <Ionicons name="cube-outline" size={28} color={Colors.border} />
          </View>
          <Text style={styles.slotEmptyLabel}>Trống</Text>
        </>
      )}
    </View>
  );
}

// ─── Device Popup ──────────────────────────────────────────────────────────────
function DevicePopup({
  device,
  visible,
  onClose,
}: {
  device: Device | null;
  visible: boolean;
  onClose: () => void;
}) {
  const slotsQuery = useQuery({
    queryKey: ['device-slots', device?.id],
    queryFn: () => getDeviceSlots(device!.id),
    enabled: visible && !!device?.id,
  });

  const statusQuery = useQuery({
    queryKey: ['device-status', device?.id],
    queryFn: () => getDeviceStatus(device!.id),
    enabled: visible && !!device?.id,
    refetchInterval: 15000,
  });

  // Đảm bảo luôn có đủ 4 slot (pad nếu API trả thiếu)
  const rawSlots = slotsQuery.data?.data ?? [];
  const slots: DeviceSlot[] = [1, 2, 3, 4].map((n) => {
    const found = rawSlots.find((s) => s.slotNumber === n);
    return found ?? { slotNumber: n, productInstanceId: null, productName: null, isEmpty: true };
  });

  const status = statusQuery.data;
  const battery = status?.batteryLevel ?? null;
  const isOnline = status?.isOnline ?? false;

  if (!device) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.sheetHandle} />

        {/* ── Header ── */}
        <View style={styles.sheetHeader}>
          {/* Góc trái: Pin */}
          <View style={styles.batteryBlock}>
            {battery != null ? (
              <>
                <Ionicons
                  name={batteryIcon(battery)}
                  size={22}
                  color={batteryColor(battery)}
                />
                <Text style={[styles.batteryText, { color: batteryColor(battery) }]}>
                  {battery}%
                </Text>
              </>
            ) : (
              <Ionicons name="battery-dead-outline" size={22} color={Colors.textMuted} />
            )}
          </View>

          {/* Giữa: Tên + meta */}
          <View style={styles.sheetTitleBlock}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {displayName(device)}
            </Text>
            <View style={styles.sheetMeta}>
              {/* Online/Offline dot */}
              <View style={[styles.onlineDot, { backgroundColor: isOnline ? Colors.success : Colors.textMuted }]} />
              <Text style={[styles.onlineText, { color: isOnline ? Colors.success : Colors.textMuted }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
              {device.floor != null && (
                <View style={styles.metaBadge}>
                  <Ionicons name="layers-outline" size={11} color={Colors.primary} />
                  <Text style={styles.metaBadgeText}>Tầng {device.floor}</Text>
                </View>
              )}
              {status?.temperature != null && (
                <View style={styles.metaBadge}>
                  <Ionicons name="thermometer-outline" size={11} color={Colors.warning} />
                  <Text style={[styles.metaBadgeText, { color: Colors.warning }]}>
                    {status.temperature}°C
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Góc phải: Đóng */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Slot grid 2×2 ── */}
        <Text style={styles.slotsTitle}>Sản phẩm trong máy</Text>
        {slotsQuery.isLoading ? (
          <ActivityIndicator style={{ marginVertical: 32 }} color={Colors.primary} />
        ) : (
          <View style={styles.slotGrid}>
            {/* Hàng 1 */}
            <View style={styles.slotRow}>
              <SlotCard slot={slots[0]} />
              <SlotCard slot={slots[1]} />
            </View>
            {/* Hàng 2 */}
            <View style={styles.slotRow}>
              <SlotCard slot={slots[2]} />
              <SlotCard slot={slots[3]} />
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </View>
    </Modal>
  );
}

// ─── Floor Section Header ──────────────────────────────────────────────────────
function FloorHeader({ title, count }: { title: string; count: number }) {
  const isUnknown = title === 'Chưa phân tầng';
  return (
    <View style={styles.floorHeader}>
      <View style={[styles.floorHeaderBadge, isUnknown && styles.floorHeaderBadgeMuted]}>
        <Ionicons
          name={isUnknown ? 'help-circle-outline' : 'layers'}
          size={14}
          color={isUnknown ? Colors.textMuted : Colors.primary}
        />
        <Text style={[styles.floorHeaderTitle, isUnknown && styles.floorHeaderTitleMuted]}>
          {title}
        </Text>
      </View>
      <Text style={styles.floorHeaderCount}>{count} máy</Text>
    </View>
  );
}

// ─── Home Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-devices'],
    queryFn: () => getMyDevices(),
  });

  const devices = data?.data ?? [];
  const sections = useMemo(() => groupByFloor(devices), [devices]);

  const handleDevicePress = useCallback((device: Device) => {
    setSelectedDevice(device);
    setPopupVisible(true);
  }, []);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={64} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>Chưa có thiết bị</Text>
      <Text style={styles.emptySubtitle}>Nhấn nút "+" để claim thiết bị đầu tiên</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push('/(tabs)/devices/claim')}
      >
        <Text style={styles.emptyButtonText}>+ Claim thiết bị</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Thiết bị</Text>
          <Text style={styles.headerSubtitle}>
            {devices.length > 0
              ? `${devices.length} máy · ${sections.length} tầng`
              : 'Quản lý máy vending'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/devices/claim')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải thiết bị...</Text>
        </View>
      ) : devices.length === 0 ? (
        renderEmpty()
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(row, idx) => `row-${idx}-${row.map((d) => d.id).join('-')}`}
          renderSectionHeader={({ section }) => (
            <FloorHeader
              title={section.title}
              count={section.data.reduce((acc, row) => acc + row.length, 0)}
            />
          )}
          renderItem={({ item: row }) => (
            <View style={styles.gridRow}>
              {row.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onPress={() => handleDevicePress(device)}
                />
              ))}
              {row.length === 1 && <View style={styles.cardPlaceholder} />}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      {/* Popup sản phẩm */}
      <DevicePopup
        device={selectedDevice}
        visible={popupVisible}
        onClose={() => setPopupVisible(false)}
      />
    </SafeAreaView>
  );
}

const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  listContent: { paddingBottom: 32 },

  floorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  floorHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  floorHeaderBadgeMuted: { backgroundColor: Colors.border },
  floorHeaderTitle: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  floorHeaderTitleMuted: { color: Colors.textMuted },
  floorHeaderCount: { fontSize: 12, color: Colors.textMuted },

  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 10,
  },

  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: CARD_RADIUS,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPlaceholder: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  dotOnline: { backgroundColor: Colors.success },
  dotOffline: { backgroundColor: Colors.textMuted },
  dotWarning: { backgroundColor: Colors.warning },
  statusText: { fontSize: 11, fontWeight: '500' },
  textOnline: { color: Colors.success },
  textOffline: { color: Colors.textMuted },
  textWarning: { color: Colors.warning },
  deviceIconWrapper: { alignItems: 'center', paddingVertical: 6 },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  cardSerial: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  // ── Sheet header ──
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },

  // Pin — góc trái
  batteryBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 44,
  },
  batteryText: { fontSize: 11, fontWeight: '700' },

  // Title block — giữa
  sheetTitleBlock: { flex: 1 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  sheetMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5 },
  onlineText: { fontSize: 12, fontWeight: '500' },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  metaBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary },

  // Close — góc phải
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Slot grid ──
  slotsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  slotGrid: { gap: 10 },
  slotRow: { flexDirection: 'row', gap: 10 },

  // Slot card
  slotCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',   // primary 25% opacity
    padding: 12,
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  slotCardEmpty: {
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.background,
  },

  // Số khe badge
  slotBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBadgeEmpty: { backgroundColor: Colors.border },
  slotBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  slotBadgeTextEmpty: { color: Colors.textMuted },

  // Filled slot content
  slotProductIcon: { marginTop: 8, marginBottom: 2 },
  slotProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  slotBrandName: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  slotPrice: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Empty slot content
  slotEmptyIcon: { marginTop: 8, marginBottom: 4, opacity: 0.4 },
  slotEmptyLabel: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
});
