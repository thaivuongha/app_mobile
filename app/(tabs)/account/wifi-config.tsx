/**
 * WiFi Config Screen — Cấu hình WiFi cho máy vending qua BluFi (BLE)
 *
 * Header (title + back) do Stack navigator trong account/_layout.tsx quản lý.
 * Flow: Intro → Scan BLE → Chọn thiết bị → Nhập WiFi → Gửi → Kết quả
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { useBlufi } from '@/src/hooks/useBlufi';
import type { BluFiDevice } from '@/src/services/blufi/types';

interface WifiAP {
  ssid: string;
  rssi: number;
}

type Screen = 'intro' | 'scan' | 'preparing' | 'credentials' | 'provisioning' | 'result';

export default function WifiConfigScreen() {
  const router = useRouter();
  const blufi = useBlufi();

  const [screen, setScreen] = useState<Screen>('intro');
  const [selectedDevice, setSelectedDevice] = useState<BluFiDevice | null>(null);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showWifiPicker, setShowWifiPicker] = useState(false);
  const [wifiList, setWifiList] = useState<WifiAP[]>([]);
  const [wifiListLoading, setWifiListLoading] = useState(false);

  const scanPhoneWifi = async () => {
    if (Platform.OS !== 'android') return; // iOS không hỗ trợ scan WiFi list
    setWifiListLoading(true);
    setWifiList([]);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const WifiManager = require('react-native-wifi-reborn').default;
      const list = await WifiManager.reScanAndLoadWifiList();
      // Deduplicate theo SSID, giữ tín hiệu mạnh nhất; sort giảm dần
      const deduped = new Map<string, WifiAP>();
      for (const ap of list as Array<{ SSID: string; level: number }>) {
        if (!ap.SSID?.trim()) continue;
        const existing = deduped.get(ap.SSID);
        if (!existing || ap.level > existing.rssi) {
          deduped.set(ap.SSID, { ssid: ap.SSID, rssi: ap.level });
        }
      }
      setWifiList([...deduped.values()].sort((a, b) => b.rssi - a.rssi));
    } catch {
      Alert.alert(
        'Không thể quét WiFi',
        'Đảm bảo WiFi và Vị trí đang bật trên điện thoại.'
      );
    } finally {
      setWifiListLoading(false);
    }
  };

  useEffect(() => {
    if (blufi.step === 'connecting' || blufi.step === 'negotiating') {
      setScreen('preparing');
    } else if (blufi.step === 'ready') {
      setScreen('credentials');
    } else if (blufi.step === 'provisioning') {
      setScreen('provisioning');
    } else if (blufi.step === 'done' || blufi.step === 'error') {
      setScreen('result');
    }
  }, [blufi.step]);

  // BLE native module chưa có (chạy trên Expo Go / chưa prebuild)
  if (blufi.bleUnavailable) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredContent}>
          <View style={[styles.iconBig, { backgroundColor: Colors.warningLight }]}>
            <Ionicons name="construct-outline" size={48} color={Colors.warning} />
          </View>
          <Text style={styles.pageTitle}>Yêu cầu Development Build</Text>
          <Text style={styles.pageDesc}>
            Tính năng Bluetooth (BluFi) không chạy được trên Expo Go vì cần native module.{'\n\n'}
            Bạn cần build app bằng:{'\n'}
            {'  '}• <Text style={{ fontWeight: '700' }}>EAS Build</Text> (đề xuất){'\n'}
            {'  '}• hoặc <Text style={{ fontWeight: '700' }}>expo prebuild</Text> + Android Studio / Xcode
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleStartScan = async () => {
    const granted = await blufi.requestPermissions();
    if (!granted) return;
    setScreen('scan');
    blufi.startScan();
  };

  const handleSelectDevice = async (device: BluFiDevice) => {
    setSelectedDevice(device);
    setScreen('preparing'); // chuyển màn hình ngay, không chờ useEffect
    await blufi.connectAndPrepare(device);
  };

  const handleSendCredentials = async () => {
    if (!ssid.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên WiFi (SSID).');
      return;
    }
    await blufi.sendCredentials({
      ssid: ssid.trim(),
      password: password.trim(),
    });
  };

  const handleReset = () => {
    blufi.reset();
    setSelectedDevice(null);
    setSsid('');
    setPassword('');
    setScreen('intro');
  };

  return (
    <View style={styles.container}>
      {screen === 'intro' && <IntroScreen onStart={handleStartScan} />}

      {screen === 'scan' && (
        <ScanScreen
          devices={blufi.devices}
          isScanning={blufi.step === 'scanning'}
          onSelect={handleSelectDevice}
          onRescan={blufi.startScan}
          onStop={blufi.stopScanning}
        />
      )}

      {screen === 'preparing' && (
        <PreparingScreen step={blufi.step} device={selectedDevice} />
      )}

      {screen === 'credentials' && selectedDevice && (
        <CredentialsScreen
          device={selectedDevice}
          ssid={ssid}
          password={password}
          showPassword={showPassword}
          wifiList={wifiList}
          wifiListLoading={wifiListLoading}
          onSsidChange={setSsid}
          onPasswordChange={setPassword}
          onTogglePassword={() => setShowPassword((p) => !p)}
          onSend={handleSendCredentials}
          onBack={handleReset}
          onOpenWifiPicker={() => {
            setShowWifiPicker(true);
            if (wifiList.length === 0) scanPhoneWifi();
          }}
          onRefreshWifiList={scanPhoneWifi}
        />
      )}

      {/* WiFi Picker Modal */}
      <Modal
        visible={showWifiPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWifiPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn mạng WiFi</Text>
              <TouchableOpacity onPress={() => setShowWifiPicker(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {wifiListLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.modalLoadingText}>Đang quét mạng WiFi...</Text>
                <Text style={styles.modalLoadingHint}>Có thể mất vài giây</Text>
              </View>
            ) : wifiList.length === 0 ? (
              <View style={styles.modalLoading}>
                <Ionicons name="wifi-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.modalLoadingText}>Không tìm thấy mạng WiFi</Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 16 }]}
                  onPress={scanPhoneWifi}
                >
                  <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>Quét lại</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.modalListHeader}>
                  <Text style={styles.modalListCount}>{wifiList.length} mạng tìm thấy</Text>
                  <TouchableOpacity onPress={scanPhoneWifi} style={styles.rescanBtn}>
                    <Ionicons name="refresh" size={15} color={Colors.primary} />
                    <Text style={styles.rescanText}>Quét lại</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={wifiList}
                  keyExtractor={(ap) => ap.ssid}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.wifiApRow,
                        item.ssid === ssid && styles.wifiApRowSelected,
                      ]}
                      onPress={() => {
                        setSsid(item.ssid);
                        setShowWifiPicker(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <WifiSignalIcon rssi={item.rssi} selected={item.ssid === ssid} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.wifiApName,
                            item.ssid === ssid && { color: Colors.primary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.ssid}
                        </Text>
                        <Text style={styles.wifiApRssi}>{item.rssi} dBm</Text>
                      </View>
                      {item.ssid === ssid && (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      {screen === 'provisioning' && (
        <ProvisioningScreen device={selectedDevice} />
      )}

      {screen === 'result' && (
        <ResultScreen
          success={blufi.step === 'done'}
          errorMessage={blufi.errorMessage}
          bssid={blufi.connectedBssid}
          device={selectedDevice}
          onRetry={handleReset}
          onDone={() => router.back()}
        />
      )}
    </View>
  );
}

// ─── Sub-screens ──────────────────────────────────────────────────────────────

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.centeredContent}>
      <View style={styles.iconBig}>
        <Ionicons name="wifi" size={48} color={Colors.primary} />
      </View>
      <Text style={styles.pageTitle}>Cấu hình WiFi cho máy vending</Text>
      <Text style={styles.pageDesc}>
        Kết nối điện thoại với máy bán hàng qua Bluetooth để gửi thông tin WiFi. Thiết bị sẽ tự
        kết nối vào mạng bạn cung cấp.
      </Text>

      <View style={styles.stepList}>
        {[
          { icon: 'bluetooth', text: 'Mở Bluetooth trên điện thoại' },
          { icon: 'search', text: 'Quét tìm máy vending ở gần' },
          { icon: 'keypad-outline', text: 'Nhập tên WiFi và mật khẩu' },
          { icon: 'checkmark-circle-outline', text: 'Thiết bị tự động kết nối' },
        ].map((s, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Ionicons
              name={s.icon as any}
              size={20}
              color={Colors.primary}
              style={{ marginRight: 10 }}
            />
            <Text style={styles.stepText}>{s.text}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.noteText}>
        Yêu cầu quyền Bluetooth và Vị trí. App cần Development Build (không hỗ trợ Expo Go).
      </Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={onStart} activeOpacity={0.85}>
        <Ionicons name="bluetooth" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.primaryBtnText}>Bắt đầu quét thiết bị</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ScanScreen({
  devices,
  isScanning,
  onSelect,
  onRescan,
  onStop,
}: {
  devices: BluFiDevice[];
  isScanning: boolean;
  onSelect: (d: BluFiDevice) => void;
  onRescan: () => void;
  onStop: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.scanStatus}>
        {isScanning ? (
          <>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.scanStatusText}>Đang quét Bluetooth...</Text>
            <TouchableOpacity onPress={onStop}>
              <Text style={styles.actionText}>Dừng</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.scanStatusText}>Hoàn tất quét</Text>
            <TouchableOpacity onPress={onRescan}>
              <Text style={styles.actionText}>Quét lại</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {devices.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bluetooth-outline" size={52} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>
            {isScanning ? 'Đang tìm kiếm...' : 'Không tìm thấy thiết bị'}
          </Text>
          <Text style={styles.emptyDesc}>
            Đảm bảo máy vending đang ở chế độ cấu hình WiFi và trong phạm vi Bluetooth (~10m).
          </Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const signalColor =
              item.rssi > -65 ? Colors.success : item.rssi > -80 ? Colors.warning : Colors.danger;
            const signalIcon =
              item.rssi > -65 ? 'wifi' : item.rssi > -80 ? 'wifi-outline' : 'cellular-outline';
            return (
              <TouchableOpacity
                style={styles.deviceCard}
                onPress={() => onSelect(item)}
                activeOpacity={0.8}
              >
                <View style={styles.deviceIcon}>
                  <Ionicons name="hardware-chip-outline" size={24} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deviceName}>{item.name}</Text>
                  <Text style={styles.deviceId}>{item.id}</Text>
                </View>
                <View style={styles.rssiChip}>
                  <Ionicons name={signalIcon} size={14} color={signalColor} />
                  <Text style={[styles.rssiText, { color: signalColor }]}>{item.rssi} dBm</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

function CredentialsScreen({
  device,
  ssid,
  password,
  showPassword,
  wifiList,
  wifiListLoading,
  onSsidChange,
  onPasswordChange,
  onTogglePassword,
  onSend,
  onBack,
  onOpenWifiPicker,
  onRefreshWifiList,
}: {
  device: BluFiDevice;
  ssid: string;
  password: string;
  showPassword: boolean;
  wifiList: WifiAP[];
  wifiListLoading: boolean;
  onSsidChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onTogglePassword: () => void;
  onSend: () => void;
  onBack: () => void;
  onOpenWifiPicker: () => void;
  onRefreshWifiList: () => void;
}) {
  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.centeredContent}>
      {/* Thiết bị đã chọn */}
      <View style={styles.deviceSelected}>
        <View style={styles.deviceIcon}>
          <Ionicons name="hardware-chip" size={22} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceId}>{device.id}</Text>
        </View>
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '600' }}>Đổi</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Thông tin WiFi</Text>

      <View style={styles.inputGroup}>
        <View style={styles.inputLabelRow}>
          <Text style={styles.inputLabel}>Tên mạng WiFi (SSID)</Text>
          <TouchableOpacity
            style={styles.scanWifiBtn}
            onPress={onOpenWifiPicker}
            activeOpacity={0.75}
          >
            {wifiListLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 4 }} />
            ) : (
              <Ionicons name="search" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
            )}
            <Text style={styles.scanWifiBtnText}>
              {wifiListLoading ? 'Đang quét...' : 'Tìm WiFi'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.inputRow} onPress={onOpenWifiPicker} activeOpacity={0.8}>
          <Ionicons name="wifi" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <Text
            style={[styles.textInput, { flex: 1, color: ssid ? Colors.textPrimary : Colors.textMuted }]}
            numberOfLines={1}
          >
            {ssid || 'Chọn hoặc nhập tên WiFi...'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
        {/* Ô nhập tay bên dưới */}
        <View style={[styles.inputRow, { marginTop: 8 }]}>
          <Ionicons
            name="create-outline"
            size={16}
            color={Colors.textMuted}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.textInput}
            value={ssid}
            onChangeText={onSsidChange}
            placeholder="Hoặc nhập thủ công..."
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Mật khẩu WiFi</Text>
        <View style={styles.inputRow}>
          <Ionicons
            name="lock-closed"
            size={18}
            color={Colors.textMuted}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            value={password}
            onChangeText={onPasswordChange}
            placeholder="Nhập mật khẩu..."
            placeholderTextColor={Colors.textMuted}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={onTogglePassword}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.noteText}>
        Thông tin WiFi chỉ gửi qua Bluetooth trong phạm vi ngắn (~5m). Không lưu trên server.
      </Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={onSend} activeOpacity={0.85}>
        <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.primaryBtnText}>Gửi cấu hình WiFi</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

