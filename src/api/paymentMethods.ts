import { apiRequest } from './client';

export interface PaymentMethod {
  id: string;
  paymentType: string;
  accountNumber: string; // masked (****5678)
  bankName: string;
  bankCode?: string;
  accountHolderName?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface PaymentMethodsResponse {
  data: PaymentMethod[];
}

/** Gửi OTP — chỉ dùng khi bật lại tính năng OTP */
export function requestOtp(): Promise<{ message: string; expiresIn: number }> {
  return apiRequest('/api/v1/payment-methods/request-otp', {
    method: 'POST',
    body: {},
  });
}

export function getPaymentMethods(): Promise<PaymentMethodsResponse> {
  return apiRequest<PaymentMethodsResponse>('/api/v1/payment-methods');
}

export interface CreatePaymentMethodBody {
  paymentType: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string;
  accountHolderName?: string;
  isPrimary?: boolean;
  /** OTP tạm thời không bắt buộc */
  otpCode?: string;
}

export function createPaymentMethod(
  body: CreatePaymentMethodBody
): Promise<PaymentMethod> {
  return apiRequest<PaymentMethod>('/api/v1/payment-methods', {
    method: 'POST',
    body,
  });
}

export interface UpdatePaymentMethodBody {
  paymentType?: string;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  accountHolderName?: string;
  isPrimary?: boolean;
  /** OTP tạm thời không bắt buộc */
  otpCode?: string;
}

export function updatePaymentMethod(
  id: string,
  body: UpdatePaymentMethodBody
): Promise<PaymentMethod> {
  return apiRequest<PaymentMethod>(`/api/v1/payment-methods/${id}`, {
    method: 'PATCH',
    body,
  });
}

export function deletePaymentMethod(
  id: string,
  otpCode?: string
): Promise<{ message: string }> {
  return apiRequest(`/api/v1/payment-methods/${id}`, {
    method: 'DELETE',
    body: otpCode ? { otpCode } : {},
  });
}
