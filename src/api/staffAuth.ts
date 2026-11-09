import { setStaffAccessToken, clearTokens } from './tokenStorage';
import { apiRequest } from './client';

export interface RedeemShareCodeResponse {
  accessToken: string;
  expiresIn: number;
}

/** Nhân viên nhập mã 12 ký tự (AAAA-BBBB-CCCC) do chủ chia sẻ để lấy phiên xem-thôi. */
export async function redeemShareCode(code: string): Promise<RedeemShareCodeResponse> {
  const data = await apiRequest<RedeemShareCodeResponse>('/api/v1/staff/auth/redeem', {
    method: 'POST',
    body: { code },
    auth: false,
  });
  await setStaffAccessToken(data.accessToken);
  return data;
}

/** Không có API logout cho phiên staff (JWT không trạng thái) — chỉ xóa token local. */
export async function staffLogout(): Promise<void> {
  await clearTokens();
}
