import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { keyboardAvoidingBehavior } from '@/components/KeyboardAwareScrollView';
import { useState } from 'react';
import { getMe, getMyProfile, updatePriceMultiplier } from '@/src/api/users';
import { logout } from '@/src/api/auth';
import { useAuthStore } from '@/src/stores/authStore';
import { getWalletBalance } from '@/src/api/wallet';
import { Colors } from '@/constants/Colors';
import Constants from 'expo-constants';
import { AppDialog, type AppDialogAction, type AppDialogTone } from '@/components/AppDialog';
import { AppUpdateModal } from '@/components/AppUpdateModal';
import { useAppUpdateStatus } from '@/src/hooks/useAppUpdateStatus';

const APP_VERSION = Constants.expoConfig?.version ?? '—';
const APP_NAME = Constants.expoConfig?.name ?? 'Embox';
const SUPPORT_EMAIL = 'support@embox.vn';
const TERMS_URL = 'https://embox.vn';
const FALLBACK_COMMISSION_PERCENT_MIN = 0;
const FALLBACK_COMMISSION_PERCENT_MAX = 300;

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}

/** Quy đổi hệ số K sang tỷ lệ % nguyên để hiển thị (100% = mặc định). */
function toCommissionPercent(priceMultiplier: number): number {
  return Math.round(priceMultiplier * 100);
}

function getCommissionPercentLimits(user?: { commissionPercentMin?: number; commissionPercentMax?: number }) {
  const min = user?.commissionPercentMin;
  const max = user?.commissionPercentMax;
  if (
    typeof min === 'number' &&
    typeof max === 'number' &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min <= max
  ) {
    return { min, max };
  }
  return { min: FALLBACK_COMMISSION_PERCENT_MIN, max: FALLBACK_COMMISSION_PERCENT_MAX };
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
  badgeTone?: 'danger' | 'primary';
}

