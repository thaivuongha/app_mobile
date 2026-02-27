/**
 * EMBOX Brand Colors — Mobile App
 *
 * Đồng bộ với Web (web/app/globals.css + Tailwind):
 *   Primary  : purple-600  (#9333EA)
 *   Accent   : red-500     (#EF4444)
 *   Gradient : from-purple-600 to-red-500
 *
 * Logo EMBOX: gradient bg from #9333EA → #EF4444, chữ "E" trắng.
 */

// ─── Brand palette ────────────────────────────────────────────────────────────

/** purple-600 — màu chủ đạo */
export const BRAND_PRIMARY = '#9333EA';

/** purple-700 — hover / pressed state */
export const BRAND_PRIMARY_DARK = '#7E22CE';

/** purple-50 — nền sáng, badge nhẹ */
export const BRAND_PRIMARY_LIGHT = '#FAF5FF';

/** red-500 — accent, gradient end, nguy hiểm / nổi bật */
export const BRAND_ACCENT = '#EF4444';

/** red-50 — nền accent nhẹ */
export const BRAND_ACCENT_LIGHT = '#FEF2F2';

// ─── Semantic colors ──────────────────────────────────────────────────────────
export const Colors = {
  // Brand
  primary: BRAND_PRIMARY,
  primaryDark: BRAND_PRIMARY_DARK,
  primaryLight: BRAND_PRIMARY_LIGHT,
  accent: BRAND_ACCENT,
  accentLight: BRAND_ACCENT_LIGHT,

  // Gradient (dùng cho LinearGradient nếu cần)
  gradientStart: BRAND_PRIMARY,   // #9333EA
  gradientEnd: BRAND_ACCENT,      // #EF4444

  // Backgrounds
  background: '#F9FAFB',   // gray-50
  card: '#FFFFFF',

  // Text
  textPrimary: '#111827',    // gray-900
  textSecondary: '#4B5563',  // gray-600
  textMuted: '#9CA3AF',      // gray-400

  // Utility
  success: '#10B981',        // emerald-500
  successLight: '#D1FAE5',
  warning: '#F59E0B',        // amber-500
  warningLight: '#FEF3C7',
  danger: BRAND_ACCENT,      // red-500 — dùng brand accent cho danger
  dangerLight: BRAND_ACCENT_LIGHT,

  // Border & shadow
  border: '#E5E7EB',         // gray-200
  shadow: 'rgba(0, 0, 0, 0.07)',
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
    text: '#F9FAFB',
    background: '#111827',
    tint: Colors.primary,
    tabIconDefault: '#6B7280',
    tabIconSelected: Colors.primary,
  },
};
