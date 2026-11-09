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
  ScrollView,
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
  const warehouseTotal = items.reduce((sum, item) => sum + item.warehouseQty, 0);
  const onMachineTotal = items.reduce((sum, item) => sum + item.onMachineQty, 0);

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
      ) : items.length === 0 ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.centered}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
        >
          <Ionicons name="cube-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Chưa có hàng trong kho</Text>
        </ScrollView>
      ) : (
        <View style={styles.tableCard}>
          <View style={styles.headRow}>
            <Text style={[styles.headLabel, styles.productCell]} numberOfLines={1}>
              Sản phẩm
            </Text>
            <Text style={[styles.headLabel, styles.numCell]} numberOfLines={1}>
              Tồn kho
            </Text>
            <Text style={[styles.headLabel, styles.numCell]} numberOfLines={1}>
              Trên máy
            </Text>
          </View>
          <FlatList
            style={styles.list}
            data={items}
            keyExtractor={(item) => item.productId}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={Colors.primary}
              />
            }
            renderItem={({ item }) => (
              <StockRow item={item} onEdit={() => setEditing(item)} />
            )}
          />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.productCell]}>Tổng</Text>
            <Text
              style={[
                styles.totalValue,
                styles.numCell,
                warehouseTotal < 0 && styles.qtyNegative,
              ]}
            >
              {warehouseTotal}
            </Text>
            <Text style={[styles.totalValue, styles.numCell]}>{onMachineTotal}</Text>
          </View>
        </View>
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
    <TouchableOpacity style={styles.dataRow} onPress={onEdit} activeOpacity={0.7}>
      <View style={[styles.productCell, styles.productContent]}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="cube-outline" size={18} color={Colors.textMuted} />
          </View>
        )}
        <View style={styles.productText}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.brand} numberOfLines={1}>
            {item.brandName}
          </Text>
        </View>
      </View>
      <View style={styles.qtyCell}>
        <Ionicons name="create-outline" size={13} color={Colors.textMuted} style={styles.editHint} />
        <Text style={[styles.qtyValue, item.warehouseQty < 0 && styles.qtyNegative]}>
          {item.warehouseQty}
        </Text>
      </View>
      <Text style={[styles.qtyValue, styles.numCell]}>{item.onMachineQty}</Text>
    </TouchableOpacity>
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
    const parsed = Number.parseInt(qtyText, 10);
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
          <View style={styles.sheetHandle} />
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

  fill: { flex: 1 },
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

  tableCard: {
    flexGrow: 0,
    flexShrink: 1,
    margin: 16,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  list: { flexGrow: 0, flexShrink: 1 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  productCell: { flex: 1 },
  productContent: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 },
  productText: { flex: 1 },
  numCell: { width: 84, textAlign: 'right' },
  qtyCell: {
    width: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },
  editHint: { opacity: 0.45 },
  image: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.surface },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, lineHeight: 18 },
  brand: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  qtyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  qtyNegative: { color: Colors.danger },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: Colors.primaryLight,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 8,
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
