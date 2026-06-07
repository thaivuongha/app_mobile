/**
 * Tiện ích hiển thị "hoạt động lần cuối" của thiết bị.
 *
 * Nguồn dữ liệu là `lastSeenAt` — thời điểm thiết bị gọi heartbeat/status gần nhất.
 * Thiết bị ngủ giữa các phiên nên đây là tín hiệu sống có ý nghĩa nhất với chủ máy.
 */

/** Ngưỡng coi thiết bị còn "online" (phút) — đồng bộ với backend DEVICE_ONLINE_THRESHOLD_MINUTES. */
export const ONLINE_THRESHOLD_MINUTES = 10;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Định dạng khoảng thời gian từ `lastSeenAt` đến hiện tại thành chuỗi rút gọn.
 * Ví dụ: "3m" (phút), "3h" (giờ), "3d" (ngày), "3w" (tuần), "3mo" (tháng), "3y" (năm).
 * Trả về "—" nếu chưa từng có heartbeat.
 */
export function formatLastSeen(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return '—';

  const ts = new Date(lastSeenAt).getTime();
  if (Number.isNaN(ts)) return '—';

  const diff = Date.now() - ts;
  if (diff < MINUTE) return 'vừa xong';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;
  if (diff < MONTH) return `${Math.floor(diff / WEEK)}w`;
  if (diff < YEAR) return `${Math.floor(diff / MONTH)}mo`;
  return `${Math.floor(diff / YEAR)}y`;
}

/** Suy ra trạng thái online từ lastSeenAt theo ngưỡng (đồng bộ logic backend). */
export function isRecentlyOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const ts = new Date(lastSeenAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < ONLINE_THRESHOLD_MINUTES * MINUTE;
}
