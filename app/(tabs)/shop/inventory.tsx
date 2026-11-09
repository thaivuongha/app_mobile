import { useRouter, useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { keyboardAvoidingBehavior } from '@/components/KeyboardAwareScrollView';
import { getMyStock, setWarehouse, type PartnerStockItem } from '@/src/api/inventory';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

export default function ShopInventoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PartnerStockItem | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['inventory', 'my-stock'],
    queryFn: getMyStock,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const items = data?.data ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tồn kho</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải tồn kho...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.danger} />
          <Text style={styles.emptyTitle}>Không tải được tồn kho</Text>
          <Text style={styles.emptySubtitle}>
            {(error as { message?: string })?.message ?? 'Lỗi kết nối. Kiểm tra lại mạng và thử lại.'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.productId}
          contentContainerStyle={items.length === 0 ? styles.listEmpty : styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="cube-outline" size={56} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Chưa có hàng trong kho</Text>
            </View>
          }
          renderItem={({ item }) => <StockRow item={item} onEdit={() => setEditing(item)} />}
        />
      )}

      <CountModal
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          queryClient.invalidateQueries({ queryKey: ['inventory', 'my-stock'] });
        }}
      />
    </SafeAreaView>
  );
}

function StockRow({ item, onEdit }: { item: PartnerStockItem; onEdit: () => void }) {
  return (
    <View style={styles.card}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="cube-outline" size={28} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.brand} numberOfLines={1}>
          {item.brandName}
        </Text>
        <View style={styles.qtyRow}>
          <View style={styles.qtyBlock}>
            <Text style={styles.qtyLabel}>Tồn kho</Text>
            <Text style={[styles.qtyValue, item.warehouseQty < 0 && styles.qtyNegative]}>
              {item.warehouseQty}
            </Text>
          </View>
          <View style={styles.qtyBlock}>
            <Text style={styles.qtyLabel}>Trên máy</Text>
            <Text style={styles.qtyValue}>{item.onMachineQty}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function CountModal({
  item,
  onClose,
  onSaved,
}: {
  item: PartnerStockItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [qtyText, setQtyText] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: (body: { warehouseQty: number; note?: string }) =>
      setWarehouse(item!.productId, body),
    onSuccess: onSaved,
    onError: (e) =>
      Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Không lưu được tồn kho'),
  });

  const openQty = item ? String(item.warehouseQty) : '';

  const handleSave = () => {
    const parsed = Number.parseInt(qtyText || openQty, 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      Alert.alert('Số không hợp lệ', 'Nhập số chai từ 0 trở lên.');
      return;
    }
    mutation.mutate({
      warehouseQty: parsed,
      note: note.trim() || undefined,
    });
  };

  return (
    <Modal
      visible={!!item}
      transparent
      animationType="slide"
      onShow={() => {
        setQtyText(openQty);
        setNote('');
      }}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView behavior={keyboardAvoidingBehavior} style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Kiểm kho</Text>
          <Text style={styles.sheetProduct} numberOfLines={2}>
            {item?.name}
          </Text>
          <Text style={styles.sheetHint}>Nhập số chai đang còn trong kho. Số trên máy không đổi.</Text>
          <TextInput
            style={styles.input}
            value={qtyText}
            onChangeText={setQtyText}
            keyboardType="number-pad"
            placeholder="Số chai"
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            placeholder="Ghi chú (không bắt buộc)"
            placeholderTextColor={Colors.textMuted}
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.saveBtn, mutation.isPending && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Lưu</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginLeft: 4 },

  list: { padding: 16, paddingBottom: 32 },
  listEmpty: { flexGrow: 1 },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  loadingText: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: { width: 72, height: 72, borderRadius: 10 },
  imagePlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, lineHeight: 20 },
  brand: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  qtyRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  qtyBlock: { minWidth: 72 },
  qtyLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  qtyValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  qtyNegative: { color: Colors.danger },
  editBtn: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  sheetProduct: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  sheetHint: { fontSize: 13, color: Colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  noteInput: { fontSize: 14 },
  saveBtn: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
