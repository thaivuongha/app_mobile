/**
 * BluFi Protocol Types
 * Tham chiếu: https://github.com/EspressifApp/EspBlufiForAndroid (lib-blufi/src/main/java/blufi/espressif/params)
 *             https://github.com/EspressifApp/EspBlufiForiOS (BlufiLibrary)
 *
 * BluFi GATT UUIDs cố định theo spec Espressif:
 *   Service:          0000FFFF-0000-1000-8000-00805F9B34FB
 *   Write char:       0000FF01-0000-1000-8000-00805F9B34FB
 *   Notification char:0000FF02-0000-1000-8000-00805F9B34FB
 */

// BluFi GATT UUIDs
export const BLUFI_SERVICE_UUID = '0000FFFF-0000-1000-8000-00805F9B34FB';
export const BLUFI_WRITE_UUID = '0000FF01-0000-1000-8000-00805F9B34FB';
export const BLUFI_NOTIFY_UUID = '0000FF02-0000-1000-8000-00805F9B34FB';

// Frame type (Ctrl vs Data), theo BluFi spec
export enum BluFiFrameType {
  // Control frames (type = 0x00)
  CTRL_ACK = 0x00,
  CTRL_SET_SEC_MODE = 0x01,
  CTRL_SET_WIFI_OP_MODE = 0x02,
  CTRL_CONNECT_WIFI = 0x03,
  CTRL_DISCONNECT_WIFI = 0x04,
  CTRL_GET_WIFI_STATUS = 0x05,
  CTRL_DEAUTHENTICATE = 0x06,
  CTRL_GET_VERSION = 0x07,
  CTRL_CLOSE_CONNECTION = 0x08,
  CTRL_SET_MAX_DATA_LEN = 0x09,
  CTRL_GET_WIFI_LIST = 0x0a,
  CTRL_DISCONNECT = 0x0b,
  CTRL_GET_CUSTOM_INFO = 0x0c,

  // Data frames (type = 0x01)
  DATA_NEGO = 0x00,
  DATA_STA_BSSID = 0x01,
  DATA_STA_SSID = 0x02,
  DATA_STA_PASSWD = 0x03,
  DATA_SOFTAP_SSID = 0x04,
  DATA_SOFTAP_PASSWD = 0x05,
  DATA_SOFTAP_MAX_CONN = 0x06,
  DATA_SOFTAP_AUTH_MODE = 0x07,
  DATA_SOFTAP_CHANNEL = 0x08,
  DATA_USERNAME = 0x09,
  DATA_CA_CERT = 0x0a,
  DATA_CLIENT_CERT = 0x0b,
  DATA_SERVER_CERT = 0x0c,
  DATA_CLIENT_PRIV_KEY = 0x0d,
  DATA_SERVER_PRIV_KEY = 0x0e,
  DATA_WIFI_STATUS_REPORT = 0x0f,
  DATA_VERSION = 0x10,
  DATA_WIFI_LIST = 0x11,
  DATA_ERROR = 0x12,
  DATA_CUSTOM_DATA = 0x13,
  DATA_MAX_FRAME_SIZE = 0x14,
}

// Frame type class: Ctrl (0) hay Data (1)
export enum BluFiFrameClass {
  CTRL = 0,
  DATA = 1,
}

// Security mode để negotiate
export enum BluFiSecurityMode {
  // checksum = bit 0, encrypt = bit 1
  NO_CHECKSUM_NO_ENCRYPT = 0x00,
  CHECKSUM_NO_ENCRYPT = 0x01,
  NO_CHECKSUM_ENCRYPT = 0x02,
  CHECKSUM_ENCRYPT = 0x03,
}

// WiFi operation mode
export enum BluFiWifiOpMode {
  NULL = 0x00,
  STA = 0x01,
  SOFTAP = 0x02,
  SOFTAP_STA = 0x03,
}

// WiFi connect status từ thiết bị
// Khớp với esp_blufi_sta_conn_state_t trong ESP-IDF:
//   ESP_BLUFI_STA_CONN_SUCCESS = 0x00
//   ESP_BLUFI_STA_CONN_FAIL   = 0x01
export enum BluFiWifiState {
  CONNECTED = 0x00,
  FAILED = 0x01,
  DISCONNECTED = 0x02,
}

// Error codes từ thiết bị
export enum BluFiErrorCode {
  SEQUENCE_ERROR = 0x01,
  CHECKSUM_ERROR = 0x02,
  DECRYPT_ERROR = 0x03,
  ENCRYPT_ERROR = 0x04,
  INIT_SECURITY_ERROR = 0x05,
  DH_MALLOC_ERROR = 0x06,
  DH_PARAM_ERROR = 0x07,
  READ_PARAM_ERROR = 0x08,
  MAKE_PUBLIC_ERROR = 0x09,
  DATA_FORMAT_ERROR = 0x0a,
  CALCULATE_MD5_ERROR = 0x0b,
  WIFI_SCAN_FAIL = 0x0c,
}

// Trạng thái của BluFi session (dùng trong hook)
export type BluFiStep =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'negotiating'
  | 'ready'         // connected + negotiated, chờ nhập WiFi credentials
  | 'provisioning'
  | 'waiting_wifi'
  | 'done'
  | 'error';

// Thiết bị BLE tìm được khi scan
export interface BluFiDevice {
  id: string;         // peripheral id (địa chỉ BLE)
  name: string;       // tên thiết bị
  rssi: number;       // tín hiệu (dBm)
}

// Kết quả trạng thái WiFi từ thiết bị
export interface BluFiWifiStatus {
  opMode: BluFiWifiOpMode;
  staConnected: boolean;
  softApConnected: boolean;
  staBssid?: string;
  staSsid?: string;
  softApSsid?: string;
  softApChannel?: number;
  softApMaxConn?: number;
  softApAuthMode?: number;
}

// Payload gửi đến negotiate
export interface BluFiNegoPayload {
  type: number;       // 0x00 = DH share key
  data: Uint8Array;
}

// Tham số cần thiết để gửi WiFi
export interface BluFiWifiCredentials {
  ssid: string;
  password: string;
  opMode?: BluFiWifiOpMode; // mặc định STA
}

// AP tìm được khi scan WiFi (từ DATA_WIFI_LIST notification)
export interface BluFiWifiAP {
  ssid: string;
  rssi: number; // dBm (âm, ví dụ -65)
}
