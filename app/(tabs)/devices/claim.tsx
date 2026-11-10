import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { claimDevice } from '@/src/api/devices';
import { ApiClientError } from '@/src/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';

const FLOOR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const CLAIM_STEPS = [
  {
    title: 'Cấu hình kết nối WiFi cho thiết bị',
    body: 'Trên app, vào trang "Đối tác" sau đó chọn "Cấu hình WiFi thiết bị" để cài đặt.',
  },
  {
    title: 'Đưa thiết bị vào chế độ thêm',
    body: 'Trên thiết bị, chọn vào biểu tương "Cài đặt" sau đó chọn biểu tượng "Thêm" để bắt đầu.',
  },
  {
    title: 'Nhập mã thiết bị',
    body: 'Trên App, nhập Serial Number và Owner Key in trên thẻ thiết bị. Nhập tên phòng và lầu lắp đặt thiết bị. Bấm Thêm thiết bị để hoàn tất',
  },
];

export default function ClaimDeviceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [deviceName, setDeviceName] = useState('');
  const [floor, setFloor] = useState<number | null>(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [ownerKey, setOwnerKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const handleClaim = async () => {
    const serial = serialNumber.trim();
    const key = ownerKey.trim();
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
      Alert.alert('✅ Thành công', 'Thêm thiết bị thành công!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : 'Thêm thiết bị thất bại. Vui lòng kiểm tra lại thông tin.';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAwareScrollView
          contentContainerStyle={styles.container}
        >
          <TouchableOpacity
            style={styles.guideBtn}
            onPress={() => setGuideVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="help-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.guideBtnText}>Hướng dẫn thêm</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Nhập mã thiết bị</Text>
            </View>

            <Text style={styles.label}>
              Serial Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={serialNumber}
              onChangeText={setSerialNumber}
              placeholder="K7M2Q9PX"
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

            <Text style={styles.label}>Chọn lầu</Text>
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
                <Text style={styles.buttonText}>Thêm thiết bị</Text>
              </>
            )}
          </TouchableOpacity>
      </KeyboardAwareScrollView>

      <Modal visible={guideVisible} animationType="slide" transparent onRequestClose={() => setGuideVisible(false)}>
        <View style={styles.modalRoot}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setGuideVisible(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Hướng dẫn thêm thiết bị</Text>
            <TouchableOpacity
              onPress={() => setGuideVisible(false)}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Đóng"
            >
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {CLAIM_STEPS.map((step, index) => (
            <View key={step.title} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{index + 1}</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>
        </View>
      </Modal>
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

  guideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    marginBottom: 16,
  },
  guideBtnText: { fontSize: 15, fontWeight: '700', color: Colors.primary },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 14,
    gap: 12,
  },
  sheetTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  stepText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
