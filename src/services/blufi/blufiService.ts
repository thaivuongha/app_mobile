/**
 * BluFi Service — BLE GATT client + BluFi protocol orchestration
 *
 * Luồng:
 *   1. startScan() → tìm thiết bị ESP32 quảng bá BluFi service UUID
 *   2. connect(peripheralId) → kết nối BLE GATT + subscribe notify char
 *   3. negotiate() → DH key exchange: gửi publicKey, nhận ESP publicKey, tính AES key
 *   4. sendWifiCredentials(ssid, pass) → set STA mode, gửi SSID+password, lệnh connect
 *   5. Lắng nghe notify → WiFi status (connected / failed)
 *   6. disconnect() → đóng BLE
 *
 * Tham chiếu:
 *   Android: lib-blufi/BlufiClient.java
 *   iOS:     BlufiLibrary/BlufiLib.m
 */

import type BleManagerType from 'react-native-ble-manager';
import type { EventSubscription } from 'react-native';
import {
  BLUFI_SERVICE_UUID,
  BLUFI_WRITE_UUID,
  BLUFI_NOTIFY_UUID,
  BluFiFrameClass,
  BluFiFrameType,
  BluFiSecurityMode,
  BluFiWifiOpMode,
  BluFiWifiState,
  type BluFiDevice,
  type BluFiWifiCredentials,
} from './types';
import { BluFiDH } from './blufiCrypto';
import {
  buildNegoFrame,
  buildSecModeFrame,
  buildWifiOpModeFrame,
  buildSsidFrame,
  buildPasswordFrame,
  buildConnectWifiFrame,
  parseFrame,
} from './blufiFrame';

type WifiStatusCallback = (state: BluFiWifiState, bssid?: string) => void;
type ErrorCallback = (message: string) => void;

// Lazy import để tránh crash khi chạy trên Expo Go (native module chưa có)
let _bleManager: typeof BleManagerType | null = null;
let _initialized = false;

function getBleManager(): typeof BleManagerType {
  if (_bleManager) return _bleManager;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _bleManager = require('react-native-ble-manager').default;
    return _bleManager!;
  } catch {
    throw new Error(
      'BLE không khả dụng. Tính năng này yêu cầu Development Build — không hỗ trợ Expo Go.'
    );
  }
}

export function isBleAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-ble-manager');
    return !!(mod?.default);
  } catch {
    return false;
  }
}

export async function initBleManager(): Promise<void> {
  if (_initialized) return;
  const ble = getBleManager();
  await ble.start({ showAlert: false });
  _initialized = true;
}

/**
 * Scan BLE devices quảng bá BluFi service UUID
 * Trả về hàm dừng scan
 */
export function scanBluFiDevices(
  timeoutSecs: number,
  onFound: (devices: BluFiDevice[]) => void
): () => void {
  const found = new Map<string, BluFiDevice>();

  const ble = getBleManager();

  const sub = ble.onDiscoverPeripheral((peripheral) => {
    const name =
      peripheral.name ??
      peripheral.advertising?.localName ??
      'BLUFI_DEVICE';
    const device: BluFiDevice = {
      id: peripheral.id,
      name,
      rssi: peripheral.rssi ?? -99,
    };
    found.set(peripheral.id, device);
    onFound(Array.from(found.values()));
  });

  ble.scan({
    serviceUUIDs: [BLUFI_SERVICE_UUID],
    seconds: timeoutSecs,
    allowDuplicates: false,
  }).catch(() => {
    // Fallback: scan all nếu filter UUID không hỗ trợ
    ble.scan({ seconds: timeoutSecs, allowDuplicates: false }).catch(() => {});
  });

  return () => {
    sub.remove();
    ble.stopScan().catch(() => {});
  };
}

export async function stopScan(): Promise<void> {
  getBleManager().stopScan().catch(() => {});
}

/**
 * State của một BluFi session
 */
export class BluFiSession {
  private peripheralId: string;
  private seq = 0;
  private dh: BluFiDH;
  private aesKey?: Uint8Array;
  private notifySub?: EventSubscription;
  private onWifiStatus?: WifiStatusCallback;
  private onError?: ErrorCallback;
  private _negoResolve?: () => void;
  private _negoReject?: (err: Error) => void;

  constructor(peripheralId: string) {
    this.peripheralId = peripheralId;
    this.dh = new BluFiDH();
  }

  private nextSeq(): number {
    const s = this.seq;
    this.seq = (this.seq + 1) & 0xff;
    return s;
  }

  /**
   * Ghi dữ liệu lên WRITE characteristic
   */
  private async write(data: Uint8Array): Promise<void> {
    const ble = getBleManager();
    await ble.writeWithoutResponse(
      this.peripheralId,
      BLUFI_SERVICE_UUID,
      BLUFI_WRITE_UUID,
      Array.from(data)
    );
  }

