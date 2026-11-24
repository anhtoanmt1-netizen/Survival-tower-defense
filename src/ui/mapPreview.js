import { generateMap, parseMapId } from '../map/index.js';
import { Composer } from '../map/terrain/compose.js';
import { F, isWaterC } from '../map/terrain/classes.js';
import { TERRAIN_THEMES } from '../map/terrain/themes.js';
// BẢN ĐỒ XEM TRƯỚC: ghép nền bằng chính Composer của game (không sprite) rồi vẽ lớp phủ (cây, đá, vách, cổng, điểm xuất phát) => phản ánh ĐÚNG bản đồ sẽ chơi.
const blend = (d, w, x, y, c, a) => { if (x < 0 || y < 0 || x >= w) return; const o = (y * w + x) * 4; if (o + 3 >= d.length) return; d[o] += (c[0] - d[o]) * a; d[o + 1] += (c[1] - d[o + 1]) * a; d[o + 2] += (c[2] - d[o + 2]) * a; };
function disc(d, w, h, cx, cy, r, c, a = 1) { for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(h - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(w - 1, Math.ceil(cx + r)); x++) { const q = Math.hypot(x - cx, y - cy); if (q <= r) blend(d, w, x, y, c, a * Math.min(1, r - q + 0.8)); } }
function ring(d, w, h, cx, cy, r, c) { for (let y = Math.max(0, Math.floor(cy - r - 1)); y <= Math.min(h - 1, Math.ceil(cy + r + 1)); y++) for (let x = Math.max(0, Math.floor(cx - r - 1)); x <= Math.min(w - 1, Math.ceil(cx + r + 1)); x++) { const q = Math.abs(Math.hypot(x - cx, y - cy) - r); if (q < 1) blend(d, w, x, y, c, 1 - q); } }
export function previewScale(size) { return Math.max(2, Math.floor(480 / size)); }
// store: {get(id)->{w,h,data}} chỉ cần 7 texture nền fill_*
export function previewBuffer(map, store, S = previewScale(map.width)) {
  const cp = new Composer(store, map, S, { sprites: false }), CH = 8, W = map.width * S, H = map.height * S, out = new Uint8ClampedArray(W * H * 4);
  for (let cy = 0; cy * CH < map.height; cy++) for (let cx = 0; cx * CH < map.width; cx++) { const ch = cp.compose(cx, cy, CH); for (let y = 0; y < ch.h; y++) { const dy = cy * CH * S + y; if (dy >= H) break; const w = Math.min(ch.w, W - cx * CH * S); out.set(ch.data.subarray(y * ch.w * 4, (y * ch.w + w) * 4), (dy * W + cx * CH * S) * 4); } }
  const { width: mw, feat, cls } = map, tr = (S >= 3 ? 1 : 0.9);
  for (let i = 0; i < feat.length; i++) { const f = feat[i]; if (!f) continue; const x = i % mw, y = (i / mw) | 0;
    if (f === F.CLIFF) { disc(out, W, H, (x + 0.5) * S, (y + 0.55) * S, S * 0.78, [104, 98, 108], 0.95); disc(out, W, H, (x + 0.5) * S, (y + 0.3) * S, S * 0.5, [138, 176, 96], 0.8); }
    else if (f === F.ROCK) disc(out, W, H, (x + 0.5) * S, (y + 0.5) * S, S * 0.62, [132, 136, 142], 0.95);
    else if (f === F.BUSH) disc(out, W, H, (x + 0.5) * S, (y + 0.5) * S, S * 0.4, [86, 150, 70], 0.8); }
  if (map.trees) for (const [x, y] of map.trees) { disc(out, W, H, (x + 1) * S, (y + 1.15) * S, S * 1.05 * tr, [38, 92, 52], 0.95); disc(out, W, H, (x + 0.85) * S, (y + 0.85) * S, S * 0.62, [86, 148, 78], 0.85); }
  else for (let i = 0; i < feat.length; i++) if (feat[i] === F.TREE) { const x = i % mw, y = (i / mw) | 0; disc(out, W, H, (x + 0.5) * S, (y + 0.5) * S, S * 0.75, [40, 98, 54], 0.92); }
  for (const g of map.gates) { disc(out, W, H, (g.x + 0.5) * S, (g.y + 0.5) * S, Math.max(2.4, S * 1.3), [176, 108, 255], 1); ring(out, W, H, (g.x + 0.5) * S, (g.y + 0.5) * S, Math.max(3, S * 1.5), [255, 255, 255]); }
  ring(out, W, H, (map.playerStart.x + 0.5) * S, (map.playerStart.y + 0.5) * S, Math.max(4, S * 2.4), [255, 255, 255]); disc(out, W, H, (map.playerStart.x + 0.5) * S, (map.playerStart.y + 0.5) * S, Math.max(2, S * 0.9), [255, 214, 90], 1);
  return { w: W, h: H, data: out };
}
// Thông tin tóm tắt (chip) về bản đồ: chủ đề, kích thước, tỉ lệ nước/rừng và đặc điểm nổi bật
export function describeMap(map) {
  const N = map.width * map.height, th = TERRAIN_THEMES[map.terrain?.themeCode], m = map.terrain?.meta; let water = 0, tree = 0, cliff = 0, path = 0;
  for (let i = 0; i < N; i++) { if (isWaterC(map.cls[i])) water++; if (map.feat[i] === F.TREE) tree++; if (map.feat[i] === F.CLIFF) cliff++; if (map.cls[i] === 2 || map.cls[i] === 6) path++; }
  const chips = []; if (m?.rivers?.length) chips.push(['water', `${m.rivers.length} sông`]); if (m?.lakes?.length) chips.push(['water', `${m.lakes.length} hồ`]); if (cliff > 8) chips.push(['map', `${m?.plateaus?.length || 0} vách`]); if (m?.falls?.length) chips.push(['water', `${m.falls.length} thác`]);
  chips.push(['tree', `Rừng ${Math.round((tree / N) * 100)}%`]); if (water / N > 0.02) chips.push(['water', `Nước ${Math.round((water / N) * 100)}%`]); chips.push(['map', `${map.gates.length} cổng`]);
  return { title: th ? th.vi : map.theme, sub: th ? th.name : '', blurb: th?.blurb || 'Bản đồ rừng (phiên bản cũ).', size: map.width, chips, water: water / N, tree: tree / N };
}
// ----- phần trình duyệt: tải 7 texture nền, vẽ lên <canvas>, tạo bản đồ có debounce, chống chạy chồng -----
export class MapPreview {
  constructor(canvas, onInfo) { this.cv = canvas; this.onInfo = onInfo; this.store = null; this.token = 0; this.cache = new Map(); }
  async load() { if (this.store) return this.store; const ids = ['grass', 'flower', 'dirt', 'sand', 'shallow', 'deep', 'pave'], m = {}; const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
    await Promise.all(ids.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { c.width = im.width; c.height = im.height; x.drawImage(im, 0, 0); m['fill_' + n] = { w: im.width, h: im.height, data: x.getImageData(0, 0, im.width, im.height).data }; res(); }; im.onerror = res; im.src = `assets/terrain/fill_${n}.png`; })));
    return (this.store = { get: (id) => m[id] }); }
  async show(mapId) { // trả về info hoặc null nếu ID sai / bị thay thế bởi yêu cầu mới hơn
    const my = ++this.token, p = parseMapId(mapId); if (!p.ok) return null; const store = await this.load(); await new Promise((r) => setTimeout(r, 0)); if (my !== this.token) return null;
    let map = this.cache.get(p.id); if (!map) { map = generateMap(p.id); this.cache.set(p.id, map); if (this.cache.size > 6) this.cache.delete(this.cache.keys().next().value); }
    const buf = previewBuffer(map, store); if (my !== this.token) return null; this.cv.width = buf.w; this.cv.height = buf.h; this.cv.getContext('2d').putImageData(new ImageData(buf.data, buf.w, buf.h), 0, 0); const info = { ...describeMap(map), id: p.id }; this.onInfo?.(info); return info; }
}