function PreparingScreen({ step, device }: { step: string; device: BluFiDevice | null }) {
  const steps = [
    { key: 'connecting', label: 'Kết nối Bluetooth...' },
    { key: 'negotiating', label: 'Bảo mật kết nối (DH)...' },
  ];
  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <View style={styles.centeredContent}>
      <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: 24 }} />
      <Text style={styles.pageTitle}>{device?.name ?? 'Máy vending'}</Text>
      <Text style={styles.pageDesc}>Đang thiết lập kết nối an toàn...</Text>

      <View style={styles.stepList}>
        {steps.map((s, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <View key={s.key} style={styles.stepRow}>
              {isDone ? (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={Colors.success}
                  style={{ marginRight: 12 }}
                />
              ) : isCurrent ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.primary}
                  style={{ marginRight: 12 }}
                />
              ) : (
                <View style={[styles.stepNum, { backgroundColor: Colors.border, marginRight: 12 }]}>
                  <Text style={[styles.stepNumText, { color: Colors.textMuted }]}>{i + 1}</Text>
                </View>
              )}
              <Text
                style={[
                  styles.stepText,
                  {
                    color: isCurrent
                      ? Colors.primary
                      : isDone
                        ? Colors.success
                        : Colors.textMuted,
                  },
                ]}
              >
                {s.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ProvisioningScreen({ device }: { device: BluFiDevice | null }) {
  return (
    <View style={styles.centeredContent}>
      <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: 24 }} />
      <Text style={styles.pageTitle}>Đang gửi thông tin WiFi...</Text>
      <Text style={styles.pageDesc}>{device?.name ?? 'Máy vending'}</Text>
    </View>
  );
}