  /**
   * Kết nối BLE + lấy services + bật notifications
   */
  async connect(): Promise<void> {
    const ble = getBleManager();
    await ble.connect(this.peripheralId);
    await ble.retrieveServices(this.peripheralId);
    await ble.startNotification(
      this.peripheralId,
      BLUFI_SERVICE_UUID,
      BLUFI_NOTIFY_UUID
    );

    this.notifySub = ble.onDidUpdateValueForCharacteristic(
      ({ peripheral, characteristic, value }) => {
        if (
          peripheral === this.peripheralId &&
          characteristic.toLowerCase() === BLUFI_NOTIFY_UUID.toLowerCase()
        ) {
          const raw = new Uint8Array(value);
          this.handleNotification(raw);
        }
      }
    );
  }

  /**
   * DH negotiation: gửi public key → nhận ESP public key → tính AES key
   */
  negotiate(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Negotiation timeout')), 10_000);

      this._negoResolve = () => {
        clearTimeout(timeout);
        this._negoResolve = undefined;
        resolve();
      };
      this._negoReject = (err: Error) => {
        clearTimeout(timeout);
        this._negoReject = undefined;
        reject(err);
      };

      const pubKey = this.dh.getPublicKey();
      const seq = this.nextSeq();
      buildNegoFrame(seq, pubKey)
        .then((frame) => this.write(frame))
        .catch(reject);
    });
  }

  /**
   * Đặt security mode: checksum + encrypt
   */
  async setSecurityMode(): Promise<void> {
    const frame = await buildSecModeFrame(
      this.nextSeq(),
      BluFiSecurityMode.CHECKSUM_ENCRYPT
    );
    await this.write(frame);
  }

  /**
   * Gửi thông tin WiFi và lệnh kết nối
   */
  async sendWifiCredentials(creds: BluFiWifiCredentials): Promise<void> {
    const { ssid, password, opMode = BluFiWifiOpMode.STA } = creds;

    const modeFrame = await buildWifiOpModeFrame(this.nextSeq(), opMode);
    await this.write(modeFrame);
    await delay(100);

    const ssidFrame = await buildSsidFrame(this.nextSeq(), ssid, this.aesKey);
    await this.write(ssidFrame);
    await delay(100);

    const passFrame = await buildPasswordFrame(this.nextSeq(), password, this.aesKey);
    await this.write(passFrame);
    await delay(100);

    const connectFrame = await buildConnectWifiFrame(this.nextSeq());
    await this.write(connectFrame);
  }

  onWifiStatusChange(cb: WifiStatusCallback): void {
    this.onWifiStatus = cb;
  }

  onErrorEvent(cb: ErrorCallback): void {
    this.onError = cb;
  }

  private async handleNotification(raw: Uint8Array): Promise<void> {
    try {
      const frame = await parseFrame(raw, this.aesKey, this.seq);
      if (!frame) return;

      if (
        frame.frameClass === BluFiFrameClass.DATA &&
        frame.subtype === BluFiFrameType.DATA_NEGO
      ) {
        await this.handleNegoData(frame.data);
      } else if (
        frame.frameClass === BluFiFrameClass.DATA &&
        frame.subtype === BluFiFrameType.DATA_WIFI_STATUS_REPORT
      ) {
        this.handleWifiStatus(frame.data);
      } else if (
        frame.frameClass === BluFiFrameClass.DATA &&
        frame.subtype === BluFiFrameType.DATA_ERROR
      ) {
        const errorCode = frame.data[0];
        this.onError?.(`BluFi error: 0x${errorCode.toString(16)}`);
      }
    } catch {
      // ignore parse errors
    }
  }

  private async handleNegoData(data: Uint8Array): Promise<void> {
    try {
      // data[0] = nego type (0x01 = DH response from ESP32)
      const negoType = data[0];
      if (negoType !== 0x01) return;

      const espPublicKey = data.slice(1);
      this.aesKey = await this.dh.computeAesKey(espPublicKey);
      this._negoResolve?.();
    } catch (err) {
      this._negoReject?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private handleWifiStatus(data: Uint8Array): void {
    if (data.length < 2) return;
    const staState: BluFiWifiState = data[1];

    let bssid: string | undefined;
    if (staState === BluFiWifiState.CONNECTED && data.length >= 8) {
      bssid = Array.from(data.slice(2, 8))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(':');
    }

    this.onWifiStatus?.(staState, bssid);
  }

  async disconnect(): Promise<void> {
    this.notifySub?.remove();
    try {
      const ble = getBleManager();
      await ble.stopNotification(
        this.peripheralId,
        BLUFI_SERVICE_UUID,
        BLUFI_NOTIFY_UUID
      );
      await ble.disconnect(this.peripheralId);
    } catch {
      // bỏ qua lỗi khi disconnect
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
