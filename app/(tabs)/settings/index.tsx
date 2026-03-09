import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const SETTINGS_ITEMS = [
  {
    icon: 'location-outline' as const,
    label: 'Địa chỉ giao hàng',
    href: '/(tabs)/settings/delivery-addresses' as const,
    desc: 'Quản lý địa chỉ nhận hàng',
  },
  {
    icon: 'card-outline' as const,
    label: 'Phương thức thanh toán',
    href: '/(tabs)/settings/payment-methods' as const,
    desc: 'Thông tin ngân hàng nhận tiền',
  },
  {
    icon: 'document-text-outline' as const,
    label: 'Cài đặt hóa đơn',
    href: '/(tabs)/settings/invoice' as const,
    desc: 'Thông tin xuất hóa đơn VAT',
  },
  {
    icon: 'trending-up-outline' as const,
    label: 'Lợi nhuận (commission)',
    href: '/(tabs)/settings/commission' as const,
    desc: 'Tỷ lệ phần trăm lợi nhuận',
  },
];

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cài đặt</Text>
          <Text style={styles.headerSub}>Quản lý tài khoản và thiết lập hệ thống</Text>
        </View>

        <View style={styles.section}>
          {SETTINGS_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.href}
              style={[styles.row, index === SETTINGS_ITEMS.length - 1 && styles.rowLast]}
              onPress={() => router.push(item.href)}
              activeOpacity={0.7}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={item.icon} size={20} color={Colors.primary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20 },

  header: { marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  headerSub: { fontSize: 14, color: Colors.textMuted },

  section: {
    backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  rowDesc: { fontSize: 12, color: Colors.textMuted },
});
