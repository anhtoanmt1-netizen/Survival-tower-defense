// Bản đồ cũ (edition 2026/2027) chỉ có `tiles`. Hàm này suy ra các lớp hiển thị (cls/feat/fvar) để mọi bản đồ dùng chung MỘT bộ vẽ nền.
// Không đổi `tiles` => khả năng chơi và Map ID cũ giữ nguyên.
import { T } from '../tiles.js';
import { C, F } from './classes.js';
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], hv = (x, y) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
export function deriveLayers(map) {
  const { width: W, height: H, tiles } = map, N = W * H, cls = new Uint8Array(N), feat = new Uint8Array(N), fvar = new Uint8Array(N), wd = new Int16Array(N).fill(-1), q = [];
  for (let i = 0; i < N; i++) { const t = tiles[i]; if (t === T.DIRT) cls[i] = C.DIRT; else if (t === T.TREE) feat[i] = F.TREE; else if (t === T.ROCK) { feat[i] = F.ROCK; fvar[i] = hv(i % W, (i / W) | 0) % 3 === 0 ? 0 : 1; } else if (t === T.BUSH) feat[i] = F.BUSH; }
  for (let i = 0; i < N; i++) if (tiles[i] === T.RIVER) { const x = i % W, y = (i / W) | 0; if (D4.some(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H && tiles[(y + dy) * W + x + dx] !== T.RIVER)) { wd[i] = 1; q.push(i); } }
  for (let h = 0; h < q.length; h++) { const k = q[h], x = k % W, y = (k / W) | 0; for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) { const j = ny * W + nx; if (tiles[j] === T.RIVER && wd[j] < 0) { wd[j] = wd[k] + 1; q.push(j); } } } }
  for (let i = 0; i < N; i++) if (tiles[i] === T.RIVER) cls[i] = wd[i] >= 0 && wd[i] <= 2 ? C.SHALLOW : C.DEEP;
  for (let i = 0; i < N; i++) if (cls[i] === C.GRASS && !feat[i]) { const x = i % W, y = (i / W) | 0; if (D4.some(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H && tiles[(y + dy) * W + x + dx] === T.RIVER) && hv(x, y) % 10 < 6) cls[i] = C.SAND; }
  map.cls = cls; map.feat = feat; map.fvar = fvar; map.decor = []; return map;
}
