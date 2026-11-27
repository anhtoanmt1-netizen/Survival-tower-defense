import { isWaterC } from './terrain/classes.js';
import { makeNoise } from '../core/rng.js';
// BỐ TRÍ HOA SEN TRÊN MẶT NƯỚC (thuần logic, tất định theo Map ID, kiểm thử được không cần Phaser).
// Sprite lấy từ public/assets/lotus/lotus_0..6.png (tools/build_lotus_assets.py). Mỗi sprite có cỡ hiển thị theo ô (LOTUS_TILES: rộng, rồi suy ra cao theo tỉ lệ ảnh).
// Quy tắc: toàn bộ khung chiếm chỗ + 1 ô đệm quanh nó phải là nước (không đè bờ cát/cỏ/vách/cây), cách cổng quái và điểm xuất phát, không chồng nhau; sen mọc thành đám theo nhiễu.
export const LOTUS_SPRITES = 7;
export const LOTUS_TILES = [2.0, 1.7, 2.2, 2.4, 2.4, 3.4, 2.3];      // chiều rộng hiển thị (ô) của từng sprite
export const LOTUS_ASPECT = [181 / 256, 252 / 256, 126 / 256, 135 / 256, 146 / 256, 124 / 256, 124 / 256]; // cao/rộng của ảnh
export const LOTUS_CELL = 4, LOTUS_TS = 32;
export const LOTUS_RULES = { gateClear: 5, startClear: 5, density: 1.1, margin: 1 };
const hv = (x, y, s = 0) => { let h = (Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663) ^ Math.imul(s + 1, 83492791)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0; };
const u = (x, y, s) => (hv(x, y, s) & 0xffff) / 65536;
export function planLotus(map) {
  const W = map.width, H = map.height, R = LOTUS_RULES, noise = makeNoise(((map.seed | 0) ^ 0x10705) >>> 0), out = [], taken = [];
  const water = (x, y) => x >= 0 && y >= 0 && x < W && y < H && isWaterC(map.cls[y * W + x]) && !map.feat[y * W + x];
  const free = (cx, cy, hw, hh) => { for (let y = Math.floor(cy - hh) - R.margin; y <= Math.floor(cy + hh) + R.margin; y++) for (let x = Math.floor(cx - hw) - R.margin; x <= Math.floor(cx + hw) + R.margin; x++) if (!water(x, y)) return false; return true; };
  const safe = (x, y) => { for (const g of map.gates || []) if (Math.hypot(x - (g.x + 0.5), y - (g.y + 0.5)) < R.gateClear) return false; const s = map.playerStart; return !s || Math.hypot(x - (s.x + 0.5), y - (s.y + 0.5)) >= R.startClear; };
  for (let cy = 0; cy < H; cy += LOTUS_CELL) for (let cx = 0; cx < W; cx += LOTUS_CELL) {
    const zone = noise(cx * 0.09, cy * 0.09) * 0.7 + noise(cx * 0.31 + 5, cy * 0.31 + 9) * 0.3;
    if (u(cx, cy, 1) > R.density * (0.45 + 1.5 * Math.max(0, zone - 0.3))) continue;
    const v = hv(cx, cy, 2) % LOTUS_SPRITES, wT = LOTUS_TILES[v] * (0.9 + u(cx, cy, 3) * 0.25), hT = wT * LOTUS_ASPECT[v];
    const x = cx + 0.5 + u(cx, cy, 4) * (LOTUS_CELL - 1), y = cy + 0.5 + u(cx, cy, 5) * (LOTUS_CELL - 1);   // tâm (ô). Đáy sprite = y + hT*0.25
    if (!free(x, y, wT / 2, hT / 2) || !safe(x, y)) continue;
    if (taken.some((t) => Math.abs(t.x - x) < (t.w + wT) / 2 && Math.abs(t.y - y) < (t.h + hT) / 2)) continue;
    taken.push({ x, y, w: wT, h: hT });
    const h = hv(cx, cy, 6);
    out.push({ v, x: x * LOTUS_TS, y: y * LOTUS_TS, w: wT * LOTUS_TS, flip: !!(h & 1), ph: ((h >>> 1) % 628) / 100, amp: 0.6 + ((h >>> 11) & 15) / 25, spd: 0.7 + ((h >>> 15) & 15) / 25, rank: ((h >>> 19) & 1023) / 1024 });
  }
  return out;
}
