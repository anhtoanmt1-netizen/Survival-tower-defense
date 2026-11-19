// Thuật toán sinh rừng rậm – phiên bản "2026". KHÔNG sửa hành vi file này sau khi phát hành:
// muốn đổi thuật toán, tạo forest2027.js và đăng ký edition mới để Map ID cũ vẫn tái tạo đúng.
import { mulberry32, makeNoise, fbm, clamp01 } from '../../core/rng.js';
import { T, isBlocking } from '../tiles.js';
import { gateAnchors } from '../gates.js';
import { floodReach, wideMask } from '../analysis.js';

const P = {
  treeFreq: 0.06, treeBase: 0.5, treeContrast: 8, treeCaIter: 3, treeBirth: 5, treeSurvive: 3,
  rockFreq: 0.09, rockThreshold: 0.62, rockCaIter: 2,
  riverEvery: 70, riverMinW: 2.4, riverMaxW: 3.6, riverWiggle: 0.5, fordsBase: 2, fordsPerSize: 40, fordRadius: 2.6,
  dirtFreq: 0.1, dirtThreshold: 0.6,
  bushNearTree: 0.22, bushScatter: 0.012,
  gateClear: 2, startClear: 4, pocketFill: 60, narrowPasses: 2,
};

function ca(src, W, H, iters, birth, survive) {
  let a = src;
  for (let it = 0; it < iters; it++) {
    const b = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && a[ny * W + nx]) n++;
      }
      b[y * W + x] = a[y * W + x] ? (n >= survive ? 1 : 0) : (n >= birth ? 1 : 0);
    }
    a = b;
  }
  return a;
}