function MenuItem({ icon, label, sublabel, onPress, danger, badge, badgeTone = 'danger' }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? Colors.danger : Colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, danger && { color: Colors.danger }]}>{label}</Text>
        {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
      </View>
      {badge ? (
        <View style={[styles.badge, badgeTone === 'primary' && styles.badgePrimary]}>
          <Text style={[styles.badgeText, badgeTone === 'primary' && styles.badgePrimaryText]}>{badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function MeScreen() {
  const router = useRouter();
  const setHasToken = useAuthStore((s) => s.setHasToken);
  const queryClient = useQueryClient();

  const userQuery = useQuery({ queryKey: ['users', 'me'], queryFn: getMe });
  const profileQuery = useQuery({ queryKey: ['user-profiles', 'me'], queryFn: getMyProfile });
  const walletQuery = useQuery({ queryKey: ['wallet'], queryFn: getWalletBalance });

  const [kModalVisible, setKModalVisible] = useState(false);
  const [kInputVal, setKInputVal] = useState('');
  const [kError, setKError] = useState('');
  const [aboutUpdateVisible, setAboutUpdateVisible] = useState(false);
  const [dialog, setDialog] = useState<{
    icon: keyof typeof Ionicons.glyphMap;
    tone?: AppDialogTone;
    title: string;
    message: string;
    extra?: 'support-email';
    actions?: AppDialogAction[];
  } | null>(null);
  const appUpdate = useAppUpdateStatus();

  const closeDialog = () => setDialog(null);

  const showDialog = (next: NonNullable<typeof dialog>) => setDialog(next);

  const updateKMutation = useMutation({
    mutationFn: (val: number) => updatePriceMultiplier(val),
    onSuccess: () => {
      // Invalidate user để cập nhật badge K
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      // Invalidate catalog sản phẩm — sellingPrice thay đổi theo K mới
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Invalidate tất cả device-slots — sellingPrice trong máy thay đổi
      queryClient.invalidateQueries({ queryKey: ['device-slots'] });
      // Invalidate my-devices — slots embedded cũng chứa sellingPrice
      queryClient.invalidateQueries({ queryKey: ['my-devices'] });
      setKModalVisible(false);
      showDialog({
        icon: 'checkmark-circle',
        tone: 'success',
        title: 'Thành công',
        message: 'Đã cập nhật tỷ lệ hoa hồng. Giá bán đã được làm mới.',
      });
    },
    onError: () => {
      setKError('Không thể cập nhật. Vui lòng thử lại.');
    },
  });

  const handleOpenKModal = () => {
    const current = userQuery.data?.priceMultiplier ?? 1;
    setKInputVal(toCommissionPercent(current).toString());
    setKError('');
    setKModalVisible(true);
  };

  const handleSaveK = () => {
    const limits = getCommissionPercentLimits(userQuery.data);
    const trimmed = kInputVal.trim();
    // Ràng buộc chặt: chỉ chấp nhận số nguyên dương (không thập phân, không dấu, không khoảng trắng)
    // để tránh nhập sai đơn vị (ví dụ gõ nhầm hệ số K thay vì %).
    if (!/^\d+$/.test(trimmed)) {
      setKError('Tỷ lệ hoa hồng phải là số nguyên, ví dụ: 100');
      return;
    }
    const percent = parseInt(trimmed, 10);
    if (percent < limits.min || percent > limits.max) {
      setKError(`Tỷ lệ hoa hồng phải từ ${limits.min}% đến ${limits.max}%.`);
      return;
    }
    setKError('');
    updateKMutation.mutate(percent / 100);
  };

  const handleAbout = () => {
    if (appUpdate.hasUpdate) {
      setAboutUpdateVisible(true);
      return;
    }
    showDialog({
      icon: 'information-circle',
      title: APP_NAME,
      message: `Phiên bản ${APP_VERSION}\n\nBạn đang dùng phiên bản mới nhất.`,
    });
  };

  const openStoreFromAbout = () => {
    if (!appUpdate.storeUrl) return;
    Linking.openURL(appUpdate.storeUrl).catch(() => {
      showDialog({
        icon: 'alert-circle',
        tone: 'danger',
        title: 'Không mở được liên kết',
        message: 'Vui lòng thử lại sau hoặc cập nhật thủ công qua App Store / Google Play.',
      });
    });
    if (!appUpdate.isForce) setAboutUpdateVisible(false);
  };

  const handleSupport = () => {
    showDialog({
      icon: 'help-circle',
      title: 'Trung tâm hỗ trợ',
      message: 'Liên hệ đội ngũ Embox khi bạn cần hỗ trợ vận hành máy, tài khoản hoặc đơn hàng.',
      extra: 'support-email',
      actions: [
        { label: 'Đóng', variant: 'ghost', onPress: closeDialog },
        {
          label: 'Gửi email',
          variant: 'primary',
          onPress: () => {
            closeDialog();
            Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
          },
        },
      ],
    });
  };

  const handleTerms = () => {
    showDialog({
      icon: 'document-text',
      title: 'Điều khoản & Chính sách',
      message:
        'Nội dung điều khoản đang được hoàn thiện. Bạn có thể xem thông tin mới nhất trên website Embox.',
      actions: [
        { label: 'Đóng', variant: 'ghost', onPress: closeDialog },
        {
          label: 'Mở website',
          variant: 'primary',
          onPress: () => {
            closeDialog();
            Linking.openURL(TERMS_URL).catch(() => {});
          },
        },
      ],
    });
  };

  const handleLogout = () => {
    showDialog({
      icon: 'log-out',
      tone: 'danger',
      title: 'Đăng xuất',
      message: 'Bạn có chắc muốn đăng xuất khỏi tài khoản này?',
      actions: [
        { label: 'Hủy', variant: 'ghost', onPress: closeDialog },
        {
          label: 'Đăng xuất',
          variant: 'danger',
          onPress: async () => {
            closeDialog();
            try {
              await logout();
            } catch (_) {
              // xóa token dù logout API thất bại
            }
            setHasToken(false);
            router.replace('/(auth)/login');
          },
        },
      ],
    });
  };

  const user = userQuery.data;
  const profile = profileQuery.data;
  const wallet = walletQuery.data;
  const commissionLimits = getCommissionPercentLimits(user);

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || user?.phoneNumber
    : user?.phoneNumber;

  const initials = displayName
    ? displayName
        .split(' ')
        .map((w: string) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  if (userQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Me</Text>
        </View>

        {/* Avatar & Info */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => router.push('/(tabs)/account/edit-profile')}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName || '—'}</Text>
            <Text style={styles.profilePhone}>{user?.phoneNumber}</Text>
            <View style={styles.profileBadgeRow}>
              {user != null && (
                <View style={styles.roleBadge}>
                  <Ionicons name="trending-up-outline" size={11} color={Colors.primary} style={{ marginRight: 3 }} />
                  <Text style={styles.roleBadgeText}>
                    Hoa hồng: {toCommissionPercent(user.priceMultiplier)}%
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Ví đối tác */}
        <MenuSection title="Ví đối tác">
          <MenuItem
            icon="wallet-outline"
            label="Ví vận hành"
            sublabel={
              wallet
                ? `Khả dụng: ${formatVND(wallet.depositBalance)}`
                : 'Đang tải...'
            }
            onPress={() => router.push('/(tabs)/account/wallet' as never)}
          />
          <MenuItem
            icon="gift-outline"
            label="Ví hoa hồng"
            sublabel={
              wallet
                ? `Số dư: ${formatVND(wallet.commissionBalance)}`
                : 'Đang tải...'
            }
            onPress={() => router.push('/(tabs)/account/wallet-commission' as never)}
          />
        </MenuSection>

        {/* Tài khoản */}
        <MenuSection title="Tài khoản">
          <MenuItem
            icon="person-outline"
            label="Chỉnh sửa hồ sơ"
            onPress={() => router.push('/(tabs)/account/edit-profile')}
          />
          <MenuItem
            icon="lock-closed-outline"
            label="Đổi mật khẩu"
            onPress={() => router.push('/(tabs)/account/change-password')}
          />
          <MenuItem
            icon="location-outline"
            label="Địa chỉ giao hàng"
            sublabel="Quản lý địa chỉ nhận hàng"
            onPress={() => router.push({ pathname: '/(tabs)/account/delivery-addresses', params: { from: 'account' } })}
          />
          <MenuItem
            icon="trending-up-outline"
            label="Tỷ lệ hoa hồng"
            sublabel={
              user != null
                ? `Hiện tại: ${toCommissionPercent(user.priceMultiplier)}% — ảnh hưởng giá bán tại máy`
                : 'Đang tải...'
            }
            onPress={handleOpenKModal}
          />
        </MenuSection>

        {/* Thiết bị */}
        <MenuSection title="Thiết bị">
          <MenuItem
            icon="cube-outline"
            label="Danh sách thiết bị"
            onPress={() => router.push('/(tabs)/account/devices')}
          />
          <MenuItem
            icon="keypad-outline"
            label="PIN mở khóa"
            sublabel="Cài đặt PIN 6 số để mở khóa không thanh toán"
            onPress={() => router.push('/(tabs)/account/unlock-pin')}
          />
          <MenuItem
            icon="wifi-outline"
            label="Cấu hình WiFi thiết bị"
            onPress={() => router.push('/(tabs)/account/wifi-config')}
          />
        </MenuSection>

        {/* Hỗ trợ */}
        <MenuSection title="Hỗ trợ">
          <MenuItem
            icon="help-circle-outline"
            label="Trung tâm hỗ trợ"
            sublabel="support@embox.vn"
            onPress={handleSupport}
          />
          <MenuItem
            icon="document-text-outline"
            label="Điều khoản & Chính sách"
            sublabel="Thông tin pháp lý của Embox"
            onPress={handleTerms}
          />
          <MenuItem
            icon="information-circle-outline"
            label="Về ứng dụng"
            sublabel={
              appUpdate.hasUpdate && appUpdate.targetVersion
                ? `Phiên bản ${APP_VERSION} · Có bản mới v${appUpdate.targetVersion}`
                : `Phiên bản ${APP_VERSION}`
            }
            badge={appUpdate.hasUpdate ? 'Mới' : undefined}
            badgeTone="primary"
            onPress={handleAbout}
          />
        </MenuSection>

        {/* Đăng xuất */}
        <MenuSection title="">
          <MenuItem
            icon="log-out-outline"
            label="Đăng xuất"
            onPress={handleLogout}
            danger
          />
        </MenuSection>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Modal chỉnh sửa hệ số K */}
      <Modal
        visible={kModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setKModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={keyboardAvoidingBehavior}
          style={styles.kModalOverlay}
        >
          <TouchableOpacity
            style={styles.kModalBackdrop}
            activeOpacity={1}
            onPress={() => setKModalVisible(false)}
          />
          <View style={styles.kModalCard}>
            <Text style={styles.kModalTitle}>Tỷ lệ hoa hồng</Text>
            <Text style={styles.kModalDesc}>
              Tỷ lệ hoa hồng bạn nhận trên mỗi sản phẩm bán ra tại máy. Ảnh hưởng trực tiếp đến giá bán khách phải trả.{'\n'}
              Giới hạn từ {commissionLimits.min} đến {commissionLimits.max}%.
            </Text>
            <View style={styles.kModalInputRow}>
              <TextInput
                style={[styles.kModalInput, kError ? styles.kModalInputError : null]}
                value={kInputVal}
                onChangeText={(text) => {
                  setKInputVal(text.replace(/[^0-9]/g, ''));
                  if (kError) setKError('');
                }}
                keyboardType="number-pad"
                maxLength={Math.max(3, String(Math.trunc(commissionLimits.max)).length)}
                placeholder="VD: 100"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              <Text style={styles.kModalInputSuffix}>%</Text>
            </View>
            {kError ? <Text style={styles.kModalError}>{kError}</Text> : null}
            <View style={styles.kModalActions}>
              <TouchableOpacity
                style={[styles.kModalBtn, styles.kModalBtnCancel]}
                onPress={() => setKModalVisible(false)}
              >
                <Text style={styles.kModalBtnCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.kModalBtn, styles.kModalBtnSave]}
                onPress={handleSaveK}
                disabled={updateKMutation.isPending}
              >
                {updateKMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.kModalBtnSaveText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AppUpdateModal
        visible={aboutUpdateVisible}
        kind={appUpdate.isForce ? 'force' : 'soft'}
        message={appUpdate.message}
        currentVersion={appUpdate.currentVersion ?? APP_VERSION}
        latestVersion={appUpdate.targetVersion ?? ''}
        onUpdate={openStoreFromAbout}
        onLater={appUpdate.isForce ? undefined : () => setAboutUpdateVisible(false)}
      />

      <AppDialog
        visible={dialog !== null}
        icon={dialog?.icon}
        tone={dialog?.tone}
        title={dialog?.title ?? ''}
        message={dialog?.message}
        onClose={closeDialog}
        actions={dialog?.actions}
      >
        {dialog?.extra === 'support-email' ? (
          <TouchableOpacity
            style={styles.emailChip}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            activeOpacity={0.75}
          >
            <Ionicons name="mail" size={14} color={Colors.primary} />
            <Text style={styles.emailChipText}>{SUPPORT_EMAIL}</Text>
          </TouchableOpacity>
        ) : null}
      </AppDialog>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 24 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },

  profileBadgeRow: { flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'center' },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  profilePhone: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
  },
  roleBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  // K modal
  kModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  kModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  kModalCard: {
    width: '85%',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  kModalTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  kModalDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  kModalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  kModalInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    textAlign: 'center',
  },
  kModalInputError: {
    borderColor: Colors.danger,
  },
  kModalError: {
    fontSize: 12,
    color: Colors.danger,
    marginBottom: 12,
    textAlign: 'center',
  },
  kModalInputSuffix: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  kModalActions: { flexDirection: 'row', gap: 12 },
  kModalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kModalBtnCancel: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  kModalBtnCancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  kModalBtnSave: { backgroundColor: Colors.primary },
  kModalBtnSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Section
  section: { marginHorizontal: 16, marginBottom: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  // Menu item
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: { backgroundColor: '#FEE2E2' },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  menuSublabel: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: Colors.danger,
    borderRadius: 10,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  badgePrimary: { backgroundColor: Colors.primaryLight },
  badgePrimaryText: { color: Colors.primary },

  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
  },
  emailChipText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
