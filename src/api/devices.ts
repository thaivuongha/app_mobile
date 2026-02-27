import { apiRequest } from './client';

export interface DeviceSlot {
  slotNumber: number;
  productInstanceId: string | null;
  productName: string | null;
  price?: string;
  isEmpty: boolean;
  brandName?: string;
  serialNumber?: string | null;
}

export interface Device {
  id: string;
  serialNumber: string;
  deviceName: string | null;
  floor: number | null;
  status: string;
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
