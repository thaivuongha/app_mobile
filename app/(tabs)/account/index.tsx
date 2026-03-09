import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMe, getMyProfile } from '@/src/api/users';
import { logout } from '@/src/api/auth';
import { useAuthStore } from '@/src/stores/authStore';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

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

  const userQuery = useQuery({ queryKey: ['users', 'me'], queryFn: getMe });
  const profileQuery = useQuery({ queryKey: ['user-profiles', 'me'], queryFn: getMyProfile });

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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
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
            {user?.role && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{user.role}</Text>
              </View>
            )}
          </View>
        </View>

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
        </MenuSection>

        {/* Cài đặt */}
        <MenuSection title="Cài đặt">
          <MenuItem
            icon="location-outline"
            label="Địa chỉ giao hàng"
            sublabel="Quản lý địa chỉ nhận hàng"
            onPress={() => router.push({ pathname: '/(tabs)/account/delivery-addresses', params: { from: 'account' } })}
          />
          <MenuItem
            icon="card-outline"
            label="Thông tin thanh toán"
            sublabel="Tài khoản ngân hàng nhận tiền VietQR"
            onPress={() => router.push({ pathname: '/(tabs)/account/payment-methods', params: { from: 'account' } })}
          />
          <MenuItem
            icon="document-text-outline"
            label="Cài đặt hóa đơn"
            sublabel="Thông tin xuất hóa đơn VAT"
            onPress={() => router.push('/(tabs)/account/invoice')}
          />
          <MenuItem
            icon="trending-up-outline"
            label="Lợi nhuận"
            sublabel="Tỷ lệ phần trăm lợi nhuận mỗi giao dịch"
            onPress={() => router.push('/(tabs)/account/commission')}
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
            onPress={() => Alert.alert('Hỗ trợ', 'Liên hệ: support@vendingmachine.vn')}
          />
          <MenuItem
            icon="document-text-outline"
            label="Điều khoản & Chính sách"
            onPress={() => Alert.alert('Điều khoản', 'Đang cập nhật...')}
          />
          <MenuItem
            icon="information-circle-outline"
            label="Về ứng dụng"
            sublabel="Version 1.0.0"
            onPress={() => Alert.alert('Về ứng dụng', 'VendingMachine v1.0.0')}
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
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
  },
  roleBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

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
