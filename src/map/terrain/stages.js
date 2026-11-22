// Các giai đoạn sinh địa hình dùng chung. Chỉ dùng + - * / và nhiễu giá trị (không sin/cos/pow) để Map ID tái tạo giống hệt mọi nơi.
import { mulberry32, makeNoise, fbm } from '../../core/rng.js';
import { gateAnchors } from '../gates.js';
import { C, F, BIOME_NAMES, isWaterC } from './classes.js';
import { sizeScale } from './themes.js';
const sq = (a, b) => Math.sqrt(a * a + b * b), D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
export function makeCtx(seed, size, theme) {
  const W = size, H = size, N = W * H, S = sizeScale(size), rng = mulberry32(seed), ns = (k) => makeNoise((seed ^ k) >>> 0);
  return { W, H, N, u: S.u, S, rng, nA: ns(0x9e3779b9), nB: ns(0x85ebca6b), nC: ns(0xc2b2ae35), theme, cls: new Uint8Array(N), feat: new Uint8Array(N), fvar: new Uint8Array(N), prot: new Uint8Array(N), water: new Uint8Array(N), bio: new Uint8Array(N),
    gates: gateAnchors(W, H), start: { x: W >> 1, y: H >> 1 }, meta: { rivers: [], lakes: [], plateaus: [], paths: [], falls: [], decorCount: 0 }, decor: [] };
}
export const inb = (c, x, y) => x >= 0 && y >= 0 && x < c.W && y < c.H;
export function disk(c, x0, y0, r, fn) { for (let y = Math.max(0, Math.floor(y0 - r)); y <= Math.min(c.H - 1, Math.ceil(y0 + r)); y++) for (let x = Math.max(0, Math.floor(x0 - r)); x <= Math.min(c.W - 1, Math.ceil(x0 + r)); x++) { const dx = x - x0, dy = y - y0; if (dx * dx + dy * dy <= r * r) fn(y * c.W + x, x, y, sq(dx, dy)); } }
export const shuffle = (c, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(c.rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
export const rr = (c, lo, hi) => lo + (hi - lo) * c.rng();
// xoay không dùng sin/cos: (1-t²)/(1+t²), 2t/(1+t²)
const rot = (c) => { const t = rr(c, -0.9, 0.9), d = 1 + t * t; return [(1 - t * t) / d, (2 * t) / d]; };

// ---------- 1) Vùng sinh thái (Voronoi + méo bằng nhiễu) ----------
export function makeRegions(c) {
  const { W, H, S, theme } = c, cell = 20 * S.region, sites = [], wts = Object.entries(theme.biomes), tot = wts.reduce((s, [, w]) => s + w, 0);
  for (let gy = -1; gy <= Math.ceil(H / cell); gy++) for (let gx = -1; gx <= Math.ceil(W / cell); gx++) {
    let r = c.rng() * tot, b = 0; for (const [n, w] of wts) { r -= w; if (r <= 0) { b = BIOME_NAMES.indexOf(n); break; } }
    sites.push([(gx + 0.15 + 0.7 * c.rng()) * cell, (gy + 0.15 + 0.7 * c.rng()) * cell, b]);
  }
  c.meta.regions = sites.length;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = x + (fbm(c.nA, x * 0.045, y * 0.045) - 0.5) * 12 * S.u, wy = y + (fbm(c.nB, x * 0.045 + 9, y * 0.045) - 0.5) * 12 * S.u; let best = 1e9, bi = 0;
    for (let i = 0; i < sites.length; i++) { const d = (sites[i][0] - wx) ** 2 + (sites[i][1] - wy) ** 2; if (d < best) { best = d; bi = sites[i][2]; } }
    c.bio[y * W + x] = bi;
  }
}
// ---------- 2) Nước: sông / hồ / biển ----------
const cr = (p0, p1, p2, p3, t) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
export function spline(pts, step = 0.5) { // Catmull-Rom qua các điểm, lấy mẫu đều ~step ô
  const out = [], P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) { const len = sq(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]), n = Math.max(2, Math.ceil(len / step)); for (let k = 0; k < n; k++) { const t = k / n; out.push([cr(P[i - 1][0], P[i][0], P[i + 1][0], P[i + 2][0], t), cr(P[i - 1][1], P[i][1], P[i + 1][1], P[i + 2][1], t)]); } }
  out.push(pts[pts.length - 1]); return out;
}
// Sông: từ a đến b, uốn lượn mềm, bề rộng đổi từ từ. Trả về polyline (thượng nguồn → hạ nguồn) để biết hướng dòng chảy.
export function addRiver(c, { a, b, width, meander = 0.5, kind = 'river' }) {
  const len = sq(b[0] - a[0], b[1] - a[1]), n = Math.max(3, Math.round(len / (13 * c.u))), px = -(b[1] - a[1]) / len, py = (b[0] - a[0]) / len, wp = []; let off = 0;
  for (let i = 0; i <= n; i++) { const t = i / n; off = off * 0.45 + (c.rng() - 0.5) * meander * 20 * c.u; const e = i === 0 || i === n ? 0 : 1; wp.push([a[0] + (b[0] - a[0]) * t + px * off * e, a[1] + (b[1] - a[1]) * t + py * off * e]); }
  const line = spline(wp, 0.5), w0 = width * c.S.width;
  line.forEach(([x, y], i) => { const w = w0 * (0.8 + 0.45 * c.nB(i * 0.045 + a[0], a[1] + 3.3)); disk(c, x, y, Math.max(1.2, w / 2), (j) => { c.water[j] = 1; }); });
  c.meta.rivers.push({ kind, width: w0, points: line.filter((_, i) => i % 6 === 0).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]) }); return line;
}
export function addLake(c, { x, y, r, aspect = 0.7, irr = 0.55 }) {
  const [cs, sn] = rot(c), R = r * c.S.width * (1 + (c.S.u - 1) * 0.4); c.meta.lakes.push({ x, y, r: R });
  disk(c, x, y, R * 1.9, (j, px, py) => { const dx = px - x, dy = py - y, ax = dx * cs + dy * sn, ay = (-dx * sn + dy * cs) / aspect; if (sq(ax, ay) < R * (1 + irr * (fbm(c.nA, px * 0.11 + 31, py * 0.11 + 7) - 0.5) * 2)) c.water[j] = 1; });
}
export function addCoast(c, side, thick, wobble = 0.35) { // side: 0=N 1=S 2=W 3=E
  const T = thick * c.S.width * (1 + (c.S.u - 1) * 0.5);
  for (let y = 0; y < c.H; y++) for (let x = 0; x < c.W; x++) { const d = side === 0 ? y : side === 1 ? c.H - 1 - y : side === 2 ? x : c.W - 1 - x, along = side < 2 ? x : y; if (d < T * (1 + wobble * 1.5 * (fbm(c.nA, along * 0.032 + side * 7, 2.1, 3) - 0.5) * 2 + 0.4 * (fbm(c.nB, along * 0.11, d * 0.04 + 4.2, 2) - 0.5))) c.water[y * c.W + x] = 1; }
}
// Khối cao nguyên: vòng cung phía nam của khối trở thành VÁCH (mặt vách quay về nam như sprite). Bố cục cao thấp logic: phía bắc = mặt trên, phía nam = chân vách.
export function addPlateau(c, { x, y, rx, ry, irr = 0.45, skipWater = false }) {
  const cells = [], RX = rx * c.S.width, RY = ry * c.S.width; c.meta.plateaus.push({ x, y, rx: RX, ry: RY });
  disk(c, x, y, Math.max(RX, RY) * 1.6, (j, px, py) => { const ax = (px - x) / RX, ay = (py - y) / RY; if (sq(ax, ay) < 1 + irr * (fbm(c.nC, px * 0.1 + 5, py * 0.1 + 5) - 0.5) * 2) cells.push([px, py, j]); });
  const inside = new Set(cells.map((t) => t[2]));
  for (const [px, py, j] of cells) if (!inside.has(j + c.W) && py + 1 < c.H && py > 1 && !c.prot[j] && !c.water[j]) { if (!c.water[j - c.W] || skipWater) { c.feat[j] = F.CLIFF; c.cls[j] = C.GRASS; } }
  return cells;
}
// Đảo trong nước: nền đất (cỏ) hình khối tự nhiên + vách phía nam
export function addIsland(c, { x, y, rx, ry }) {
  const R = Math.max(rx, ry) * c.S.width; disk(c, x, y, R * 1.7, (j, px, py) => { const ax = (px - x) / (rx * c.S.width), ay = (py - y) / (ry * c.S.width); if (sq(ax, ay) < 1 + 0.5 * (fbm(c.nC, px * 0.12 + 11, py * 0.12) - 0.5) * 2) c.water[j] = 0; });
  addPlateau(c, { x, y: y + ry * 0.22, rx: rx * 0.95, ry: ry * 0.78, irr: 0.3 }); c.meta.plateaus[c.meta.plateaus.length - 1].island = true;
}
// Bỏ các vũng nước quá nhỏ còn sót (do đường cắt qua nước) -> thành bãi cát
export function pruneWater(c, minCells = 12) {
  const { W, H, N } = c, seen = new Uint8Array(N);
  for (let i = 0; i < N; i++) { if (!c.water[i] || seen[i]) continue; const comp = [i]; seen[i] = 1; for (let h = 0; h < comp.length; h++) { const k = comp[h], x = k % W, y = (k / W) | 0; for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (inb(c, nx, ny) && c.water[ny * W + nx] && !seen[ny * W + nx]) { seen[ny * W + nx] = 1; comp.push(ny * W + nx); } } } if (comp.length < minCells) for (const k of comp) { c.water[k] = 0; c.cls[k] = C.SAND; } }
}
// Chốt nước: bỏ vũng quá nhỏ, tính độ sâu theo khoảng cách tới bờ (nông ven bờ → sâu giữa), bãi cát ven bờ
export function finishWater(c, minCells = 14) {
  const { W, H, N } = c, seen = new Uint8Array(N);
  for (let i = 0; i < N; i++) { if (!c.water[i] || seen[i]) continue; const comp = [i]; seen[i] = 1; for (let h = 0; h < comp.length; h++) { const k = comp[h], x = k % W, y = (k / W) | 0; for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (inb(c, nx, ny) && c.water[ny * W + nx] && !seen[ny * W + nx]) { seen[ny * W + nx] = 1; comp.push(ny * W + nx); } } } if (comp.length < minCells) for (const k of comp) c.water[k] = 0; }
  for (let i = 0; i < N; i++) if (c.water[i] && c.feat[i]) c.feat[i] = F.NONE;
  const wd = new Int16Array(N).fill(-1), q = []; // wd: số ô từ ô nước tới bờ (1 = sát bờ)
  for (let i = 0; i < N; i++) if (c.water[i]) { const x = i % W, y = (i / W) | 0; if (D4.some(([dx, dy]) => !inb(c, x + dx, y + dy) ? false : !c.water[(y + dy) * W + x + dx])) { wd[i] = 1; q.push(i); } }
  for (let h = 0; h < q.length; h++) { const k = q[h], x = k % W, y = (k / W) | 0; for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (inb(c, nx, ny)) { const j = ny * W + nx; if (c.water[j] && wd[j] < 0) { wd[j] = wd[k] + 1; q.push(j); } } } }
  const sw = c.theme.shallowW;
  for (let i = 0; i < N; i++) if (c.water[i]) { const x = i % W, y = (i / W) | 0, d = wd[i] < 0 ? 99 : wd[i]; c.cls[i] = d <= sw - (c.nB(x * 0.2, y * 0.2) > 0.6 ? 1 : 0) ? C.SHALLOW : C.DEEP; }
  c.wd = wd; beaches(c);
}
function beaches(c) { // cát ven bờ: bề rộng 1–2 ô, đứt đoạn theo nhiễu (bờ tự nhiên, không viền đều)
  const { W, H, N } = c, d = new Int16Array(N).fill(99), q = [];
  for (let i = 0; i < N; i++) if (c.water[i]) { const x = i % W, y = (i / W) | 0; for (const [dx, dy] of D4) if (inb(c, x + dx, y + dy) && !c.water[(y + dy) * W + x + dx]) { const j = (y + dy) * W + x + dx; if (d[j] > 1) { d[j] = 1; q.push(j); } } }
  for (let h = 0; h < q.length; h++) { const k = q[h], x = k % W, y = (k / W) | 0; if (d[k] >= 3) continue; for (const [dx, dy] of D4) if (inb(c, x + dx, y + dy)) { const j = (y + dy) * W + x + dx; if (!c.water[j] && d[j] > d[k] + 1) { d[j] = d[k] + 1; q.push(j); } } }
  const amt = c.theme.beach;
  for (let i = 0; i < N; i++) if (d[i] < 99 && !c.water[i] && c.cls[i] === C.GRASS) { const x = i % W, y = (i / W) | 0, n = fbm(c.nA, x * 0.1 + 77, y * 0.1 + 3); if (d[i] === 1 ? n < 0.35 + 0.5 * amt : d[i] === 2 ? n < 0.12 + 0.4 * amt : n < 0.1 * amt) c.cls[i] = C.SAND; }
  c.landDist = d;
}
// ---------- 3) Đường đi: A* có chi phí địa hình, dùng lại đoạn đã có (tạo ngã ba), vượt nước bằng bến đá, vượt vách bằng dốc ----------
class MinHeap { constructor() { this.a = []; } get size() { return this.a.length; } push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } } pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top[1]; } }
export function astar(c, s, g, used, opt = {}) {
  const { W, H } = c, N = c.N, cost = new Float32Array(N).fill(1e9), prev = new Int32Array(N).fill(-1), h = new MinHeap(), t = g.y * W + g.x, si = s.y * W + s.x; cost[si] = 0; h.push(0, si);
  const gate = opt.gate; const cell = (i, x, y) => { let k = 1 + 3.2 * c.nA(x * 0.11 + 17, y * 0.11) * c.nA(x * 0.11 + 17, y * 0.11) + 0.8 * c.nB(x * 0.3, y * 0.3); if (c.water[i]) k += opt.ford ?? 9; if (c.feat[i] === F.CLIFF) k += opt.ramp ?? 12; if (used[i]) k *= 0.3; if (y > 0 && c.feat[i - W] === F.CLIFF) k *= 0.75; if (c.feat[i] === F.ROCK) k += 30; return k; };
  while (h.size) { const i = h.pop(), x = i % W, y = (i / W) | 0; if (i === t) break; for (const [dx, dy] of D8) { const nx = x + dx, ny = y + dy; if (!inb(c, nx, ny)) continue; const j = ny * W + nx, diag = dx && dy; if (diag && (c.water[y * W + nx] !== c.water[j] || c.feat[y * W + nx] === F.CLIFF || c.feat[ny * W + x] === F.CLIFF)) continue; const nc = cost[i] + cell(j, nx, ny) * (diag ? 1.414 : 1); if (nc < cost[j]) { cost[j] = nc; prev[j] = i; const ax = Math.abs(nx - g.x), ay = Math.abs(ny - g.y); h.push(nc + (ax + ay) - 0.586 * Math.min(ax, ay), j); } } }
  const path = []; for (let i = t; i >= 0; i = prev[i]) { path.push([i % W, (i / W) | 0]); if (i === si) break; } return path.reverse();
}
const chaikin = (p, n = 2) => { for (let k = 0; k < n; k++) { const o = [p[0]]; for (let i = 0; i < p.length - 1; i++) { o.push([0.75 * p[i][0] + 0.25 * p[i + 1][0], 0.75 * p[i][1] + 0.25 * p[i + 1][1]], [0.25 * p[i][0] + 0.75 * p[i + 1][0], 0.25 * p[i][1] + 0.75 * p[i + 1][1]]); } o.push(p[p.length - 1]); p = o; } return p; };
export function carvePath(c, from, to, used, opt = {}) {
  const raw = astar(c, from, to, used, opt); if (raw.length < 2) return null; const line = chaikin(raw.map(([x, y]) => [x + 0, y + 0]), 3), w0 = (c.theme.pathWidth + (opt.extra ?? 0)) * c.S.width;
  line.forEach(([x, y], i) => { const w = w0 * (0.88 + 0.26 * c.nC(i * 0.07 + 4, 8.1)), r = w / 2; disk(c, x, y, r, (j, px, py) => {
    if (c.water[j]) { c.water[j] = 0; c.cls[j] = C.PAVE; c.feat[j] = F.NONE; } else { if (c.feat[j] === F.CLIFF) c.feat[j] = F.NONE; if (c.cls[j] !== C.PAVE) c.cls[j] = C.DIRT; } used[j] = 1; });
    disk(c, x, y, r + 1.5, (j) => { c.prot[j] = 1; }); });
  c.meta.paths.push({ points: line.filter((_, i) => i % 5 === 0).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]), width: w0 }); return line;
}
// ---------- 4) Bề mặt: mảng đất, hoa ----------
export function dirtAndFlowers(c) {
  const { W, H, N, theme } = c;
  for (let i = 0; i < N; i++) { if (c.cls[i] !== C.GRASS || c.feat[i]) continue; const x = i % W, y = (i / W) | 0, b = c.bio[i], dryB = b === 3 ? 0.14 : b === 2 ? 0.05 : 0, n = fbm(c.nA, x * 0.065 + 40, y * 0.065 + 40, 3);
    if (n > 0.73 - theme.dirt * 0.07 - dryB && !c.prot[i]) c.cls[i] = C.DIRT; }
  for (let i = 0; i < N; i++) { if (c.cls[i] !== C.GRASS || c.feat[i]) continue; const x = i % W, y = (i / W) | 0, f = fbm(c.nB, x * 0.12 + 12, y * 0.12 + 12, 2), bonus = c.bio[i] === 0 ? 0.04 : c.bio[i] === 4 ? 0.02 : -0.05;
    if (f > 0.7 - theme.flowers * 0.09 - bonus) c.cls[i] = C.FLOWER; }
  const n = Math.round((3 + 6 * theme.dirt) * c.S.area * 0.9); // mảng đất/cát nhỏ có viền cỏ (sprite) – đặt rải có chủ đích, không đều
  for (let k = 0; k < n; k++) { const x = c.rng() * c.W, y = c.rng() * c.H, i = Math.floor(y) * W + Math.floor(x); if (c.cls[i] !== C.GRASS && c.cls[i] !== C.FLOWER) continue; if (c.prot[i] || c.feat[i] || c.water[i]) continue; if (c.nB(x * 0.05, y * 0.05) < 0.4) continue; c.decor.push({ id: c.rng() < 0.6 ? 'dirt_blob' : 'sand_blob', x, y, s: 0.8 + c.rng() * 0.9 }); }
}
// ---------- 5) Vật thể lớn: cây, đá, bụi (rải có kiểm soát: mật độ theo vùng sinh thái + khoảng cách tối thiểu) ----------
const ok = (c, i, r = 0) => !c.prot[i] && !c.water[i] && !c.feat[i] && (c.cls[i] === C.GRASS || c.cls[i] === C.FLOWER || c.cls[i] === C.SAND || c.cls[i] === C.DIRT) && c.cls[i] !== C.PAVE;
export function placeTrees(c) {
  const { W, H, N, theme, S } = c, order = shuffle(c, Array.from({ length: N }, (_, i) => i)), edge = (x, y) => Math.min(x, y, W - 1 - x, H - 1 - y);
  const belt = (x, y) => theme.treeBelt * S.width * (0.6 + 0.8 * c.nB(x * 0.07, y * 0.07)), coastNear = (i) => (c.landDist && c.landDist[i] <= 1);
  for (const i of order) { const x = i % W, y = (i / W) | 0; if (!ok(c, i) || c.cls[i] === C.DIRT || c.cls[i] === C.SAND || coastNear(i) || (y > 0 && c.feat[i - W] === F.CLIFF)) continue; // không che chân vách
    const b = c.bio[i], forest = fbm(c.nC, x * 0.05 + 3, y * 0.05 + 3, 3), mask = (b === 1 ? 0.62 : b === 4 ? 0.28 : b === 2 ? 0.14 : 0.1) + 0.55 * (forest - 0.45), inBelt = edge(x, y) < belt(x, y);
    if (inBelt ? c.rng() < 0.97 : c.rng() < Math.max(0, mask * theme.treeBase * 1.5 - 0.1) * (forest > 0.5 ? 1 : 0.5)) { c.feat[i] = F.TREE; c.fvar[i] = 0; } }
}
const ROCK_BIG = 0, ROCK_MED = 1; // fvar: loại sprite đá (autoterrain chọn id cụ thể)
export function placeRocks(c) {
  const { W, H, theme, S } = c, n = Math.round(theme.rockClusters * S.area);
  const foot = []; for (let i = 0; i < c.N; i++) if (ok(c, i) && ((i >= W && c.feat[i - W] === F.CLIFF) || (c.landDist && c.landDist[i] === 2))) foot.push(i);
  for (let k = 0; k < n; k++) { // cụm đá: 40% ở chân vách/ven bờ, còn lại trong vùng đá; mỗi cụm 1–3 đá cách nhau
    let i = -1; if (foot.length && c.rng() < 0.45) i = foot[Math.floor(c.rng() * foot.length)]; else for (let t = 0; t < 30; t++) { const j = Math.floor(c.rng() * c.N); if (ok(c, j) && (c.bio[j] === 2 || c.rng() < 0.2)) { i = j; break; } }
    if (i < 0) continue; const m = 1 + Math.floor(c.rng() * 3), x0 = i % W, y0 = (i / W) | 0;
    for (let q = 0; q < m; q++) { const x = x0 + Math.round((c.rng() - 0.5) * 4), y = y0 + Math.round((c.rng() - 0.5) * 3); if (!inb(c, x, y)) continue; const j = y * W + x; if (ok(c, j)) { c.feat[j] = F.ROCK; c.fvar[j] = c.rng() < 0.3 ? ROCK_BIG : ROCK_MED; } }
  }
}
export function placeBushes(c) {
  for (let i = 0; i < c.N; i++) { if (!ok(c, i) || c.cls[i] === C.SAND || c.cls[i] === C.DIRT) continue; const x = i % c.W, y = (i / c.W) | 0; let near = 0;
    for (const [dx, dy] of D4) if (inb(c, x + dx, y + dy) && (c.feat[(y + dy) * c.W + x + dx] === F.TREE || c.feat[(y + dy) * c.W + x + dx] === F.ROCK)) near++;
    if (c.rng() < 0.012 * c.theme.bushes + near * 0.07 * c.theme.bushes) c.feat[i] = F.BUSH; }
}
// Bảo vệ: quanh điểm xuất phát và các cổng luôn là đất trống
export function protectCore(c) {
  const clear = (x0, y0, r) => disk(c, x0, y0, r * 1.45, (j, x, y) => { if (Math.max(Math.abs(x - x0), Math.abs(y - y0)) <= r) { c.prot[j] = 1; c.feat[j] = F.NONE; if (c.water[j]) { c.water[j] = 0; c.cls[j] = C.SAND; } else if (c.cls[j] === C.PAVE || isWaterC(c.cls[j])) c.cls[j] = C.PAVE; } });
  clear(c.start.x, c.start.y, 4); for (const g of c.gates) clear(g.x, g.y, 2);
}
