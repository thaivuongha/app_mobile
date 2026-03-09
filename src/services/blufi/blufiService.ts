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

  // primaryScan = true khi dùng filter UUID; false khi dùng fallback scan-all
  let primaryScan = true;

  const sub = ble.onDiscoverPeripheral((peripheral) => {
    const name = peripheral.name ?? peripheral.advertising?.localName ?? '';

    // Trong fallback scan-all: chỉ giữ thiết bị có service UUID khớp trong
    // advertising data, hoặc tên chứa 'BLUFI' (case-insensitive)
    if (!primaryScan) {
      const advServices: string[] = peripheral.advertising?.serviceUUIDs ?? [];
      const hasServiceUUID = advServices.some(
        (uuid) => uuid.toUpperCase() === BLUFI_SERVICE_UUID.toUpperCase()
      );
      const hasBlufiName = name.toUpperCase().includes('BLUFI');
      if (!hasServiceUUID && !hasBlufiName) return;
    }

    const device: BluFiDevice = {
      id: peripheral.id,
      name: name || 'BLUFI_DEVICE',
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
    // Fallback: scan all nếu filter UUID không được hỗ trợ
    primaryScan = false;
    ble.scan({ seconds: timeoutSecs, allowDuplicates: false }).catch(() => {});
  });

  return () => {
    sub.remove();
    ble.stopScan().catch(() => {});
  };
}

