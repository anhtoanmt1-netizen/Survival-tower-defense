import { T, isBlocking } from './tiles.js';
import { floodReach, wideMask } from './analysis.js';
// Hậu xử lý dùng chung cho các edition mới (edition 2026 giữ bản sao riêng vì bất biến).
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// A) nới lối hẹp: xóa cây/đá cạnh các ô đi được nằm ngoài mọi khối 2x2 trống (không đụng vùng `prot` bắt buộc giữ)
export function widenNarrow(tiles, W, H, passes = 2) {
  for (let pass = 0; pass < passes; pass++) {
    const wide = wideMask(tiles, W, H), snap = tiles.slice(); // snapshot: ô vừa được dọn không bị coi là "hẹp" trong cùng lượt (tránh lan dây chuyền)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (isBlocking(snap[i]) || wide[i]) continue;
      for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const t = tiles[ny * W + nx]; if (t === T.TREE || t === T.ROCK) tiles[ny * W + nx] = T.GRASS; }
    }
  }
}
// B) không còn vùng đi được bị cô lập: vùng nhỏ -> lấp cây; vùng lớn -> đào lối (đất) nối về điểm xuất phát
export function fixIsolation(tiles, W, H, start, prot, disk, pocketFill = 60) {
  const N = W * H;
  for (let iter = 0; iter < 30; iter++) {
    const reach = floodReach(tiles, W, H, start.x, start.y), seen = new Uint8Array(N); let changed = false;
    for (let i = 0; i < N; i++) {
      if (reach[i] || seen[i] || isBlocking(tiles[i])) continue;
      const comp = [i]; seen[i] = 1;
      for (let h = 0; h < comp.length; h++) {
        const c = comp[h], x = c % W, y = (c / W) | 0;
        for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const ni = ny * W + nx; if (!seen[ni] && !isBlocking(tiles[ni])) { seen[ni] = 1; comp.push(ni); } }
      }
      changed = true;
      if (comp.length < pocketFill && !comp.some((c) => prot[c])) { for (const c of comp) tiles[c] = T.TREE; continue; }
      const c0 = comp.find((c) => prot[c]) ?? comp[comp.length >> 1]; let x0 = c0 % W, y0 = (c0 / W) | 0;
      const dx = Math.abs(start.x - x0), dy = -Math.abs(start.y - y0), sx = x0 < start.x ? 1 : -1, sy = y0 < start.y ? 1 : -1; let err = dx + dy;
      for (;;) {
        disk(x0, y0, 1.5, (j) => { if (isBlocking(tiles[j])) tiles[j] = T.DIRT; });
        if (x0 === start.x && y0 === start.y) break;
        const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    if (!changed) break;
  }
}