function ResultScreen({
  success,
  errorMessage,
  bssid,
  device,
  onRetry,
  onDone,
}: {
  success: boolean;
  errorMessage: string | null;
  bssid: string | undefined;
  device: BluFiDevice | null;
  onRetry: () => void;
  onDone: () => void;
}) {
  return (
    <View style={styles.centeredContent}>
      {success ? (
        <>
          <View style={[styles.iconBig, { backgroundColor: Colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={52} color={Colors.success} />
          </View>
          <Text style={styles.pageTitle}>Đã gửi thông tin thành công!</Text>
          <Text style={styles.pageDesc}>
            Thông tin WiFi đã được gửi đến {device?.name ?? 'thiết bị'}.{'\n\n'}
            Thiết bị sẽ tự động kết nối vào mạng WiFi và khởi động lại.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onDone} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Hoàn tất</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={[styles.iconBig, { backgroundColor: Colors.dangerLight }]}>
            <Ionicons name="close-circle" size={52} color={Colors.danger} />
          </View>
          <Text style={[styles.pageTitle, { color: Colors.danger }]}>Cấu hình thất bại</Text>
          <Text style={styles.pageDesc}>{errorMessage ?? 'Đã xảy ra lỗi khi cấu hình WiFi.'}</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: Colors.danger }]}
            onPress={onRetry}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function WifiSignalIcon({ rssi, selected }: { rssi: number; selected: boolean; }) {
  const color = selected ? Colors.primary : rssi > -65 ? Colors.success : rssi > -80 ? Colors.warning : Colors.danger;
  const icon = rssi > -65 ? 'wifi' : rssi > -80 ? 'wifi-outline' : 'cellular-outline';
  return (
    <View style={styles.wifiApIcon}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  centeredContent: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBig: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  pageDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  noteText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 12,
  },

  stepList: { width: '100%', gap: 10, marginBottom: 28 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  stepText: { fontSize: 14, color: Colors.textPrimary, flex: 1 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Scan
  scanStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  scanStatusText: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  actionText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptyDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 19 },

  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  deviceSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  deviceId: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  rssiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rssiText: { fontSize: 11, fontWeight: '600' },

  // Credentials
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  inputGroup: { width: '100%', marginBottom: 16 },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  scanWifiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scanWifiBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    padding: 0,
  },

  // WiFi Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  modalLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  modalLoadingText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  modalLoadingHint: { fontSize: 13, color: Colors.textMuted },
  modalListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalListCount: { fontSize: 13, color: Colors.textMuted },
  rescanBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rescanText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  wifiApRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  wifiApRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  wifiApIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wifiApName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  wifiApRssi: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
