// Thuật toán rừng "có chủ đề" – phiên bản 2027. Bố cục được DỰNG theo ý đồ thay vì rải nhiễu:
//   quảng trường trung tâm → 8 con đường quanh co ra 8 cổng → sông vòng cung quanh trung tâm (đường cắt qua = bến) →
//   hồ + bãi cát ở các cung → mỗi cung một chủ đề (rừng, vườn cây theo hàng, cụm đá, đồng cỏ) → vành đai rừng bao quanh bản đồ.
// Chỉ dùng + - * / và nhiễu giá trị (không sin/cos/pow) để cùng Map ID cho đúng cùng bản đồ trên mọi thiết bị.
import { mulberry32, makeNoise } from '../../core/rng.js';
import { T } from '../tiles.js';
import { gateAnchors } from '../gates.js';
import { widenNarrow, fixIsolation } from '../postprocess.js';

// 16 hướng cách nhau 22,5° (hằng số viết sẵn). Chỉ số chẵn = hướng của 8 cổng, chỉ số lẻ = giữa hai con đường (tâm các "cung").
const DIR = [[1, 0], [0.92388, 0.38268], [0.70711, 0.70711], [0.38268, 0.92388], [0, 1], [-0.38268, 0.92388], [-0.70711, 0.70711], [-0.92388, 0.38268],
  [-1, 0], [-0.92388, -0.38268], [-0.70711, -0.70711], [-0.38268, -0.92388], [0, -1], [0.38268, -0.92388], [0.70711, -0.70711], [0.92388, -0.38268]];
const ODD = [1, 3, 5, 7, 9, 11, 13, 15];
const P = { startClear: 4, gateClear: 2, roadHalf: 1.6, roadMargin: 3.0, pocketFill: 60, narrowPasses: 2 };

