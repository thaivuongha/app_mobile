/**
 * useBlufi — React hook quản lý toàn bộ state BluFi provisioning
 *
 * State machine:
 *   idle → scanning → connecting → negotiating → provisioning → waiting_wifi → done
 *                                                                            → error (bất kỳ bước nào)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import {
  type BluFiDevice,
  type BluFiStep,
  type BluFiWifiCredentials,
  BluFiWifiState,
} from '../services/blufi/types';
import {
  initBleManager,
  isBleAvailable,
  scanBluFiDevices,
  stopScan,
  BluFiSession,
} from '../services/blufi/blufiService';

const SCAN_DURATION_SECS = 30;

export interface UseBlufiReturn {
  step: BluFiStep;
  devices: BluFiDevice[];
  connectedDevice: BluFiDevice | null;
  errorMessage: string | null;
  wifiConnected: boolean;
  connectedBssid: string | undefined;
  bleUnavailable: boolean;

  // Actions
  requestPermissions: () => Promise<boolean>;
  startScan: () => void;
  stopScanning: () => void;
  connectAndProvision: (device: BluFiDevice, credentials: BluFiWifiCredentials) => Promise<void>;
  disconnect: () => Promise<void>;
  reset: () => void;
}

export function useBlufi(): UseBlufiReturn {
  const [step, setStep] = useState<BluFiStep>('idle');
  const [devices, setDevices] = useState<BluFiDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BluFiDevice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wifiConnected, setWifiConnected] = useState(false);
  const [connectedBssid, setConnectedBssid] = useState<string | undefined>();
  const [bleUnavailable, setBleUnavailable] = useState(false);

  const sessionRef = useRef<BluFiSession | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);
  const initialized = useRef(false);

  // Khởi tạo BleManager một lần, bắt lỗi nếu native module chưa có (Expo Go)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (!isBleAvailable()) {
        setBleUnavailable(true);
        return;
      }
      initBleManager().catch((err) => {
        console.warn('[useBlufi] initBleManager error:', err);
        setBleUnavailable(true);
      });
    }

    return () => {
      stopScanRef.current?.();
      sessionRef.current?.disconnect().catch(() => {});
    };
  }, []);

  /**
   * Yêu cầu quyền Bluetooth (Android 12+ cần BLUETOOTH_SCAN, BLUETOOTH_CONNECT)
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'ios') return true;

    if (Platform.OS === 'android') {
      if ((Platform.Version as number) >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        const allGranted = Object.values(results).every(
          (r) => r === PermissionsAndroid.RESULTS.GRANTED
        );
        if (!allGranted) {
          Alert.alert(
            'Cần quyền Bluetooth',
            'Vui lòng cấp quyền Bluetooth và Vị trí trong Cài đặt để sử dụng tính năng này.',
            [
              { text: 'Hủy', style: 'cancel' },
              { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
            ]
          );
          return false;
        }
        return true;
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  }, []);

  /**
   * Bắt đầu quét BLE
   */
  const startScan = useCallback(() => {
    setDevices([]);
    setErrorMessage(null);
    setStep('scanning');

    const stopFn = scanBluFiDevices(SCAN_DURATION_SECS, (found) => {
      setDevices([...found].sort((a, b) => b.rssi - a.rssi));
    });
    stopScanRef.current = stopFn;

    // Tự động dừng sau timeout
    setTimeout(() => {
      setStep((prev) => (prev === 'scanning' ? 'idle' : prev));
      stopScanRef.current?.();
    }, SCAN_DURATION_SECS * 1000);
  }, []);

  const stopScanning = useCallback(() => {
    stopScanRef.current?.();
    stopScan().catch(() => {});
    setStep('idle');
  }, []);

  /**
   * Kết nối thiết bị + chạy toàn bộ flow BluFi provisioning
   */
  const connectAndProvision = useCallback(
    async (device: BluFiDevice, credentials: BluFiWifiCredentials) => {
      stopScanRef.current?.();
      stopScan().catch(() => {});

      setConnectedDevice(device);
      setErrorMessage(null);
      setWifiConnected(false);
      setConnectedBssid(undefined);

      const session = new BluFiSession(device.id);
      sessionRef.current = session;

      session.onWifiStatusChange((state, bssid) => {
        if (state === BluFiWifiState.CONNECTED) {
          setWifiConnected(true);
          setConnectedBssid(bssid);
          setStep('done');
        } else if (state === BluFiWifiState.FAILED || state === BluFiWifiState.DISCONNECTED) {
          setErrorMessage('Thiết bị không thể kết nối WiFi. Kiểm tra SSID và mật khẩu.');
          setStep('error');
        }
      });

      session.onErrorEvent((msg) => {
        setErrorMessage(msg);
        setStep('error');
      });

      try {
        setStep('connecting');
        await session.connect();

        setStep('negotiating');
        await session.negotiate();
        await session.setSecurityMode();

        setStep('provisioning');
        await session.sendWifiCredentials(credentials);

        setStep('waiting_wifi');
        // Timeout 30 giây chờ thiết bị kết nối WiFi
        setTimeout(() => {
          setStep((prev) => {
            if (prev === 'waiting_wifi') {
              setErrorMessage('Thiết bị không phản hồi. Kiểm tra lại WiFi.');
              return 'error';
            }
            return prev;
          });
        }, 30_000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
        setErrorMessage(msg);
        setStep('error');
      }
    },
    []
  );

  /**
   * Ngắt kết nối
   */
  const disconnect = useCallback(async () => {
    await sessionRef.current?.disconnect();
    sessionRef.current = null;
    setConnectedDevice(null);
  }, []);

  /**
   * Reset về trạng thái ban đầu
   */
  const reset = useCallback(() => {
    stopScanRef.current?.();
    sessionRef.current?.disconnect().catch(() => {});
    sessionRef.current = null;
    setStep('idle');
    setDevices([]);
    setConnectedDevice(null);
    setErrorMessage(null);
    setWifiConnected(false);
    setConnectedBssid(undefined);
  }, []);

  return {
    step,
    devices,
    connectedDevice,
    errorMessage,
    wifiConnected,
    connectedBssid,
    bleUnavailable,
    requestPermissions,
    startScan,
    stopScanning,
    connectAndProvision,
    disconnect,
    reset,
  };
}
