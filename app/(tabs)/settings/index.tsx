import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function SettingsScreen() {
  const router = useRouter();

  const items = [
    { title: 'Địa chỉ giao hàng', href: '/(tabs)/settings/delivery-addresses' as const },
    { title: 'Phương thức thanh toán', href: '/(tabs)/settings/payment-methods' as const },
    { title: 'Cài đặt hóa đơn', href: '/(tabs)/settings/invoice' as const },
    { title: 'Lợi nhuận (commission)', href: '/(tabs)/settings/commission' as const },
  ];

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.href}
          style={styles.row}
          onPress={() => router.push(item.href)}
        >
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowTitle: { fontSize: 16 },
  chevron: { fontSize: 20, color: '#666' },
});
