import { MinHeap } from './heap.js';
const SQ2 = Math.SQRT2;
const D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQ2], [1, -1, SQ2], [-1, 1, SQ2], [-1, -1, SQ2]];
// Flow Field: Dijkstra nhiều nguồn (mọi người chơi còn sống) tính 1 lần cho TẤT CẢ quái vật.
// Cùng quy tắc địa hình/cắt góc với A* của người chơi (grid.isWalkable). dist = Infinity => không có đường.
export class FlowField {
  constructor(w, h) { this.w = w; this.h = h; this.dist = new Float32Array(w * h); this.gridVersion = -1; this.key = ''; }
  compute(grid, targets) {
    const { w, h, dist } = this; dist.fill(Infinity); const closed = new Uint8Array(w * h), heap = new MinHeap();
    for (const t of targets) { if (!grid.isWalkable(t.x, t.y)) continue; const i = t.y * w + t.x; dist[i] = 0; heap.push(i, 0); }
    while (heap.size) {
      const c = heap.pop(); if (closed[c]) continue; closed[c] = 1; const cx = c % w, cy = (c / w) | 0;
      for (const [dx, dy, cost] of D8) {
        const nx = cx + dx, ny = cy + dy; if (!grid.isWalkable(nx, ny)) continue;
        if (dx && dy && (!grid.isWalkable(cx + dx, cy) || !grid.isWalkable(cx, cy + dy))) continue;
        const ni = ny * w + nx, nd = dist[c] + cost; if (nd < dist[ni]) { dist[ni] = nd; heap.push(ni, nd); }
      }
    }
    this.gridVersion = grid.version;
  }
  // Ô láng giềng có dist nhỏ nhất (đi được, không cắt góc); -1 nếu đang ở cực tiểu (tức là tại đích) hoặc không có đường
  next(grid, x, y) {
    const { w, dist } = this; let best = -1, bd = dist[y * w + x];
    if (!(bd < Infinity)) return -1;
    for (const [dx, dy] of D8) {
      const nx = x + dx, ny = y + dy; if (!grid.isWalkable(nx, ny)) continue;
      if (dx && dy && (!grid.isWalkable(x + dx, y) || !grid.isWalkable(x, y + dy))) continue;
      const d = dist[ny * w + nx]; if (d < bd) { bd = d; best = ny * w + nx; }
    }
    return best;
  }
}
