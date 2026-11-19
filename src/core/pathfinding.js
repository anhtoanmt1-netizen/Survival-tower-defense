import { MinHeap } from './heap.js';
const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const SQ2 = Math.SQRT2;
// A* 8 hướng, không cắt góc. Dùng chung quy tắc `grid.isWalkable` với AI quái vật & kiểm tra xây tháp (giai đoạn sau).
// Trả về mảng ô [{x,y}] (không gồm ô xuất phát) hoặc null nếu không có đường.
export function findPath(grid, sx, sy, tx, ty) {
  const W = grid.width, H = grid.height;
  if (!grid.isWalkable(tx, ty) || !grid.isWalkable(sx, sy)) return null;
  if (sx === tx && sy === ty) return [];
  const N = W * H, g = new Float32Array(N).fill(Infinity), parent = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const h = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return dx + dy + (SQ2 - 2) * Math.min(dx, dy); };
  const heap = new MinHeap(); const s = sy * W + sx; g[s] = 0; heap.push(s, h(sx, sy));
  while (heap.size) {
    const cur = heap.pop(); if (closed[cur]) continue; closed[cur] = 1;
    const cx = cur % W, cy = (cur / W) | 0;
    if (cx === tx && cy === ty) {
      const out = []; let c = cur;
      while (c !== s) { out.push({ x: c % W, y: (c / W) | 0 }); c = parent[c]; }
      return out.reverse();
    }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!grid.isWalkable(nx, ny)) continue;
      const diag = dx !== 0 && dy !== 0;
      if (diag && (!grid.isWalkable(cx + dx, cy) || !grid.isWalkable(cx, cy + dy))) continue;
      const ni = ny * W + nx, ng = g[cur] + (diag ? SQ2 : 1);
      if (ng < g[ni]) { g[ni] = ng; parent[ni] = cur; heap.push(ni, ng + h(nx, ny)); }
    }
  }
  return null;
}