export function generateForest2027({ seed, size }) {
  const W = size, H = size, N = W * H, u = size / 100, rng = mulberry32(seed);
  const nA = makeNoise((seed ^ 0x9e3779b9) >>> 0), nB = makeNoise((seed ^ 0x85ebca6b) >>> 0), nC = makeNoise((seed ^ 0xc2b2ae35) >>> 0);
  const tiles = new Uint8Array(N), prot = new Uint8Array(N), cx = W >> 1, cy = H >> 1, start = { x: cx, y: cy }, gates = gateAnchors(W, H);
  const disk = (x0, y0, r, fn) => { for (let y = Math.max(0, Math.floor(y0 - r)); y <= Math.min(H - 1, Math.ceil(y0 + r)); y++) for (let x = Math.max(0, Math.floor(x0 - r)); x <= Math.min(W - 1, Math.ceil(x0 + r)); x++) if ((x - x0) * (x - x0) + (y - y0) * (y - y0) <= r * r) fn(y * W + x, x, y); };
  const free = (i) => tiles[i] === T.GRASS && !prot[i];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const at = (k, r) => [cx + DIR[k][0] * r, cy + DIR[k][1] * r];

  // 1) Sông vòng cung quanh trung tâm: 16 điểm điều khiển có gợn sóng bán kính, hở một khoảng (không khép kín hoàn toàn)
  const R0 = 25 * u + (rng() - 0.5) * 4 * u, rw = 3.4 + rng() * 1.2, k0 = Math.floor(rng() * 16), span = 10 + Math.floor(rng() * 5), pts = [];
  for (let i = 0; i <= span; i++) { const k = (k0 + i) % 16; pts.push(at(k, R0 + (nA(k * 1.7 + 0.5, 3.3) - 0.5) * 6 * u)); }
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay), steps = Math.ceil(len * 2), nx = -(by - ay) / len, ny = (bx - ax) / len;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, off = (nB(i * 5.3 + t * 2.1, 7.7) - 0.5) * 3 * u, w = rw / 2 + (nC(i * 3.1 + t * 2.7, 1.9) - 0.5) * 0.9;
      disk(ax + (bx - ax) * t + nx * off, ay + (by - ay) * t + ny * off, w, (j) => { tiles[j] = T.RIVER; });
    }
  }
  // 2) Hồ ở 1–2 cung ngoài (hình dạng bất quy tắc theo nhiễu)
  const lakeCount = 1 + (rng() < 0.5 ? 1 : 0), sectors = shuffle([...ODD]), lakes = [];
  for (let l = 0; l < lakeCount; l++) {
    const k = sectors[l], [lx, ly] = at(k, 38 * u + (rng() - 0.5) * 3 * u), r0 = (5.5 + rng() * 2.5) * u; lakes.push(k);
    disk(lx, ly, r0 * 1.35, (j, x, y) => { if (Math.hypot(x - lx, y - ly) < r0 * (0.75 + 0.6 * nA(x * 0.15 + 20, y * 0.15 + 20))) tiles[j] = T.RIVER; });
  }
  // 3) Bãi cát ven bờ (nhiễu quyết định đoạn nào có bãi)
  const bank = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tiles[y * W + x] === T.GRASS) {
    let near = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H && tiles[(y + dy) * W + x + dx] === T.RIVER) near = true;
    if (near && nB(x * 0.12 + 5, y * 0.12 + 5) > 0.38) bank.push(y * W + x);
  }
  for (const i of bank) tiles[i] = T.DIRT;
  // 4) 8 con đường quanh co từ cổng về quảng trường; chỗ cắt qua sông thành bến (đất), dựng cặp đá đánh dấu hai bên bến
  const fords = [];
  gates.forEach((g, gi) => {
    const dx = cx - g.x, dy = cy - g.y, L = Math.hypot(dx, dy), ex = g.x + dx * (1 - 5 / L), ey = g.y + dy * (1 - 5 / L), steps = Math.ceil(L * 2), px = -dy / L, py = dx / L;
    let fx = 0, fy = 0, fn = 0;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, env = 4 * t * (1 - t), off = (nA(gi * 9.1 + t * 4, 5.5) - 0.5) * 2 * 5 * u * env, x = g.x + (ex - g.x) * t + px * off, y = g.y + (ey - g.y) * t + py * off;
      const ix = Math.round(x), iy = Math.round(y); if (ix >= 0 && iy >= 0 && ix < W && iy < H && tiles[iy * W + ix] === T.RIVER) { fx += x; fy += y; fn++; }
      disk(x, y, P.roadHalf, (j) => { tiles[j] = T.DIRT; }); disk(x, y, P.roadMargin, (j) => { prot[j] = 1; });
    }
    if (fn) fords.push({ x: fx / fn, y: fy / fn, px, py });
  });
  const clear = (x0, y0, r) => disk(x0, y0, r * 1.45, (j, x, y) => { if (Math.max(Math.abs(x - x0), Math.abs(y - y0)) <= r) { tiles[j] = T.GRASS; prot[j] = 1; } });
  gates.forEach((g) => clear(g.x, g.y, P.gateClear)); clear(start.x, start.y, P.startClear);
  // 5) Vành đai rừng quanh bản đồ (dày mỏng theo nhiễu, mép thưa dần), rồi các cung có chủ đề
  const put = (i, t) => { if (free(i)) tiles[i] = t; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // ranh giới mượt theo nhiễu (không rải ngẫu nhiên từng ô -> không tạo lỗ hẹp bị hậu xử lý xóa)
    const e = Math.min(x, y, W - 1 - x, H - 1 - y), b = (4 + nA(x * 0.07, y * 0.07) * 5) * Math.max(0.6, u) + (nB(x * 0.3 + 9, y * 0.3 + 9) - 0.5) * 2.2;
    if (e < b) put(y * W + x, T.TREE);
  }
  const grove = (gx, gy, R, lattice) => {
    const ox = Math.floor(rng() * 3), oy = Math.floor(rng() * 3);
    disk(gx, gy, R * 1.4, (j, x, y) => {
      const q = 1 - Math.hypot(x - gx, y - gy) / (R * (0.75 + 0.55 * nC(x * 0.18, y * 0.18))); if (q <= 0) return;
      if (lattice) { if ((x + ox) % 3 === 0 && (y + oy) % 3 === 0 && nB(x * 0.3, y * 0.3) > 0.1) put(j, T.TREE); return; } // vườn cây: hàng đều, lối rộng 2 ô
      if (q > 0.12 + 0.4 * nB(x * 0.3 + 3, y * 0.3 + 3)) put(j, T.TREE);
    });
  };
  // cụm đá = khối đặc nhỏ (không rải chấm lẻ -> không tạo lối hẹp). n ~ số ô.
  const rocks = (gx, gy, n) => { const r = Math.sqrt(n / 3.14) + 0.4; disk(gx, gy, r * 1.4, (j, x, y) => { if (Math.hypot(x - gx, y - gy) < r * (0.8 + 0.5 * nC(x * 0.4 + 7, y * 0.4 + 7))) put(j, T.ROCK); }); };
  const outer = shuffle(['grove', 'grove', 'orchard', 'rocks', 'grove', 'rocks', 'meadow', 'meadow']), inner = shuffle(['grove', 'rocks', 'grove', 'rocks', 'meadow', 'meadow', 'rocks', 'grove']);
  ODD.forEach((k, idx) => {
    if (lakes.includes(k)) return; const [x, y] = at(k, 38 * u + (rng() - 0.5) * 4 * u), f = outer[idx];
    if (f === 'grove') grove(x, y, (8 + rng() * 3) * u, false); else if (f === 'orchard') grove(x, y, 8.5 * u, true);
    else if (f === 'rocks') for (let c = 0; c < 3; c++) rocks(x + (rng() - 0.5) * 11 * u, y + (rng() - 0.5) * 11 * u, 9 + Math.floor(rng() * 6));
    const [ix, iy] = at(k, 14 * u + (rng() - 0.5) * 2 * u), g = inner[idx];
    if (g === 'grove') grove(ix, iy, 4.5 * u, false); else if (g === 'rocks') rocks(ix, iy, 6 + Math.floor(rng() * 3));
  });
  for (const f of fords) for (const s of [-1, 1]) { const x = Math.round(f.x + f.px * 4.5 * s), y = Math.round(f.y + f.py * 4.5 * s); if (x >= 0 && y >= 0 && x < W && y < H) put(y * W + x, T.ROCK); }
  // 6) Bụi cây: rìa cụm cây (dày), rìa đường (thưa), rất ít rải rác ở đồng cỏ
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!free(i)) continue; let nearTree = false, nearRoad = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; if (tiles[ny * W + nx] === T.TREE) nearTree = true; if (prot[ny * W + nx]) nearRoad = true; }
    if (rng() < (nearTree ? 0.16 : nearRoad ? 0.05 : 0.004)) tiles[i] = T.BUSH;
  }
  // 7) Hậu xử lý: nới lối hẹp, không còn vùng cô lập
  widenNarrow(tiles, W, H, P.narrowPasses); fixIsolation(tiles, W, H, start, prot, disk, P.pocketFill);
  return { tiles, width: W, height: H, gates, playerStart: start };
}
