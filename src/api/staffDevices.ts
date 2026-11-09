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
  // isOnline chỉ để tô màu pin giống app chủ. Không có lastSeenAt.
  liveStatus: { batteryLevel: number | null; isOnline: boolean };
  slots: StaffSlot[];
}

export interface StaffDevicesResponse {
  data: StaffDevice[];
}

/** Danh sách thiết bị rút gọn cho nhân viên dọn dẹp (phiên xem-thôi, mã chia sẻ). */
export function getStaffDevices(): Promise<StaffDevicesResponse> {
  return apiRequest<StaffDevicesResponse>('/api/v1/staff/devices');
}
