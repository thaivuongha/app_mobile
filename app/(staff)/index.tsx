import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  SectionList,
  Alert,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getStaffDevices } from '@/src/api/staffDevices';
import type { StaffDevice, StaffSlot } from '@/src/api/staffDevices';
import { staffLogout } from '@/src/api/staffAuth';
import { useAuthStore } from '@/src/stores/authStore';
import { Colors } from '@/constants/Colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunkPairs<T>(arr: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) rows.push(arr.slice(i, i + 2));
  return rows;
}

function displayName(device: StaffDevice): string {
  return device.deviceName?.trim() || 'Thiết bị chưa đặt tên';
}

interface FloorSection {
  floor: number | null;
  title: string;
  data: StaffDevice[][];
}

function groupByFloor(devices: StaffDevice[]): FloorSection[] {
  const map = new Map<number | null, StaffDevice[]>();
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

// Cùng quy ước với app của chủ: pin ≤ 20% báo đỏ.
function batteryIcon(level: number): keyof typeof Ionicons.glyphMap {
  if (level >= 80) return 'battery-full';
  if (level >= 40) return 'battery-half';
  return 'battery-dead';
}
function batteryColor(level: number | null): string {
  if (level != null && level <= 20) return Colors.danger;
  if (level != null) return Colors.success;
  return Colors.textMuted;
}

// ─── Device Card ──────────────────────────────────────────────────────────────

function DeviceCard({
  device,
  onPress,
}: {
  device: StaffDevice;
  onPress: () => void;
}) {
  const battery = device.liveStatus?.batteryLevel ?? null;
  const batteryTint = batteryColor(battery);
  const slots = device.slots ?? [];
  const emptyCount = slots.filter((s) => s.isEmpty || !s.productName).length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.cardAccentBar, { backgroundColor: Colors.primary }]} />

      <View style={styles.cardHeader}>
        <View style={styles.cardBattery}>
          <Ionicons
            name={battery != null ? batteryIcon(battery) : 'battery-dead-outline'}
            size={14}
            color={batteryTint}
          />
          <Text style={[styles.cardBatteryText, { color: batteryTint }]}>
            {battery != null ? `${battery}%` : '—'}
          </Text>
        </View>
        {emptyCount > 0 && (
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyBadgeText}>{emptyCount} trống</Text>
          </View>
        )}
      </View>

      <View style={styles.deviceIconWrapper}>
        <Ionicons name="cube" size={32} color={Colors.primary} />
      </View>

      <Text style={styles.cardName} numberOfLines={2}>{displayName(device)}</Text>

      <View style={styles.slotDots}>
        {slots.map((slot) => {
          const filled = !slot.isEmpty && !!slot.productName;
          return (
            <View
              key={slot.slotNumber}
              style={[styles.slotDot, filled ? styles.slotDotFilled : styles.slotDotEmpty]}
            />
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

// ─── Slot Card ────────────────────────────────────────────────────────────────

function SlotCard({ slot }: { slot: StaffSlot }) {
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
          {slot.imageUrl ? (
            <Image source={{ uri: slot.imageUrl }} style={styles.slotImage} resizeMode="cover" />
          ) : (
            <View style={styles.slotProductIcon}>
              <Ionicons name="cube" size={26} color={Colors.primary} />
            </View>
          )}
          <Text style={styles.slotProductName} numberOfLines={2}>{slot.productName}</Text>
          {slot.brandName && (
            <Text style={styles.slotBrandName} numberOfLines={1}>{slot.brandName}</Text>
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
  device: StaffDevice | null;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!device) return null;
  const battery = device.liveStatus?.batteryLevel ?? null;
  const slots = [...(device.slots ?? [])].sort((a, b) => a.slotNumber - b.slotNumber);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />

        <View style={styles.sheetHeader}>
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

          <View style={styles.sheetTitleBlock}>
            <Text style={styles.sheetTitle} numberOfLines={1}>{displayName(device)}</Text>
            {device.floor != null && (
              <View style={styles.metaBadge}>
                <Ionicons name="layers-outline" size={11} color={Colors.primary} />
                <Text style={styles.metaBadgeText}>Tầng {device.floor}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false} bounces={false}>
          <Text style={styles.slotsTitle}>Sản phẩm trong máy</Text>
          <View style={styles.slotGrid}>
            {Array.from({ length: Math.ceil(slots.length / 2) }).map((_, rowIndex) => (
              <View style={styles.slotRow} key={rowIndex}>
                <SlotCard slot={slots[rowIndex * 2]} />
                {slots[rowIndex * 2 + 1] && <SlotCard slot={slots[rowIndex * 2 + 1]} />}
              </View>
            ))}
          </View>
          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StaffDevicesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((s) => s.setSession);
  const [selectedDevice, setSelectedDevice] = useState<StaffDevice | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['staff-devices'],
    queryFn: () => getStaffDevices(),
  });

  const devices = data?.data ?? [];
  const sections = useMemo(() => groupByFloor(devices), [devices]);

  const handleDevicePress = useCallback((device: StaffDevice) => {
    setSelectedDevice(device);
    setPopupVisible(true);
  }, []);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Thoát khỏi phiên xem thiết bị này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await staffLogout();
          queryClient.clear();
          setSession(null);
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.hero}>
        <View style={[styles.circle, styles.circleTopRight]} />
        <View style={[styles.circle, styles.circleBottomLeft]} />

        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>Thiết bị</Text>
            <Text style={styles.heroSub}>
              {devices.length > 0 ? 'Sản phẩm cần châm thêm' : 'Chưa có thiết bị nào được chia sẻ'}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {devices.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Ionicons name="cube-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statValue}>{devices.length}</Text>
              <Text style={styles.statLabel}>máy</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="layers-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statValue}>{sections.length}</Text>
              <Text style={styles.statLabel}>tầng</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.contentCard}>
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.centerStateText}>Đang tải thiết bị...</Text>
          </View>
        ) : isError ? (
          <View style={styles.centerState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="cloud-offline-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Không tải được</Text>
            <Text style={styles.emptySubtitle}>Kiểm tra mạng rồi thử lại</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} activeOpacity={0.85}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : devices.length === 0 ? (
          <View style={styles.centerState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="cube-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có thiết bị</Text>
            <Text style={styles.emptySubtitle}>Chủ chưa thêm thiết bị nào vào tài khoản</Text>
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
                  <DeviceCard key={device.id} device={device} onPress={() => handleDevicePress(device)} />
                ))}
                {row.length === 1 && <View style={styles.cardPlaceholder} />}
              </View>
            )}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
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

      <DevicePopup device={selectedDevice} visible={popupVisible} onClose={() => setPopupVisible(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

  hero: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    overflow: 'hidden',
    position: 'relative',
  },
  circle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
  circleTopRight: { width: 200, height: 200, top: -70, right: -60 },
  circleBottomLeft: { width: 140, height: 140, bottom: -40, left: -30 },

  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3 },

  logoutBtn: {
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

  statsRow: { flexDirection: 'row', gap: 8 },
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
  statValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  contentCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    overflow: 'hidden',
  },
  listContent: { paddingBottom: 40 },

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

  gridRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 10, marginBottom: 10 },
  cardPlaceholder: { flex: 1 },

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
    minHeight: 150,
  },
  cardAccentBar: { height: 3, width: '100%' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 6,
  },
  cardBattery: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardBatteryText: { fontSize: 12, fontWeight: '700' },
  emptyBadge: {
    backgroundColor: Colors.orangeLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emptyBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.orange },

  deviceIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignSelf: 'center',
    marginVertical: 10,
  },

  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 10,
    lineHeight: 18,
    marginBottom: 10,
  },

  slotDots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5, paddingBottom: 12 },
  slotDot: { width: 6, height: 6, borderRadius: 3 },
  slotDotFilled: { backgroundColor: Colors.primary },
  slotDotEmpty: { backgroundColor: Colors.border },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
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
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '75%',
    paddingHorizontal: 20,
  },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
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
  sheetTitleBlock: { flex: 1, gap: 4 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  metaBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
  slotCardEmpty: { borderColor: Colors.border, borderStyle: 'dashed', backgroundColor: Colors.background },
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
  slotImage: { width: 44, height: 44, borderRadius: 8, marginTop: 6, marginBottom: 2 },
  slotProductIcon: { marginTop: 8, marginBottom: 2 },
  slotProductName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', lineHeight: 18 },
  slotBrandName: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  slotEmptyIcon: { marginTop: 8, marginBottom: 4, opacity: 0.35 },
  slotEmptyLabel: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
});
