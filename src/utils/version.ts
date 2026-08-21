/**
 * So sánh 2 chuỗi version dạng "x.y.z" (semver rút gọn — không hỗ trợ pre-release/build tag).
 * Trả về số âm nếu a < b, số dương nếu a > b, 0 nếu bằng nhau.
 * Thiếu phần nào coi như 0 (vd "1.2" so với "1.2.0" là bằng nhau).
 */
export function compareVersions(a: string, b: string): number {
  const pa = String(a).split('.').map((n) => Number(n) || 0);
  const pb = String(b).split('.').map((n) => Number(n) || 0);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

/** true nếu `current` nhỏ hơn `target`. */
export function isVersionLower(current: string, target: string): boolean {
  return compareVersions(current, target) < 0;
}
