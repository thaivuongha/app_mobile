import { apiRequest } from './client';

export interface StaffSlot {
  slotNumber: number;
  isEmpty: boolean;
  productName: string | null;
  brandName: string | null;
  imageUrl: string | null;
}

export interface StaffDevice {
  id: string;
  deviceName: string | null;
  floor: number | null;
  // Chỉ có mức pin — KHÔNG có isOnline/lastSeenAt (xem docs/MOBILE.md, mục nhân viên).
  liveStatus: { batteryLevel: number | null };
  slots: StaffSlot[];
}

export interface StaffDevicesResponse {
  data: StaffDevice[];
}

/** Danh sách thiết bị rút gọn cho nhân viên dọn dẹp (phiên xem-thôi, mã chia sẻ). */
export function getStaffDevices(): Promise<StaffDevicesResponse> {
  return apiRequest<StaffDevicesResponse>('/api/v1/staff/devices');
}
