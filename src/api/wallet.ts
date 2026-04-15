import { apiRequest } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WalletBalance {
  depositBalance: number;
  reservedBalance: number;
  commissionBalance: number;
}

export type LedgerEntryType =
  | 'TOP_UP'
  | 'ORDER_RESERVE'
  | 'ORDER_RECEIVE'
  | 'ORDER_CANCEL'
  | 'SALE_RESTORE'
  | 'COMMISSION_CREDIT'
  | 'PAYOUT_DEDUCT'
  | 'WALLET_TRANSFER_OUT'
  | 'WALLET_TRANSFER_IN'
  | 'ADJUSTMENT';

export interface LedgerEntry {
  id: string;
  walletType: 'DEPOSIT' | 'COMMISSION';
  entryType: LedgerEntryType;
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  refType: string;
  refId: string;
  note: string | null;
  createdAt: string;
}

export interface LedgerResponse {
  data: LedgerEntry[];
  meta: { total: number; limit: number; offset: number };
}

export type TopupStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED';

export interface TopupInitResponse {
  referenceCode: string;
  qrCode: string | null;
  qrLink: string | null;
  amount: number;
  expiredAt: string;
}

export interface TopupStatusResponse {
  referenceCode: string;
  status: TopupStatus;
  amount: number;
  completedAt?: string | null;
}

export interface TransferResponse {
  depositBalance: number;
  commissionBalance: number;
  transferred: number;
}

export interface PayoutAccount {
  id: string;
  userId: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface CommissionPayout {
  id: string;
  grossAmount: number;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
  status: 'PENDING' | 'PAID';
  note: string | null;
  processedAt: string | null;
  createdAt: string;
  payoutAccount?: { bankName: string; accountNumber: string } | null;
}

export interface PayoutsResponse {
  data: CommissionPayout[];
  meta: { total: number; limit: number; offset: number };
}

// ── API functions ─────────────────────────────────────────────────────────────

export function getWalletBalance(): Promise<WalletBalance> {
  return apiRequest<WalletBalance>('/api/v1/wallet/balance');
}

export function getWalletLedger(params?: {
  walletType?: 'DEPOSIT' | 'COMMISSION';
  limit?: number;
  offset?: number;
}): Promise<LedgerResponse> {
  return apiRequest<LedgerResponse>('/api/v1/wallet/ledger', { query: params });
}

export function initTopup(amount: number): Promise<TopupInitResponse> {
  return apiRequest<TopupInitResponse>('/api/v1/wallet/topup/init', {
    method: 'POST',
    body: { amount },
  });
}

export function getTopupStatus(referenceCode: string): Promise<TopupStatusResponse> {
  return apiRequest<TopupStatusResponse>(`/api/v1/wallet/topup/status/${referenceCode}`);
}

export function walletTransfer(amount: number): Promise<TransferResponse> {
  return apiRequest<TransferResponse>('/api/v1/wallet/transfer', {
    method: 'POST',
    body: { amount },
  });
}

// ── Payout Accounts ───────────────────────────────────────────────────────────

export function getPayoutAccounts(): Promise<PayoutAccount[]> {
  return apiRequest<PayoutAccount[]>('/api/v1/wallet/payout-accounts');
}

export function createPayoutAccount(body: {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}): Promise<PayoutAccount> {
  return apiRequest<PayoutAccount>('/api/v1/wallet/payout-accounts', {
    method: 'POST',
    body,
  });
}

export function updatePayoutAccount(
  id: string,
  body: { bankName?: string; accountNumber?: string; accountHolder?: string; isPrimary?: boolean }
): Promise<PayoutAccount> {
  return apiRequest<PayoutAccount>(`/api/v1/wallet/payout-accounts/${id}`, {
    method: 'PATCH',
    body,
  });
}

export function deletePayoutAccount(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/v1/wallet/payout-accounts/${id}`, {
    method: 'DELETE',
  });
}

// ── Commission Payouts ────────────────────────────────────────────────────────

export function getWalletPayouts(params?: {
  limit?: number;
  offset?: number;
}): Promise<PayoutsResponse> {
  return apiRequest<PayoutsResponse>('/api/v1/wallet/payouts', { query: params });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const LEDGER_LABELS: Record<LedgerEntryType, string> = {
  TOP_UP: 'Nạp ví',
  ORDER_RESERVE: 'Đặt hàng (giam vốn)',
  ORDER_RECEIVE: 'Nhận hàng',
  ORDER_CANCEL: 'Huỷ đơn (hoàn vốn)',
  SALE_RESTORE: 'Bán lẻ — hoàn vốn',
  COMMISSION_CREDIT: 'Ghi nhận hoa hồng',
  PAYOUT_DEDUCT: 'Chi hoa hồng',
  WALLET_TRANSFER_OUT: 'Chuyển sang ví HH',
  WALLET_TRANSFER_IN: 'Nhận từ ví vận hành',
  ADJUSTMENT: 'Điều chỉnh',
};
