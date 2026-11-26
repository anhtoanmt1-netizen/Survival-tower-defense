import { settings } from '../config/settings.js';
// Rung điện thoại. Nền tảng: plugin Haptics của Capacitor nếu có, nếu không dùng navigator.vibrate (APK cần quyền VIBRATE, đã vá ở tools/patch-manifest.mjs).
// Không hỗ trợ (iOS Safari, máy tính) => im lặng bỏ qua, không bao giờ ném lỗi. Tắt trong Cài đặt => dừng hoàn toàn (kể cả rung đang chạy).
const MIN_GAP = 220;                   // ms giữa hai lần rung: không rung dồn dập
let last = 0;
const cap = () => (typeof window !== 'undefined' ? window.Capacitor?.Plugins?.Haptics : null);
export const supported = () => !!cap() || (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function');
// Mẫu rung theo mức sát thương: nhẹ khi mất 1 máu, mạnh hơn khi mất nhiều hoặc hết máu.
export const PATTERNS = { hit: [35], heavy: [55, 35, 55], death: [90, 50, 150] };
export function patternFor(damage, dead) { return dead ? PATTERNS.death : damage >= 2 ? PATTERNS.heavy : PATTERNS.hit; }
export function vibrate(pattern, now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
  if (!settings.data.haptics.enabled) return false; if (now - last < MIN_GAP) return false;
  try {
    const h = cap(); if (h?.vibrate) { h.vibrate({ duration: pattern.reduce((a, b) => a + b, 0) }); last = now; return true; }
    if (typeof navigator !== 'undefined' && navigator.vibrate) { navigator.vibrate(pattern); last = now; return true; }
  } catch { /* nền tảng không cho rung */ }
  return false;
}
export const cancelVibration = () => { try { navigator.vibrate?.(0); } catch { /* bỏ qua */ } };
export const resetHapticsForTest = () => { last = 0; };
