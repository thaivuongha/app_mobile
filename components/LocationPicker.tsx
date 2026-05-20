/**
 * LocationPicker — chọn Tỉnh/Quận/Phường từ API provinces.open-api.vn
 *
 * Sử dụng:
 *   <LocationPicker
 *     placeholder="Chọn Tỉnh / Thành phố"
 *     value={province}
 *     items={provinces}
 *     loading={loadingProvinces}
 *     onSelect={setProvince}
 *   />
 */
import { useState, useMemo } from 'react';
import {
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar as RNStatusBar,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export interface LocationItem {
  code: number;
  name: string;
}

interface LocationPickerProps {
  placeholder: string;
  value: LocationItem | null;
  items: LocationItem[];
  loading?: boolean;
  disabled?: boolean;
  onSelect: (item: LocationItem) => void;
}

export function LocationPicker({
  placeholder,
  value,
  items,
  loading = false,
  disabled = false,
  onSelect,
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      search.length === 0
        ? items
        : items.filter((i) =>
            i.name.toLowerCase().includes(search.toLowerCase())
          ),
    [items, search]
  );

  const handleOpen = () => {
    if (!disabled && !loading) setOpen(true);
  };

  const handleSelect = (item: LocationItem) => {
    onSelect(item);
    setOpen(false);
    setSearch('');
  };

  const handleClose = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.selector,
          disabled && styles.selectorDisabled,
          value && styles.selectorFilled,
        ]}
        onPress={handleOpen}
        disabled={disabled || loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 4 }} />
        ) : (
          <Text
            style={[styles.selectorText, !value && styles.placeholder]}
            numberOfLines={1}
          >
            {value ? value.name : placeholder}
          </Text>
        )}
        <Ionicons
          name="chevron-down"
          size={16}
          color={disabled ? Colors.textMuted : Colors.textSecondary}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar style="dark" />

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{placeholder}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.code)}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = value?.code === item.code;
              return (
                <TouchableOpacity
                  style={[styles.listItem, selected && styles.listItemSelected]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.listItemText,
                      selected && styles.listItemTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ─── Hook lấy dữ liệu địa chỉ Vietnam ────────────────────────────────────────

const VN_API = 'https://provinces.open-api.vn/api';

export function useProvinces() {
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (provinces.length > 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${VN_API}/p/?depth=1`);
      const data = (await res.json()) as { code: number; name: string }[];
      setProvinces(data.map((p) => ({ code: p.code, name: p.name })));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return { provinces, loading, load };
}

export async function fetchDistricts(provinceCode: number): Promise<LocationItem[]> {
  const res = await fetch(`${VN_API}/p/${provinceCode}?depth=2`);
  const data = (await res.json()) as {
    districts: { code: number; name: string }[];
  };
  return (data.districts ?? []).map((d) => ({ code: d.code, name: d.name }));
}

export async function fetchWards(districtCode: number): Promise<LocationItem[]> {
  const res = await fetch(`${VN_API}/d/${districtCode}?depth=2`);
  const data = (await res.json()) as {
    wards: { code: number; name: string }[];
  };
  return (data.wards ?? []).map((w) => ({ code: w.code, name: w.name }));
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: Colors.card,
    gap: 6,
  },
  selectorDisabled: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
  },
  selectorFilled: {
    borderColor: Colors.primary,
  },
  selectorText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  placeholder: {
    color: Colors.textMuted,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    padding: 0,
  },

  // List
  listContent: { paddingBottom: 24 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  listItemSelected: {
    backgroundColor: Colors.primaryLight,
  },
  listItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
  },
  listItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },

  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
});
