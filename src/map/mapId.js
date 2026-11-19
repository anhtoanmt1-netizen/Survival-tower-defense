import { THEMES } from '../config/themes/index.js';
import { EDITIONS } from './generators/index.js';
// Định dạng: <CHỦ ĐỀ>-<PHIÊN BẢN THUẬT TOÁN>-<SEED 6 ký tự>[-<KÍCH THƯỚC nếu khác mặc định của phiên bản>]
// Ví dụ: FOREST-2026-A8F72K  hoặc  FOREST-2026-A8F72K-150
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32 (30 bit seed = 6 ký tự)
export function seedToCode(seed) {
  let s = ''; let v = seed >>> 0;
  for (let i = 0; i < 6; i++) { s = ALPHABET[v & 31] + s; v >>>= 5; }
  return s;
}
export function codeToSeed(code) {
  let v = 0;
  for (const ch of code) { const i = ALPHABET.indexOf(ch); if (i < 0) return null; v = (v * 32 + i) >>> 0; }
  return v;
}
export function randomSeed() {
  const a = new Uint32Array(1);
  (globalThis.crypto || { getRandomValues: (x) => { x[0] = (Math.random() * 4294967296) >>> 0; return x; } }).getRandomValues(a);
  return a[0] & 0x3fffffff;
}
export function formatMapId({ theme, edition, seed, size }) {
  const def = EDITIONS[edition]?.defaultSize;
  return `${theme}-${edition}-${seedToCode(seed)}` + (size && size !== def ? `-${size}` : '');
}
export function parseMapId(input) {
  const s = String(input ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const m = /^([A-Z]+)-(\d{4})-([0-9A-Z]{6})(?:-(\d{2,3}))?$/.exec(s);
  if (!m) return { ok: false, error: 'Mã bản đồ sai định dạng (ví dụ: FOREST-2026-A8F72K).' };
  const [, theme, editionStr, rawCode, sizeStr] = m;
  if (!THEMES[theme]) return { ok: false, error: `Chủ đề "${theme}" chưa được hỗ trợ.` };
  const edition = Number(editionStr);
  const ed = EDITIONS[edition];
  if (!ed || !ed.generators[theme]) return { ok: false, error: `Phiên bản thuật toán ${edition} không hỗ trợ chủ đề ${theme}.` };
  const code = rawCode.replace(/O/g, '0').replace(/[IL]/g, '1');
  const seed = codeToSeed(code);
  if (seed === null) return { ok: false, error: 'Mã seed chứa ký tự không hợp lệ.' };
  const size = sizeStr ? Number(sizeStr) : ed.defaultSize;
  if (size < ed.minSize || size > ed.maxSize) return { ok: false, error: `Kích thước bản đồ phải từ ${ed.minSize} đến ${ed.maxSize}.` };
  return { ok: true, theme, edition, seed, size, id: formatMapId({ theme, edition, seed, size }) };
}
