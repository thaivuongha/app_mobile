import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWalletBalance } from '@/src/api/wallet';
import { Colors } from '@/constants/Colors';

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

// ─── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({
  icon,
  label,
  onPress,
  variant = 'primary',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, variant === 'outline' && styles.actionBtnOutline]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon}
        size={18}
        color={variant === 'outline' ? Colors.primary : '#fff'}
      />
      <Text style={[styles.actionBtnText, variant === 'outline' && styles.actionBtnTextOutline]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Quick link row ────────────────────────────────────────────────────────────

function QuickLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickLink} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.quickLinkIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.quickLinkLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function WalletScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const balanceQuery = useQuery({ queryKey: ['wallet'], queryFn: getWalletBalance });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    }, [queryClient]),
  );

  const w = balanceQuery.data;
  const isLoading = balanceQuery.isLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={balanceQuery.isRefetching}
            onRefresh={() => balanceQuery.refetch()}
            tintColor={Colors.primary}
          />
        }
      >
        {/* ── Balance card ─────────────────────────────────── */}
        <View style={styles.balanceCard}>
          <View style={[styles.circle, styles.circleTR]} />
          <View style={[styles.circle, styles.circleBL]} />

          <Text style={styles.cardLabel}>Số dư khả dụng</Text>

          {isLoading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} />
          ) : (
            <>
              <Text style={styles.balanceAmount}>
                {formatVND(w?.depositBalance ?? 0)}
              </Text>
              {(w?.reservedBalance ?? 0) > 0 && (
                <View style={styles.reservedRow}>
                  <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.reservedText}>
                    Đang giam: {formatVND(w!.reservedBalance)}
                  </Text>
                </View>
              )}
            </>
          )}

          <View style={styles.actionRow}>
            <ActionBtn
              icon="qr-code-outline"
              label="Nạp cọc"
              onPress={() => router.push('/(tabs)/account/wallet-topup' as never)}
            />
            <ActionBtn
              icon="swap-horizontal-outline"
              label="Chuyển sang HH"
              variant="outline"
              onPress={() => router.push('/(tabs)/account/wallet-transfer' as never)}
            />
          </View>
        </View>

        {/* ── Info note ─────────────────────────────────────── */}
        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={15} color={Colors.textMuted} />
          <Text style={styles.noteText}>
            Nạp tiền vào ví vận hành để đặt hàng B2B. Số tiền bị giam khi đặt hàng, hoàn lại sau khi giao hàng thành công.
          </Text>
        </View>

        {/* ── Lịch sử ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch sử biến động</Text>
          <View style={styles.quickLinksCard}>
            <QuickLink
              icon="swap-vertical-outline"
              label="Xem lịch sử biến động ví vận hành"
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/account/wallet-ledger' as never,
                  params: { walletType: 'DEPOSIT' },
                } as never)
              }
            />
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16 },

  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circleTR: { width: 180, height: 180, top: -60, right: -60 },
  circleBL: { width: 120, height: 120, bottom: -40, left: -20 },
  cardLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  balanceAmount: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  reservedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  reservedText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  actionBtnOutline: { backgroundColor: '#fff', borderColor: '#fff' },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  actionBtnTextOutline: { color: Colors.primary },

  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  quickLinksCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  quickLinkIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkLabel: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
});
