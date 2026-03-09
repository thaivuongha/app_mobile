import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  SectionList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMyDevices, getDeviceSlots, getDeviceStatus } from '@/src/api/devices';
import type { Device, DeviceSlot } from '@/src/api/devices';
import { Colors } from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunkPairs<T>(arr: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) rows.push(arr.slice(i, i + 2));
  return rows;
}

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

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({
  icon,
  value,
  label,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statPill, accent && styles.statPillAccent]}>
      <Ionicons
        name={icon}
        size={14}
        color={accent ? Colors.orange : 'rgba(255,255,255,0.8)'}
      />
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>{label}</Text>
    </View>
  );
}

// ─── Device Card ──────────────────────────────────────────────────────────────

function DeviceCard({ device, onPress }: { device: Device; onPress: () => void }) {
  const isOnline = device.status === 'ACTIVE';
  const hasIssue = device.status === 'MAINTENANCE' || device.status === 'INACTIVE';

  const statusColor = isOnline ? Colors.success : hasIssue ? Colors.warning : Colors.textMuted;
  const statusLabel = isOnline ? 'Online' : hasIssue ? 'Lỗi' : 'Offline';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Top accent bar */}
      <View style={[styles.cardAccentBar, { backgroundColor: isOnline ? Colors.primary : Colors.border }]} />

      {/* Status row */}
      <View style={styles.cardHeader}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      {/* Icon */}
      <View style={[styles.deviceIconWrapper, isOnline && styles.deviceIconWrapperActive]}>
        <Ionicons
          name={isOnline ? 'cube' : 'cube-outline'}
          size={32}
          color={isOnline ? Colors.primary : Colors.textMuted}
        />
      </View>

      {/* Name */}
      <Text style={styles.cardName} numberOfLines={2}>{displayName(device)}</Text>
      <Text style={styles.cardSerial} numberOfLines={1}>{device.serialNumber}</Text>

      {/* Floor badge */}
      {device.floor != null && (
        <View style={styles.cardFloorBadge}>
          <Text style={styles.cardFloorText}>T{device.floor}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Battery helpers ──────────────────────────────────────────────────────────

function batteryIcon(level: number): keyof typeof Ionicons.glyphMap {
  if (level >= 80) return 'battery-full';
  if (level >= 40) return 'battery-half';
  return 'battery-dead';
}
function batteryColor(level: number): string {
  if (level > 20) return Colors.success;
  return Colors.danger;
}

// ─── Slot Card ────────────────────────────────────────────────────────────────

function SlotCard({ slot }: { slot: DeviceSlot }) {
  const filled = !slot.isEmpty && !!slot.productName;
  return (
    <View style={[styles.slotCard, !filled && styles.slotCardEmpty]}>
      <View style={[styles.slotBadge, !filled && styles.slotBadgeEmpty]}>
        <Text style={[styles.slotBadgeText, !filled && styles.slotBadgeTextEmpty]}>
          {slot.slotNumber}
        </Text>
      </View>

      {filled ? (
        <>
          <View style={styles.slotProductIcon}>
            <Ionicons name="cube" size={26} color={Colors.primary} />
          </View>
          <Text style={styles.slotProductName} numberOfLines={2}>
            {slot.productName}
          </Text>
          {slot.brandName && (
            <Text style={styles.slotBrandName} numberOfLines={1}>{slot.brandName}</Text>
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
            <Ionicons name="add-circle-outline" size={26} color={Colors.border} />
          </View>
          <Text style={styles.slotEmptyLabel}>Trống</Text>
        </>
      )}
    </View>
  );
}

// ─── Device Popup ─────────────────────────────────────────────────────────────

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

        {/* Header */}
        <View style={styles.sheetHeader}>
          {/* Pin */}
          <View style={styles.batteryBlock}>
            {battery != null ? (
              <>
                <Ionicons name={batteryIcon(battery)} size={22} color={batteryColor(battery)} />
                <Text style={[styles.batteryText, { color: batteryColor(battery) }]}>
                  {battery}%
                </Text>
              </>
            ) : (
              <Ionicons name="battery-dead-outline" size={22} color={Colors.textMuted} />
            )}
          </View>

          {/* Title + meta */}
          <View style={styles.sheetTitleBlock}>
            <Text style={styles.sheetTitle} numberOfLines={1}>{displayName(device)}</Text>
            <View style={styles.sheetMeta}>
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
                <View style={[styles.metaBadge, styles.metaBadgeWarn]}>
                  <Ionicons name="thermometer-outline" size={11} color={Colors.orange} />
                  <Text style={[styles.metaBadgeText, { color: Colors.orange }]}>
                    {status.temperature}°C
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Close */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Slot grid */}
        <Text style={styles.slotsTitle}>Sản phẩm trong máy</Text>
        {slotsQuery.isLoading ? (
          <ActivityIndicator style={{ marginVertical: 32 }} color={Colors.primary} />
        ) : (
          <View style={styles.slotGrid}>
            <View style={styles.slotRow}>
              <SlotCard slot={slots[0]} />
              <SlotCard slot={slots[1]} />
            </View>
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

// ─── Floor Header ─────────────────────────────────────────────────────────────

function FloorHeader({ title, count }: { title: string; count: number }) {
  const isUnknown = title === 'Chưa phân tầng';
  return (
    <View style={styles.floorHeader}>
      <View style={[styles.floorBadge, isUnknown && styles.floorBadgeMuted]}>
        <Ionicons
          name={isUnknown ? 'help-circle-outline' : 'layers'}
          size={13}
          color={isUnknown ? Colors.textMuted : Colors.primary}
        />
        <Text style={[styles.floorTitle, isUnknown && styles.floorTitleMuted]}>{title}</Text>
      </View>
      <Text style={styles.floorCount}>{count} máy</Text>
    </View>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

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
  const onlineCount = useMemo(
    () => devices.filter((d) => d.status === 'ACTIVE').length,
    [devices],
  );

  const handleDevicePress = useCallback((device: Device) => {
    setSelectedDevice(device);
    setPopupVisible(true);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* ── Hero header ──────────────────────────────────────── */}
      <View style={styles.hero}>
        {/* Decorative circles */}
        <View style={[styles.circle, styles.circleTopRight]} />
        <View style={[styles.circle, styles.circleBottomLeft]} />
        <View style={[styles.circle, styles.circleSmall]} />

        {/* Title row */}
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>Thiết bị</Text>
            <Text style={styles.heroSub}>
              {devices.length > 0
                ? 'Quản lý máy vending của bạn'
                : 'Chưa có thiết bị nào'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/(tabs)/devices/claim')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        {devices.length > 0 && (
          <View style={styles.statsRow}>
            <StatPill icon="cube-outline" value={devices.length} label="máy" />
            <StatPill icon="wifi-outline" value={onlineCount} label="online" accent />
            <StatPill icon="layers-outline" value={sections.length} label="tầng" />
          </View>
        )}
      </View>

      {/* ── Content card ─────────────────────────────────────── */}
      <View style={styles.contentCard}>
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.centerStateText}>Đang tải thiết bị...</Text>
          </View>
        ) : devices.length === 0 ? (
          <View style={styles.centerState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="cube-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có thiết bị</Text>
            <Text style={styles.emptySubtitle}>
              Nhấn nút "+" bên trên để claim thiết bị đầu tiên
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(tabs)/devices/claim')}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Claim thiết bị</Text>
            </TouchableOpacity>
          </View>
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
      </View>

      {/* Popup */}
      <DevicePopup
        device={selectedDevice}
        visible={popupVisible}
        onClose={() => setPopupVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

  // ── Hero ──
  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    overflow: 'hidden',
    position: 'relative',
  },

  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleTopRight: { width: 200, height: 200, top: -70, right: -60 },
  circleBottomLeft: { width: 140, height: 140, bottom: -40, left: -30 },
  circleSmall: { width: 80, height: 80, top: 20, right: 60, backgroundColor: 'rgba(249,115,22,0.15)' },

  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3 },

  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statPillAccent: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  statValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  statValueAccent: { color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  statLabelAccent: { color: '#fff' },

  // ── Content card ──
  contentCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    overflow: 'hidden',
  },

  listContent: { paddingBottom: 40 },

  // ── Floor header ──
  floorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  floorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  floorBadgeMuted: { backgroundColor: Colors.border },
  floorTitle: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  floorTitleMuted: { color: Colors.textMuted },
  floorCount: { fontSize: 12, color: Colors.textMuted },

  // ── Grid ──
  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 10,
  },
  cardPlaceholder: { flex: 1 },

  // ── Device card ──
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 140,
  },
  cardAccentBar: {
    height: 3,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    marginBottom: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: '600' },

  deviceIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignSelf: 'center',
    marginVertical: 8,
  },
  deviceIconWrapperActive: {
    backgroundColor: Colors.primaryLight,
  },

  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 10,
    lineHeight: 18,
  },
  cardSerial: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 10,
    paddingHorizontal: 8,
    letterSpacing: 0.3,
  },
  cardFloorBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardFloorText: { fontSize: 10, fontWeight: '700', color: Colors.primary },

  // ── States ──
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  centerStateText: { fontSize: 14, color: Colors.textSecondary },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // ── Bottom sheet ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '75%',
    paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  batteryBlock: { alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 44 },
  batteryText: { fontSize: 11, fontWeight: '700' },
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
  metaBadgeWarn: { backgroundColor: Colors.orangeLight },
  metaBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
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
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  slotGrid: { gap: 10 },
  slotRow: { flexDirection: 'row', gap: 10 },
  slotCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary + '35',
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
  slotProductIcon: { marginTop: 8, marginBottom: 2 },
  slotProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  slotBrandName: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  slotPrice: { marginTop: 4, fontSize: 13, fontWeight: '700', color: Colors.orange },
  slotEmptyIcon: { marginTop: 8, marginBottom: 4, opacity: 0.35 },
  slotEmptyLabel: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
});
