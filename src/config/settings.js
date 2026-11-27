import { DEFAULT_DIFFICULTY, DIFFICULTIES } from './difficulty.js';
import { isUnlocked, sanitizeCleared } from './progress.js';
import { TERRAIN_THEME_CODES } from '../map/terrain/themes.js';
import { clampGrade, GRADE_DEFAULT } from '../render/mapGrade.js';
import { PERF_MODES, DEFAULT_PERF_MODE, recommendMode } from './performance.js';
import { hardware } from '../platform/device.js';
// Cài đặt người dùng (lưu localStorage, một nơi duy nhất). Đọc: settings.data; ghi: settings.set({...}); lắng nghe: settings.on(fn).
const KEY = 'std.settings.v1'; // giữ khóa cũ để không mất tên/màu áo/kỷ lục
export const VIEW_PRESETS = { near: 9, far: 13, wide: 18 };     // số ô nhìn thấy theo cạnh NGẮN của màn hình
export const VIEW_RANGE = { min: 7, max: 26, step: 0.5 };
export const RATIOS = { '19.5:9': 19.5 / 9, '16:9': 16 / 9, full: 0 };
export const DEFAULTS = {
  name: 'Nông dân', shirt: null, lastMapId: '', bestWave: 0, bestWaves: {}, cleared: {}, difficulty: DEFAULT_DIFFICULTY, mapTheme: 'random', mapSize: 100,
  // 4 nhóm âm lượng ĐỘC LẬP: ambient = nhạc nền + môi trường (khóa cũ music/musicVol giữ nguyên để không mất cài đặt), tower, monster, character
  audio: { music: true, musicVol: 0.6, tower: true, towerVol: 0.85, monster: true, monsterVol: 0.85, character: true, characterVol: 0.85 },
  perf: { mode: DEFAULT_PERF_MODE, auto: true, adaptive: true }, // mode: saver|balanced|high; auto = còn dùng gợi ý theo thiết bị (tắt khi người chơi tự chọn); adaptive = bộ điều tiết tự động
  controls: { floatingJoystick: false },                         // joystick nổi (xuất hiện dưới ngón); mặc định: cố định
  haptics: { enabled: true },                                    // rung khi nhân vật mất máu
  display: { orientation: 'portrait', ratio: 'full', view: VIEW_PRESETS.near },
  gameplay: { autoPause: true },                    // tự tạm dừng khi mở bảng nâng cấp tháp / chọn nhánh kỹ năng
  fx: { water: true, grass: true },                 // hiệu ứng nước / cỏ (tắt = giữ hình tĩnh)
  grade: { ...GRADE_DEFAULT },                      // chỉnh màu cảnh quan
};
const merge = (d, s) => { const o = { ...d }; for (const k of Object.keys(d)) { const v = s?.[k]; o[k] = d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) ? merge(d[k], v) : v ?? d[k]; } return o; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Di trú dữ liệu cũ (std.settings.v1): bản trước chỉ có music/sfx + musicVol/sfxVol. sfx/sfxVol trở thành giá trị khởi đầu của 3 nhóm mới, sau đó bị bỏ.
export function migrate(raw) {
  const a = raw?.audio; if (!a || typeof a !== 'object') return raw;
  if ('sfx' in a || 'sfxVol' in a) { const on = a.sfx ?? true, vol = a.sfxVol ?? DEFAULTS.audio.towerVol; for (const k of ['tower', 'monster', 'character']) { if (!(k in a)) a[k] = on; if (!((k + 'Vol') in a)) a[k + 'Vol'] = vol; } delete a.sfx; delete a.sfxVol; }
  return raw;
}
function sanitize(o) {
  for (const k of ['music', 'tower', 'monster', 'character']) { o.audio[k] = !!o.audio[k]; const vk = k + 'Vol'; o.audio[vk] = clamp(+o.audio[vk] || 0, 0, 1); }
  if (!PERF_MODES.includes(o.perf.mode)) o.perf.mode = DEFAULT_PERF_MODE; o.perf.auto = !!o.perf.auto; o.perf.adaptive = !!o.perf.adaptive; o.haptics.enabled = !!o.haptics.enabled; o.controls.floatingJoystick = o.controls.floatingJoystick === true;
  if (!['portrait', 'landscape', 'auto'].includes(o.display.orientation)) o.display.orientation = DEFAULTS.display.orientation;
  if (!(o.display.ratio in RATIOS)) o.display.ratio = 'full';
  o.display.view = clamp(+o.display.view || VIEW_PRESETS.near, VIEW_RANGE.min, VIEW_RANGE.max);
  o.gameplay.autoPause = !!o.gameplay.autoPause; o.fx.water = !!o.fx.water; o.fx.grass = !!o.fx.grass; Object.assign(o.grade, clampGrade(o.grade));
  o.cleared = sanitizeCleared(o.cleared);
  if (!DIFFICULTIES[o.difficulty] || !isUnlocked(o.difficulty, o.cleared)) o.difficulty = DEFAULT_DIFFICULTY; // không thể giữ cấp đang khóa
  if (![100, 150, 200].includes(+o.mapSize)) o.mapSize = 100; o.mapSize = +o.mapSize; if (o.mapTheme !== 'random' && !TERRAIN_THEME_CODES.includes(o.mapTheme)) o.mapTheme = 'random';
  return o;
}
class Settings {
  constructor() { let raw = null; try { raw = JSON.parse(localStorage.getItem(KEY)); } catch { /* bỏ qua */ } this.data = sanitize(merge(DEFAULTS, migrate(raw) || {})); this.fns = new Set();
    if (!raw?.perf) { this.data.perf.mode = recommendMode(hardware()); } } // lần đầu (hoặc nâng cấp từ bản cũ): gợi ý chế độ theo thiết bị; người chơi đổi tay thì `auto` tắt
  on(fn) { this.fns.add(fn); return () => this.fns.delete(fn); }
  set(patch) {
    for (const [k, v] of Object.entries(patch)) this.data[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...this.data[k], ...v } : v;
    sanitize(this.data); try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* bỏ qua */ }
    for (const f of this.fns) f(this.data, Object.keys(patch));
  }
}
export const settings = new Settings();
export const viewPresetOf = (v) => Object.entries(VIEW_PRESETS).find(([, n]) => Math.abs(n - v) < 0.26)?.[0] || null;
