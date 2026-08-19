import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { getMe, getMyProfile, updatePriceMultiplier } from '@/src/api/users';
import { logout } from '@/src/api/auth';
import { useAuthStore } from '@/src/stores/authStore';
import { getWalletBalance } from '@/src/api/wallet';
import { Colors } from '@/constants/Colors';
import Constants from 'expo-constants';

const APP_VERSION = Constants.expoConfig?.version ?? '—';
const APP_NAME = Constants.expoConfig?.name ?? 'Embox';

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}

/** Quy đổi hệ số K (0.0–3.0) sang tỷ lệ % nguyên để hiển thị cho người dùng (100% = mặc định). */
function toCommissionPercent(priceMultiplier: number): number {
  return Math.round(priceMultiplier * 100);
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
}

function MenuItem({ icon, label, sublabel, onPress, danger, badge }: MenuItemProps) {
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
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
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
      Alert.alert('Thành công', 'Đã cập nhật tỷ lệ hoa hồng. Giá bán đã được làm mới.');
    },
    onError: () => {
      Alert.alert('Lỗi', 'Không thể cập nhật. Vui lòng thử lại.');
    },
  });

  const handleOpenKModal = () => {
    const current = userQuery.data?.priceMultiplier ?? 1;
    setKInputVal(toCommissionPercent(current).toString());
    setKModalVisible(true);
  };

  const handleSaveK = () => {
    const trimmed = kInputVal.trim();
    // Ràng buộc chặt: chỉ chấp nhận số nguyên dương (không thập phân, không dấu, không khoảng trắng)
    // để tránh nhập sai đơn vị (ví dụ gõ nhầm hệ số K thay vì %).
    if (!/^\d+$/.test(trimmed)) {
      Alert.alert('Giá trị không hợp lệ', 'Tỷ lệ hoa hồng phải là số nguyên, ví dụ: 100');
      return;
    }
    const percent = parseInt(trimmed, 10);
    if (percent < 0 || percent > 300) {
      Alert.alert('Giá trị không hợp lệ', 'Tỷ lệ hoa hồng phải từ 0% đến 300%');
      return;
    }
    updateKMutation.mutate(percent / 100);
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (_) {
            // xóa token dù logout API thất bại
          }
          setHasToken(false);
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const user = userQuery.data;
  const profile = profileQuery.data;
  const wallet = walletQuery.data;

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
            sublabel="Tên, email, ảnh đại diện"
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
            sublabel="Xem và xóa máy vending"
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
            sublabel="Gửi thông tin WiFi qua Bluetooth (BluFi)"
            onPress={() => router.push('/(tabs)/account/wifi-config')}
          />
        </MenuSection>

        {/* Hỗ trợ */}
        <MenuSection title="Hỗ trợ">
          <MenuItem
            icon="help-circle-outline"
            label="Trung tâm hỗ trợ"
            onPress={() => Alert.alert('Hỗ trợ', 'Liên hệ: support@embox.vn')}
          />
          <MenuItem
            icon="document-text-outline"
            label="Điều khoản & Chính sách"
            onPress={() => Alert.alert('Điều khoản', 'Đang cập nhật...')}
          />
          <MenuItem
            icon="information-circle-outline"
            label="Về ứng dụng"
            sublabel={`Phiên bản ${APP_VERSION}`}
            onPress={() => Alert.alert('Về ứng dụng', `${APP_NAME} v${APP_VERSION}`)}
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              Tỷ lệ hoa hồng bạn nhận trên mỗi sản phẩm bán ra tại máy — ảnh hưởng trực tiếp đến giá bán khách phải trả.{'\n'}
              Mặc định 100%. Chỉ nhập số nguyên từ 0 đến 300.
            </Text>
            <View style={styles.kModalInputRow}>
              <TextInput
                style={styles.kModalInput}
                value={kInputVal}
                onChangeText={(text) => setKInputVal(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="VD: 100"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              <Text style={styles.kModalInputSuffix}>%</Text>
            </View>
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
    marginBottom: 20,
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
});
