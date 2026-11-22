import { DEFAULT_DIFFICULTY, DIFFICULTIES } from './difficulty.js';
import { TERRAIN_THEME_CODES } from '../map/terrain/themes.js';
// Cài đặt người dùng (lưu localStorage, một nơi duy nhất). Đọc: settings.data; ghi: settings.set({...}); lắng nghe: settings.on(fn).
const KEY = 'std.settings.v1'; // giữ khóa cũ để không mất tên/màu áo/kỷ lục
export const VIEW_PRESETS = { near: 9, far: 13, wide: 18 };     // số ô nhìn thấy theo cạnh NGẮN của màn hình
export const VIEW_RANGE = { min: 7, max: 26, step: 0.5 };
export const RATIOS = { '19.5:9': 19.5 / 9, '16:9': 16 / 9, full: 0 };
export const DEFAULTS = {
  name: 'Nông dân', shirt: null, lastMapId: '', bestWave: 0, bestWaves: {}, difficulty: DEFAULT_DIFFICULTY, mapTheme: 'random', mapSize: 100,
  audio: { music: true, sfx: true, musicVol: 0.6, sfxVol: 0.85 },
  display: { orientation: 'portrait', ratio: 'full', view: VIEW_PRESETS.near },
};
const merge = (d, s) => { const o = { ...d }; for (const k of Object.keys(d)) { const v = s?.[k]; o[k] = d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) ? merge(d[k], v) : v ?? d[k]; } return o; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function sanitize(o) {
  o.audio.musicVol = clamp(+o.audio.musicVol || 0, 0, 1); o.audio.sfxVol = clamp(+o.audio.sfxVol || 0, 0, 1);
  if (!['portrait', 'landscape', 'auto'].includes(o.display.orientation)) o.display.orientation = DEFAULTS.display.orientation;
  if (!(o.display.ratio in RATIOS)) o.display.ratio = 'full';
  o.display.view = clamp(+o.display.view || VIEW_PRESETS.near, VIEW_RANGE.min, VIEW_RANGE.max);
  if (!DIFFICULTIES[o.difficulty]) o.difficulty = DEFAULT_DIFFICULTY;
  if (![100, 150, 200].includes(+o.mapSize)) o.mapSize = 100; o.mapSize = +o.mapSize; if (o.mapTheme !== 'random' && !TERRAIN_THEME_CODES.includes(o.mapTheme)) o.mapTheme = 'random';
  return o;
}
class Settings {
  constructor() { let raw = null; try { raw = JSON.parse(localStorage.getItem(KEY)); } catch { /* bỏ qua */ } this.data = sanitize(merge(DEFAULTS, raw || {})); this.fns = new Set(); }
  on(fn) { this.fns.add(fn); return () => this.fns.delete(fn); }
  set(patch) {
    for (const [k, v] of Object.entries(patch)) this.data[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...this.data[k], ...v } : v;
    sanitize(this.data); try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* bỏ qua */ }
    for (const f of this.fns) f(this.data, Object.keys(patch));
  }
}
export const settings = new Settings();
export const viewPresetOf = (v) => Object.entries(VIEW_PRESETS).find(([, n]) => Math.abs(n - v) < 0.26)?.[0] || null;