export async function stopScan(): Promise<void> {
  try {
    await getBleManager().stopScan();
  } catch {
    // ignore
  }
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
  /** MTU đã negotiate (bytes). Dùng làm maxByteSize cho writeWithoutResponse. */
  private mtu = 20;

  // Fragment reassembly — ESP32 gửi WiFi list có thể bị fragment
  private fragBuffer: Uint8Array | null = null;
  private fragOffset = 0;
  private fragSubtype = 0;
  private fragClass: BluFiFrameClass = BluFiFrameClass.DATA;

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
   * Ghi dữ liệu lên WRITE characteristic.
   * maxByteSize = this.mtu để toàn bộ frame được gửi trong 1 BLE write duy nhất.
   */
  private async write(data: Uint8Array): Promise<void> {
    const ble = getBleManager();
    await ble.writeWithoutResponse(
      this.peripheralId,
      BLUFI_SERVICE_UUID,
      BLUFI_WRITE_UUID,
      Array.from(data),
      this.mtu
    );
  }

  /**
   * Kết nối BLE + lấy services + bật notifications
   * Mỗi bước đều có timeout riêng để tránh treo vô thời hạn.
   */
  async connect(): Promise<void> {
    const ble = getBleManager();

    const withTimeout = <T>(promise: Promise<T>, ms: number, msg: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
      ]);

    // Disconnect trước để xóa GATT state cũ (ignore lỗi nếu chưa kết nối)
    try {
      await ble.disconnect(this.peripheralId);
    } catch {
      // bình thường nếu thiết bị chưa bao giờ kết nối
    }

    // Kết nối BLE
    await withTimeout(
      ble.connect(this.peripheralId),
      10_000,
      'Kết nối Bluetooth timeout. Đảm bảo thiết bị đang ở chế độ cấu hình WiFi và trong phạm vi ~5m.'
    );

    // Android cần delay nhỏ sau khi connect để GATT stack ổn định
    await new Promise<void>((r) => setTimeout(r, 600));

    // Discover services
    await withTimeout(
      ble.retrieveServices(this.peripheralId),
      10_000,
      'Không thể đọc GATT services. Thử lại hoặc khởi động lại thiết bị.'
    );

    // Negotiate MTU lớn hơn để tránh bị cắt frame thành nhiều BLE packet
    // ESP32 BluFi frame negotiate có thể lên đến ~135 bytes, cần MTU >= 138
    try {
      const negotiatedMtu = await withTimeout(
        ble.requestMTU(this.peripheralId, 512),
        5_000,
        'MTU negotiation timeout'
      );
      // ATT Write Without Response overhead: 1 byte opcode + 2 bytes handle = 3 bytes
      this.mtu = Math.max(20, negotiatedMtu - 3);
    } catch {
      // Fallback: dùng 20 bytes — sẽ cần BluFi fragmentation cho frame lớn
      this.mtu = 20;
    }

    // Bật notification
    await withTimeout(
      ble.startNotification(this.peripheralId, BLUFI_SERVICE_UUID, BLUFI_NOTIFY_UUID),
      8_000,
      'Không thể bật notification. UUID không khớp hoặc thiết bị chưa sẵn sàng.'
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
   * Đặt security mode: checksum only, không encrypt.
   * Delay 300ms sau write để GATT stack ESP32 xử lý xong
   * trước khi credential frames đến.
   */
  async setSecurityMode(): Promise<void> {
    const frame = await buildSecModeFrame(
      this.nextSeq(),
      BluFiSecurityMode.CHECKSUM_NO_ENCRYPT
    );
    await this.write(frame);
    await delay(300);
  }

  /**
   * Gửi thông tin WiFi và lệnh kết nối.
   * Delay 200ms giữa mỗi frame để ESP32 GATT stack có thời gian
   * gửi Write Response trước khi nhận frame tiếp theo.
   * (100ms quá nhanh → GATTS_SendRsp waiting for op_code = 00)
   */
  async sendWifiCredentials(creds: BluFiWifiCredentials): Promise<void> {
    const { ssid, password, opMode = BluFiWifiOpMode.STA } = creds;

    const modeFrame = await buildWifiOpModeFrame(this.nextSeq(), opMode);
    await this.write(modeFrame);
    await delay(200);

    const ssidFrame = await buildSsidFrame(this.nextSeq(), ssid, this.aesKey);
    await this.write(ssidFrame);
    await delay(200);

    const passFrame = await buildPasswordFrame(this.nextSeq(), password, this.aesKey);
    await this.write(passFrame);
    await delay(200);

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

      // Fragment reassembly — ESP32 có thể fragment frame lớn (ví dụ WiFi list nhiều AP)
      if (frame.isFragment || this.fragBuffer !== null) {
        if (this.fragBuffer === null) {
          // First fragment: 2 byte đầu = tổng độ dài payload
          const totalLen = (frame.data[0] << 8) | frame.data[1];
          this.fragBuffer = new Uint8Array(totalLen);
          this.fragOffset = 0;
          this.fragSubtype = frame.subtype;
          this.fragClass = frame.frameClass;
          const chunk = frame.data.slice(2);
          this.fragBuffer.set(chunk, 0);
          this.fragOffset = chunk.length;
        } else {
          // Subsequent fragment: append chunk
          const chunk = frame.data;
          const available = this.fragBuffer.length - this.fragOffset;
          this.fragBuffer.set(chunk.slice(0, available), this.fragOffset);
          this.fragOffset += Math.min(chunk.length, available);
        }

        if (!frame.isFragment) {
          // Last fragment — process complete reassembled payload
          const completeData = this.fragBuffer.slice(0, this.fragOffset);
          const subtype = this.fragSubtype;
          const frameClass = this.fragClass;
          this.fragBuffer = null;
          this.fragOffset = 0;
          await this.processFrame(frameClass, subtype, completeData);
        }
        return;
      }

      await this.processFrame(frame.frameClass, frame.subtype, frame.data);
    } catch {
      // ignore parse errors
    }
  }

  private async processFrame(
    frameClass: BluFiFrameClass,
    subtype: number,
    data: Uint8Array
  ): Promise<void> {
    if (frameClass === BluFiFrameClass.DATA && subtype === BluFiFrameType.DATA_NEGO) {
      await this.handleNegoData(data);
    } else if (frameClass === BluFiFrameClass.DATA && subtype === BluFiFrameType.DATA_WIFI_STATUS_REPORT) {
      this.handleWifiStatus(data);
    } else if (frameClass === BluFiFrameClass.DATA && subtype === BluFiFrameType.DATA_ERROR) {
      const errorCode = data[0];
      this.onError?.(`BluFi error: 0x${errorCode.toString(16)}`);
    }
  }

  private async handleNegoData(data: Uint8Array): Promise<void> {
    try {
      // data[0] = nego type (0x01 = DH response from ESP32)
      const negoType = data[0];
      if (negoType !== 0x01) return;

      const espPublicKey = data.slice(1);
      this.aesKey = this.dh.computeAesKey(espPublicKey);
      this._negoResolve?.();
    } catch (err) {
      this._negoReject?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private handleWifiStatus(data: Uint8Array): void {
    if (data.length < 2) return;
    // data[0] = opmode (1=STA), data[1] = sta conn state
    // ESP_BLUFI_STA_CONN_SUCCESS=0x00, ESP_BLUFI_STA_CONN_FAIL=0x01
    const staState: BluFiWifiState = data[1] as BluFiWifiState;

    let bssid: string | undefined;
    if (staState === BluFiWifiState.CONNECTED) {
      // Tìm BSSID trong extra_info (TLV format sau byte 2)
      // Type 0x03 = STA_BSSID (length=6, value=6 bytes MAC)
      let pos = 2;
      while (pos + 1 < data.length) {
        const tlvType = data[pos];
        const tlvLen = data[pos + 1];
        if (pos + 2 + tlvLen > data.length) break;
        if (tlvType === 0x03 && tlvLen === 6) {
          bssid = Array.from(data.slice(pos + 2, pos + 2 + 6))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(':');
          break;
        }
        pos += 2 + tlvLen;
      }
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
