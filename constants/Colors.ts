/**
 * Brand Colors — Mobile App
 *
 * Primary  : #FF815C (cam)
 * Background: #FFFFFF (trắng) — light-first
 * Text     : #0a0a0a (đen)
 */

// ─── Brand palette ────────────────────────────────────────────────────────────

/** Cam — màu chủ đạo */
export const BRAND_PRIMARY = '#FF815C';

/** Cam đậm hơn — pressed / hover state */
export const BRAND_PRIMARY_DARK = '#E06540';

/** Cam mờ — badge nền, tint nhẹ trên nền sáng */
export const BRAND_PRIMARY_LIGHT = 'rgba(255,129,92,0.12)';

// ─── Semantic colors ──────────────────────────────────────────────────────────
export const Colors = {
  // Brand
  primary: BRAND_PRIMARY,
  primaryDark: BRAND_PRIMARY_DARK,
  primaryLight: BRAND_PRIMARY_LIGHT,

  // Backgrounds (light-first)
  background: '#FFFFFF',
  surface: '#F9FAFB',      // gray-50 — nền section / tab bar
  card: '#FFFFFF',
  surfaceElevated: '#F3F4F6', // gray-100 — modal, input nổi

  // Border & shadow
  border: '#E5E7EB',       // gray-200
  shadow: 'rgba(0,0,0,0.08)',

  // Text
  textPrimary: '#0a0a0a',    // gần đen — mạnh mẽ
  textSecondary: '#4B5563',  // gray-600
  textMuted: '#9CA3AF',      // gray-400

  // Semantic utility (không đổi — dùng cho trạng thái UI)
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
};

// ─── Legacy compat (useColorScheme hook) ─────────────────────────────────────
export default {
  light: {
    text: Colors.textPrimary,
    background: Colors.background,
    tint: Colors.primary,
    tabIconDefault: Colors.textMuted,
    tabIconSelected: Colors.primary,
  },
  dark: {
    text: Colors.textPrimary,
    background: Colors.background,
    tint: Colors.primary,
    tabIconDefault: Colors.textMuted,
    tabIconSelected: Colors.primary,
  },
};
