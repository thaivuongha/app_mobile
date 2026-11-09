import { apiRequest } from './client';

export interface DeviceSlot {
  slotNumber: number;
  productInstanceId: string | null;
  productName: string | null;
  /** Giá vốn (products.price) — chỉ dùng nội bộ, không hiển thị cho user */
  price?: string;
  /** Giá bán cuối cùng cho khách = ceil(price + commissionValue × K × 1.05, 1000) */
  sellingPrice?: number | null;
  isEmpty: boolean;
  brandName?: string;
  imageUrl?: string | null;
  serialNumber?: string | null;
}

/** Trạng thái realtime rút gọn, gộp sẵn trong danh sách my-devices. */
export interface DeviceLiveStatus {
  isOnline: boolean;
  lastSeenAt: string | null;
  batteryLevel: number | null;
}

export interface Device {
  id: string;
  serialNumber: string;
  deviceName: string | null;
  floor: number | null;
  /** Trạng thái cấu hình: ACTIVE / INACTIVE / MAINTENANCE / MANUFACTURED */
  status: string;
  /** Trạng thái realtime suy ra từ heartbeat gần nhất */
  liveStatus?: DeviceLiveStatus;
  slots?: DeviceSlot[];
}

export interface MyDevicesResponse {
  data: Device[];
  meta?: { total: number; limit: number; offset: number };
}

export interface DeviceStatus {
  deviceId: string;
  batteryLevel: number | null;
  firmwareVersion: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  wifiSignalStrength: number | null;
  temperature: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  updatedAt: string;
}

export interface SlotsResponse {
  data: DeviceSlot[];
}

export interface ClaimDeviceOptions {
  /** Tên thiết bị (ví dụ: "Phòng 101") */
  deviceName?: string;
  /** Số lầu để sắp xếp thiết bị */
  floor?: number;
}

export function claimDevice(
  serialNumber: string,
  ownerKey: string,
  options?: ClaimDeviceOptions
): Promise<Device> {
  return apiRequest<Device>('/api/v1/devices/claim', {
    method: 'POST',
    body: {
      serialNumber,
      ownerKey,
      ...(options?.deviceName ? { deviceName: options.deviceName } : {}),
      ...(options?.floor != null ? { floor: options.floor } : {}),
    },
  });
}

export function getMyDevices(params?: { limit?: number; offset?: number }): Promise<MyDevicesResponse> {
  return apiRequest<MyDevicesResponse>('/api/v1/devices/my-devices', {
    query: params,
  });
}

export function getDevice(id: string): Promise<Device> {
  return apiRequest<Device>(`/api/v1/devices/${id}`);
}

export function updateDevice(
  id: string,
  body: { deviceName?: string; floor?: number; status?: string }
): Promise<Device> {
  return apiRequest<Device>(`/api/v1/devices/${id}`, {
    method: 'PATCH',
    body,
  });
}

export function getDeviceStatus(id: string): Promise<DeviceStatus> {
  return apiRequest<DeviceStatus>(`/api/v1/devices/${id}/status`);
}

export function getDeviceSlots(deviceId: string): Promise<SlotsResponse> {
  return apiRequest<SlotsResponse>(`/api/v1/devices/${deviceId}/slots`);
}

/** Xóa (unclaim) thiết bị khỏi tài khoản */
export function removeDevice(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/v1/devices/${id}`, {
    method: 'DELETE',
  });
}

// ─── Mã chia sẻ cho nhân viên (xem thiết bị, không cần tài khoản) ──────────────

export interface ShareCodeItem {
  id: string;
  label: string;
  createdAt: string;
}

export interface ShareCodeList {
  data: ShareCodeItem[];
  /** App cũ: còn mã hay không. App mới đọc `data`. */
  exists: boolean;
  createdAt: string | null;
}

export interface ShareCodeCreated {
  id: string;
  label: string;
  /** Mã thô dạng AAAA-BBBB-CCCC — CHỈ trả về đúng lần này, không thể xem lại. */
  code: string;
  createdAt: string;
}

export function getShareCodes(): Promise<ShareCodeList> {
  return apiRequest<ShareCodeList>('/api/v1/devices/share-code');
}

/** Thêm một mã cho một người. Không xóa các mã khác. */
export function createShareCode(label: string): Promise<ShareCodeCreated> {
  return apiRequest<ShareCodeCreated>('/api/v1/devices/share-code', {
    method: 'POST',
    body: { label },
  });
}

/** Xóa đúng một mã. Chỉ thiết bị đã nhập mã đó bị đăng xuất. */
export function revokeShareCode(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/v1/devices/share-code/${id}`, {
    method: 'DELETE',
  });
}
