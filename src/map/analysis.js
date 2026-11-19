import { isBlocking } from './tiles.js';
export function floodReach(tiles, W, H, sx, sy) {
  const reach = new Uint8Array(W * H); const q = new Int32Array(W * H); let qh = 0, qt = 0;
  const s = sy * W + sx; if (isBlocking(tiles[s])) return reach;
  reach[s] = 1; q[qt++] = s;
  while (qh < qt) {
    const c = q[qh++], x = c % W, y = (c / W) | 0;
    if (x > 0 && !reach[c - 1] && !isBlocking(tiles[c - 1])) { reach[c - 1] = 1; q[qt++] = c - 1; }
    if (x < W - 1 && !reach[c + 1] && !isBlocking(tiles[c + 1])) { reach[c + 1] = 1; q[qt++] = c + 1; }
    if (y > 0 && !reach[c - W] && !isBlocking(tiles[c - W])) { reach[c - W] = 1; q[qt++] = c - W; }
    if (y < H - 1 && !reach[c + W] && !isBlocking(tiles[c + W])) { reach[c + W] = 1; q[qt++] = c + W; }
  }
  return reach;
}
// Ô mở nằm trong ít nhất một khối kxk hoàn toàn đi được = "rộng" (mặc định k=2: lối tối thiểu rộng 2 ô). Ô còn lại = lối hẹp.
export function wideMask(tiles, W, H, k = 2) {
  const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !isBlocking(tiles[y * W + x]);
  const wide = new Uint8Array(W * H);
  for (let y = 0; y <= H - k; y++) for (let x = 0; x <= W - k; x++) {
    let all = true;
    for (let dy = 0; dy < k && all; dy++) for (let dx = 0; dx < k; dx++) if (!open(x + dx, y + dy)) { all = false; break; }
    if (all) for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) wide[(y + dy) * W + x + dx] = 1;
  }
  return wide;
}
