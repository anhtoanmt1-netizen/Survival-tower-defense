import { settings, RATIOS } from '../config/settings.js';
// Hướng màn hình (dọc / ngang / tự xoay) + tỷ lệ khung khi ngang (19.5:9 / 16:9 / toàn màn hình).
// - Khóa hướng: plugin Capacitor (APK) hoặc screen.orientation.lock (trình duyệt di động, cần toàn màn hình).
// - Tỷ lệ: #stage co lại và căn giữa (viền đen hai bên); Phaser (scale RESIZE) + UI + camera tự thích ứng theo kích thước khung.
let game = null, raf = 0, lastLock = '', note = '';
const stage = () => document.getElementById('stage');
async function lockTo(mode) {
  try { const { ScreenOrientation: SO } = await import('@capacitor/screen-orientation'); if (mode === 'auto') await SO.unlock(); else await SO.lock({ orientation: mode }); return true; } catch { /* không phải app native */ }
  try { if (mode === 'auto') { screen.orientation?.unlock?.(); return true; } await screen.orientation?.lock?.(mode); return true; } catch { return false; }
}
export function layoutStage() {
  const el = stage(); if (!el) return; const d = settings.data.display, vw = window.innerWidth, vh = window.innerHeight;
  let w = vw, h = vh; const r = RATIOS[d.ratio];
  if (vw > vh && r) { if (vw / vh > r) w = Math.round(vh * r); else h = Math.round(vw / r); } // chỉ co khung khi đang ngang và chọn tỷ lệ cố định
  Object.assign(el.style, { left: Math.round((vw - w) / 2) + 'px', top: Math.round((vh - h) / 2) + 'px', width: w + 'px', height: h + 'px' });
  game?.scale?.refresh?.();
}
const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layoutStage); };
export async function applyOrientation() {
  const mode = settings.data.display.orientation, want = mode === 'portrait' ? 'portrait' : mode === 'landscape' ? 'landscape' : 'auto';
  if (want !== lastLock) { lastLock = want; const ok = await lockTo(want); note = !ok && want !== 'auto' && ((want === 'landscape') !== (innerWidth > innerHeight)) ? (want === 'landscape' ? 'Hãy xoay thiết bị sang ngang.' : 'Hãy xoay thiết bị sang dọc.') : ''; }
  schedule(); return note;
}
export const orientationNote = () => note;
export function bindScreen(g) { game = g; schedule(); }
export function initScreen() {
  window.addEventListener('resize', schedule); window.addEventListener('orientationchange', () => setTimeout(schedule, 120));
  settings.on((d, keys) => { if (keys.includes('display')) { lastLock = lastLock === (d.display.orientation === 'auto' ? 'auto' : d.display.orientation) ? lastLock : ''; applyOrientation(); } });
  applyOrientation();
}
