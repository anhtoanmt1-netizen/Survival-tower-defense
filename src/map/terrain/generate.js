// Quy trình sinh bản đồ theo nhiều GIAI ĐOẠN (không phải một thuật toán random duy nhất):
//  1 chủ đề → 2 vùng sinh thái (Voronoi) → 3 bố cục theo chủ đề (sông/hồ/biển/cao nguyên) → 4 bảo vệ lõi → 5 chốt nước + bờ cát
//  → 6 vách & thác → 7 mạng đường (A*) → 8 đất/hoa → 9 cây/đá/bụi → 10 kiểm tra & tự sửa (nếu lỗi: sinh lại với seed phụ, tất định)
import { T, isBlocking } from '../tiles.js';
import { widenNarrow, fixIsolation } from '../postprocess.js';
import { validateMap } from '../validate.js';
import { C, F, isWaterC } from './classes.js';
import { TERRAIN_THEMES, TERRAIN_THEME_CODES } from './themes.js';
import { makeCtx, makeRegions, finishWater, pruneWater, carvePath, dirtAndFlowers, placeTrees, placeRocks, placeBushes, protectCore, disk, inb, shuffle, rr } from './stages.js';
import { LAYOUTS } from './layouts.js';
import { validateTerrain } from './qa.js';
const tOf = (cls, feat) => feat === F.CLIFF || feat === F.ROCK ? T.ROCK : feat === F.TREE ? T.TREE : isWaterC(cls) ? T.RIVER : feat === F.BUSH ? T.BUSH : cls === C.DIRT || cls === C.SAND || cls === C.PAVE ? T.DIRT : T.GRASS;
export const deriveTiles = (c) => { const t = new Uint8Array(c.N); for (let i = 0; i < c.N; i++) t[i] = tOf(c.cls[i], c.feat[i]); return t; };
const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
// Vách chỉ hợp lệ khi: có đất phía bắc (mặt trên), phía nam không có vách khác/vật cản (chân vách), không nằm sát nước phía bắc
function fixCliffs(c) {
  const { W } = c; for (let k = 0; k < 2; k++) for (let i = 0; i < c.N; i++) if (c.feat[i] === F.CLIFF) {
    const x = i % W, y = (i / W) | 0, n = y > 0 ? i - W : -1, s = y + 1 < c.H ? i + W : -1;
    if (n < 0 || s < 0 || c.water[n] || c.feat[s] === F.CLIFF || c.feat[n] === F.CLIFF && c.feat[n - W] === F.CLIFF || c.prot[i]) c.feat[i] = F.NONE;
  }
  for (let y = 0; y < c.H; y++) { let x = 0; while (x < c.W) { if (c.feat[y * W + x] !== F.CLIFF) { x++; continue; } let e = x; while (e < c.W && c.feat[y * W + e] === F.CLIFF) e++; if (e - x < 3) for (let k = x; k < e; k++) c.feat[y * W + k] = F.NONE; x = e; } } // vách đủ dài mới có ý nghĩa
  for (let i = 0; i < c.N; i++) if (c.feat[i] === F.CLIFF) c.cls[i] = C.GRASS;
}
function waterfalls(c, boost) {
  const { W } = c, cand = []; for (let i = W; i < c.N - W; i++) if (c.feat[i] === F.CLIFF && c.water[i + W] && c.feat[i - 1] === F.CLIFF && c.feat[i + 1] === F.CLIFF && c.water[i + W - 1] && c.water[i + W + 1]) cand.push(i);
  const want = Math.min(cand.length, Math.round((boost > 0 ? 6 : 2) * c.S.area)); shuffle(c, cand); const done = [];
  for (const i of cand) { if (done.length >= want) break; if (c.rng() > (boost || 0.25)) continue; const x = i % W, y = (i / W) | 0; if (done.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 7)) continue; c.fvar[i] = 2; done.push([x, y]); c.meta.falls.push({ x, y }); }
}
function networks(c) {
  const used = new Uint8Array(c.N), S = c.start;
  for (const g of c.gates) carvePath(c, S, g, used, { ford: 7 });
  if (c.loop) { const { x, y, r } = c.loop, R = r + 4.5 * c.S.width, dirs = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]], pts = dirs.map(([a, b]) => { let k = 0.8, px, py; do { px = Math.max(3, Math.min(c.W - 4, Math.round(x + a * R * k))); py = Math.max(3, Math.min(c.H - 4, Math.round(y + b * R * k * 0.85))); k += 0.08; } while (k < 2.6 && (c.water[py * c.W + px] || (c.landDist && c.landDist[py * c.W + px] < 3))); return { x: px, y: py }; }); for (let i = 0; i < pts.length; i++) carvePath(c, pts[i], pts[(i + 1) % pts.length], used, { ford: 60, ramp: 25, extra: -0.4 }); }
  const k = Math.round((2 + 3 * c.S.area * 0.7)); // nhánh phụ tới các điểm đáng chú ý (một số là đường cụt)
  for (let n = 0; n < k; n++) { let p = null; for (let t = 0; t < 40; t++) { const x = Math.floor(rr(c, 8, c.W - 8)), y = Math.floor(rr(c, 8, c.H - 8)), i = y * c.W + x; if (!c.water[i] && !used[i] && !c.prot[i] && c.feat[i] === 0) { p = { x, y }; break; } } if (!p) continue;
    let best = null, bd = 1e9; for (const pa of c.meta.paths) for (const [px, py] of pa.points) { const d = (px - p.x) ** 2 + (py - p.y) ** 2; if (d < bd) { bd = d; best = { x: Math.round(px), y: Math.round(py) }; } } if (best && bd > 36 && bd < (60 * c.u) ** 2) carvePath(c, p, best, used, { ford: 50, ramp: 30, extra: -0.5 }); }
}
function reconcile(c, tiles) { // đồng bộ lớp hiển thị với kết quả hậu xử lý lối đi (xóa/đào/lấp)
  for (let i = 0; i < c.N; i++) { const want = tOf(c.cls[i], c.feat[i]), got = tiles[i]; if (want === got) continue; const wasBlock = isBlocking(want);
    if (wasBlock && !isBlocking(got)) { if (isWaterC(c.cls[i])) c.cls[i] = C.PAVE; else if (got === T.DIRT) c.cls[i] = C.DIRT; c.feat[i] = F.NONE; }
    else if (!wasBlock && isBlocking(got)) { if (got === T.TREE) c.feat[i] = F.TREE; else if (got === T.ROCK) c.feat[i] = F.ROCK; if (c.cls[i] === C.PAVE || c.cls[i] === C.SAND) c.cls[i] = C.GRASS; }
    else if (got === T.GRASS && want !== T.GRASS) { c.feat[i] = F.NONE; } else if (got === T.DIRT && want === T.BUSH) c.feat[i] = F.NONE; }
  for (let i = 0; i < c.N; i++) if (c.feat[i] === F.BUSH && (c.cls[i] === C.DIRT || c.cls[i] === C.SAND)) c.feat[i] = F.NONE;
}
function build(code, seed, size) {
  const theme = TERRAIN_THEMES[code], c = makeCtx(seed, size, theme);
  makeRegions(c); LAYOUTS[code](c); protectCore(c); finishWater(c); fixCliffs(c); waterfalls(c, c.fallsBoost || (code === 'HIGHLAND' || code === 'RIVER' ? 0.3 : 0));
  networks(c); pruneWater(c); dirtAndFlowers(c); placeTrees(c); placeRocks(c); placeBushes(c); protectCore(c); pruneWater(c);
  const tiles = deriveTiles(c); widenNarrow(tiles, c.W, c.H, 2); fixIsolation(tiles, c.W, c.H, c.start, c.prot, (x, y, r, fn) => disk(c, x, y, r, fn), 60); reconcile(c, tiles);
  return { c, tiles: deriveTiles(c) };
}
export function generateTerrainMap(code, { seed, size }) {
  let last = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const { c, tiles } = build(code, (seed + Math.imul(attempt, 0x9e3779b1)) >>> 0, size);
    const map = { tiles, width: c.W, height: c.H, gates: c.gates, playerStart: c.start, cls: c.cls, feat: c.feat, fvar: c.fvar, decor: c.decor,
      terrain: { themeCode: code, wd: c.wd, landDist: c.landDist, meta: { ...c.meta, attempt, regions: c.meta.regions } } };
    const v = validateMap(map), q = validateTerrain(map); last = { map, v, q };
    if (globalThis.__terrDebug && !(v.ok && q.ok)) globalThis.__terrDebug.push(code + ': ' + [...v.errors, ...q.errors].join(' | '));
    if (v.ok && q.ok) { map.terrain.qa = q; return map; }
  }
  const e = [...last.v.errors, ...last.q.errors]; throw new Error(`Không sinh được bản đồ ${code} hợp lệ: ${e.join(' ')}`);
}
export const TERRAIN_GENERATORS = Object.fromEntries(TERRAIN_THEME_CODES.map((k) => [k, (o) => generateTerrainMap(k, o)]));