export function generateForest2026({ seed, size }) {
  const W = size, H = size, N = W * H;
  const rng = mulberry32(seed);
  const nT = makeNoise((seed ^ 0x9e3779b9) >>> 0), nR = makeNoise((seed ^ 0x85ebca6b) >>> 0), nD = makeNoise((seed ^ 0xc2b2ae35) >>> 0);
  const tiles = new Uint8Array(N); // 0 = GRASS
  const protectedMask = new Uint8Array(N);
  const disk = (cx, cy, r, fn) => {
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(H - 1, Math.ceil(cy + r)); y++)
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W - 1, Math.ceil(cx + r)); x++)
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) fn(y * W + x);
  };

  // 1) Cây: nhiễu giá trị quyết định mật độ vùng -> Cellular Automata làm các cụm liền khối
  let trees = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = fbm(nT, x * P.treeFreq, y * P.treeFreq, 3);
    trees[y * W + x] = rng() < clamp01(P.treeBase + (v - 0.5) * P.treeContrast) ? 1 : 0;
  }
  trees = ca(trees, W, H, P.treeCaIter, P.treeBirth, P.treeSurvive);
  // 2) Đá: vùng nhiễu cao -> CA nhẹ thành cụm
  let rocks = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    rocks[y * W + x] = fbm(nR, x * P.rockFreq, y * P.rockFreq, 3) > P.rockThreshold && rng() < 0.75 ? 1 : 0;
  rocks = ca(rocks, W, H, P.rockCaIter, 5, 3);
  for (let i = 0; i < N; i++) tiles[i] = trees[i] ? T.TREE : rocks[i] ? T.ROCK : T.GRASS;

  // 3) Sông: random walk có quán tính, bút vẽ hình tròn => bờ cong tự nhiên; chừa bến cạn (ford) để không chia cắt bản đồ
  const riverCount = Math.max(1, Math.round(W / P.riverEvery));
  for (let r = 0; r < riverCount; r++) {
    const horiz = rng() < 0.5, along = horiz ? W : H, across = horiz ? H : W;
    let p = across * (0.25 + rng() * 0.5), v = 0;
    const width = P.riverMinW + rng() * (P.riverMaxW - P.riverMinW);
    const pts = [];
    for (let s = 0; s < along; s++) {
      v += (rng() - 0.5) * P.riverWiggle; v *= 0.9;
      if (v > 0.9) v = 0.9; if (v < -0.9) v = -0.9;
      v += (across * 0.5 - p) * 0.003; p += v;
      if (p < 4) { p = 4; v = 0; } if (p > across - 5) { p = across - 5; v = 0; }
      const x = horiz ? s : p, y = horiz ? p : s;
      disk(x, y, width / 2, (i) => { tiles[i] = T.RIVER; }); pts.push([x, y]);
    }
    const fords = P.fordsBase + Math.floor(W / P.fordsPerSize);
    for (let k = 0; k < fords; k++) {
      const [fx, fy] = pts[Math.min(pts.length - 1, Math.floor((k + 0.5 + (rng() - 0.5) * 0.5) * pts.length / fords))];
      disk(fx, fy, P.fordRadius, (i) => { tiles[i] = tiles[i] === T.RIVER ? T.DIRT : isBlocking(tiles[i]) ? T.GRASS : tiles[i]; });
    }
  }
  // 4) Đất trống theo vùng nhiễu
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (tiles[y * W + x] === T.GRASS && fbm(nD, x * P.dirtFreq, y * P.dirtFreq, 2) > P.dirtThreshold) tiles[y * W + x] = T.DIRT;
  // 5) Vùng bắt buộc trống: quanh 8 cổng và điểm xuất phát người chơi
  const gates = gateAnchors(W, H), start = { x: W >> 1, y: H >> 1 };
  const clear = (cx, cy, r) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (x >= 0 && y >= 0 && x < W && y < H) { tiles[y * W + x] = T.GRASS; protectedMask[y * W + x] = 1; } };
  gates.forEach((g) => clear(g.x, g.y, P.gateClear)); clear(start.x, start.y, P.startClear);
  // 6) Bụi cây: ưu tiên rìa cụm cây
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (tiles[i] !== T.GRASS || protectedMask[i]) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && tiles[ny * W + nx] === T.TREE) { near = true; break; } }
    if (rng() < (near ? P.bushNearTree : P.bushScatter)) tiles[i] = T.BUSH;
  }
  // 7) Hậu xử lý A: nới lối hẹp (xóa cây/đá cạnh ô nằm ngoài mọi khối 3x3 trống)
  for (let pass = 0; pass < P.narrowPasses; pass++) {
    const wide = wideMask(tiles, W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (isBlocking(tiles[i]) || wide[i]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const t = tiles[ny * W + nx]; if (t === T.TREE || t === T.ROCK) tiles[ny * W + nx] = T.GRASS;
      }
    }
  }
  // 8) Hậu xử lý B: không còn vùng đi được bị cô lập. Vùng nhỏ -> lấp cây; vùng lớn -> đào lối nối về trung tâm
  for (let iter = 0; iter < 30; iter++) {
    const reach = floodReach(tiles, W, H, start.x, start.y); const seen = new Uint8Array(N); let changed = false;
    for (let i = 0; i < N; i++) {
      if (reach[i] || seen[i] || isBlocking(tiles[i])) continue;
      const comp = [i]; seen[i] = 1;
      for (let h = 0; h < comp.length; h++) {
        const c = comp[h], x = c % W, y = (c / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = ny * W + nx; if (!seen[ni] && !isBlocking(tiles[ni])) { seen[ni] = 1; comp.push(ni); }
        }
      }
      changed = true;
      if (comp.length < P.pocketFill && !comp.some((c) => protectedMask[c])) { for (const c of comp) tiles[c] = T.TREE; }
      else { // đào đường thẳng (Bresenham, dày 3 ô) từ giữa vùng về điểm xuất phát
        const c0 = comp.find((c) => protectedMask[c]) ?? comp[comp.length >> 1]; let x0 = c0 % W, y0 = (c0 / W) | 0;
        const dx = Math.abs(start.x - x0), dy = -Math.abs(start.y - y0), sx = x0 < start.x ? 1 : -1, sy = y0 < start.y ? 1 : -1; let err = dx + dy;
        for (;;) {
          disk(x0, y0, 1.5, (j) => { if (isBlocking(tiles[j])) tiles[j] = T.DIRT; });
          if (x0 === start.x && y0 === start.y) break;
          const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; }
        }
      }
    }
    if (!changed) break;
  }
  return { tiles, width: W, height: H, gates, playerStart: start };
}
