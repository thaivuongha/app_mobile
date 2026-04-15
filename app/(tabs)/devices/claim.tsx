import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { claimDevice } from '@/src/api/devices';
import { ApiClientError } from '@/src/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';

const FLOOR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function ClaimDeviceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [deviceName, setDeviceName] = useState('');
  const [floor, setFloor] = useState<number | null>(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [ownerKey, setOwnerKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    const serial = serialNumber.trim();
    const key = ownerKey.trim();
    if (floor === null) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn lầu đặt máy');
      return;
    }
    if (!serial || !key) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Serial Number và Owner Key (từ thẻ trong hộp)');
      return;
    }
    setLoading(true);
    try {
      await claimDevice(serial, key, {
        deviceName: deviceName.trim() || undefined,
        floor: floor ?? undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['my-devices'] });
      Alert.alert('✅ Thành công', 'Claim thiết bị thành công!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Claim thất bại. Vui lòng kiểm tra lại thông tin.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={16}
        enableResetScrollToCoords={false}
      >
          {/* Section 1: Thông tin thiết bị */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="create-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Đặt tên thiết bị</Text>
            </View>

            <Text style={styles.label}>Tên thiết bị</Text>
            <TextInput
              style={styles.input}
              value={deviceName}
              onChangeText={setDeviceName}
              placeholder="VD: Phòng 101, Phòng 201..."
              editable={!loading}
              returnKeyType="next"
            />

            <Text style={styles.label}>
              Chọn lầu <Text style={styles.required}>*</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.floorList}
            >
              {FLOOR_OPTIONS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.floorChip, floor === f && styles.floorChipActive]}
                  onPress={() => setFloor(floor === f ? null : f)}
                  disabled={loading}
                >
                  <Text style={[styles.floorChipText, floor === f && styles.floorChipTextActive]}>
                    Lầu {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {floor === null && (
              <Text style={styles.fieldHint}>Bắt buộc chọn lầu đặt máy</Text>
            )}
          </View>

          {/* Section 2: Thông tin thiết bị từ thẻ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Thông tin từ thẻ trong hộp</Text>
            </View>

            <View style={styles.hintBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.hintText}>
                Tìm thẻ nhỏ trong hộp. Serial Number và Owner Key in trên thẻ.
              </Text>
            </View>

            <Text style={styles.label}>
              Serial Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={serialNumber}
              onChangeText={setSerialNumber}
              placeholder="VM-2026-000001"
              autoCapitalize="characters"
              editable={!loading}
              returnKeyType="next"
            />

            <Text style={styles.label}>
              Owner Key <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={ownerKey}
              onChangeText={setOwnerKey}
              placeholder="Nhập Owner Key"
              autoCapitalize="characters"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleClaim}
            />
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleClaim}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="link-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Claim thiết bị</Text>
              </>
            )}
          </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },

  section: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },

  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary, marginBottom: 8 },
  required: { color: Colors.danger },
  fieldHint: { fontSize: 12, color: Colors.danger, marginTop: 6 },
  required: { color: Colors.danger },

  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },

  floorList: { gap: 8, paddingBottom: 4 },
  floorChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  floorChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  floorChipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  floorChipTextActive: { color: Colors.primary },

  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  hintText: { flex: 1, fontSize: 13, color: Colors.primary, lineHeight: 18 },

  button: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
