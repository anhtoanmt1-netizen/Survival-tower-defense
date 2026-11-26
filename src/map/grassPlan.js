import { C, F, isWaterC } from './terrain/classes.js';
import { makeNoise } from '../core/rng.js';
// BỐ TRÍ CỎ (thuần logic, tất định theo Map ID, kiểm thử được không cần Phaser). Cỏ KHÔNG rải đều: sinh theo CỤM trong từng khối 8x8 ô độc lập thứ tự:
//  1) cụm đồng cỏ: tâm đặt theo nhiễu 2 tầng (vùng dày / thưa / trống), mỗi cụm 2-8 búi, bán kính và kích thước khác nhau, luân phiên biến thể để không lặp mẫu;
//  2) cụm ven nước: dải búi chạy dọc bờ, lệch ra xa mép nước;  3) búi ven đường / đất trống: nhỏ, lệch ra khỏi mép để không che lối đi.
// Cấm tuyệt đối: ô không phải cỏ/hoa, ô có cây/đá/bụi/vách, gần cổng quái, gần điểm xuất phát, trên đường/đá lát/nước/cát.
export const GRASS_CHUNK = 8, GRASS_VARIANTS = 9, GRASS_TILE = 32;
export const GRASS_RULES = { gateClear: 4.5, startClear: 3.5, widthMin: 26, widthMax: 54, shoreChance: 0.2, verges: 0.15 };
const hv = (x, y, s = 0) => { let h = (Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663) ^ Math.imul(s + 1, 83492791)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0; };
const u = (x, y, s) => (hv(x, y, s) & 0xffff) / 65536, sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export class GrassPlanner {
  constructor(map) { this.map = map; this.noise = makeNoise((map.seed ^ 0x3a55) >>> 0); this.W = map.width; this.H = map.height; this.chunksX = Math.ceil(this.W / GRASS_CHUNK); this.chunksY = Math.ceil(this.H / GRASS_CHUNK); }
  isGrass(x, y) { const m = this.map; if (x < 0 || y < 0 || x >= this.W || y >= this.H) return false; const i = y * this.W + x, c = m.cls[i]; return (c === C.GRASS || c === C.FLOWER) && !m.feat[i]; }
  safe(x, y) { // x,y là toạ độ ô (số thực): xa cổng quái và điểm xuất phát
    const m = this.map, R = GRASS_RULES; for (const g of m.gates || []) if (Math.hypot(x - (g.x + 0.5), y - (g.y + 0.5)) < R.gateClear) return false;
    const s = m.playerStart; return !s || Math.hypot(x - (s.x + 0.5), y - (s.y + 0.5)) >= R.startClear;
  }
  ok(px, py) { const tx = Math.floor(px / GRASS_TILE), ty = Math.floor(py / GRASS_TILE); return this.isGrass(tx, ty) && this.safe(px / GRASS_TILE, py / GRASS_TILE); }
  near(x, y, test, r) { const m = this.map; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const a = x + i, b = y + j; if (a < 0 || b < 0 || a >= this.W || b >= this.H) continue; if (test(m.cls[b * this.W + a], m.feat[b * this.W + a])) return true; } return false; }
  tuft(list, px, py, v, scMul, salt) {
    if (!this.ok(px, py)) return; const R = GRASS_RULES, hx = hv(Math.round(px), Math.round(py), salt), w = (R.widthMin + (R.widthMax - R.widthMin) * ((hx & 255) / 255)) * scMul;
    list.push({ v, x: px, y: py, sc: w / 192, flip: !!(hx & 0x100), ph: ((hx >>> 9) % 628) / 100, amp: 0.55 + ((hx >> 4) & 15) / 20, spd: 0.8 + ((hx >> 12) & 15) / 20, rank: ((hx >> 16) & 1023) / 1024 });
  }
  // Danh sách búi của khối (cx,cy), thứ tự cố định (tất định). Mỗi búi: {v biến thể, x,y px (chân), sc tỉ lệ, flip, ph pha gió, amp, spd, rank 0..1 để làm thưa theo chế độ hiệu năng}.
  chunk(cx, cy) {
    const x0 = cx * GRASS_CHUNK, y0 = cy * GRASS_CHUNK, out = [], n = this.noise, TS = GRASS_TILE, V = GRASS_VARIANTS; let last = -1;
    const pick = (hx) => { hx >>>= 0; let v = hx % V; if (v === last) v = (v + 1 + ((hx >>> 5) % (V - 1))) % V; last = v; return v; };
    // 1) cụm đồng cỏ: ứng viên mỗi ~3 ô (lệch ngẫu nhiên), có xác suất theo vùng
    for (let j = 0; j < GRASS_CHUNK; j += 3) for (let i = 0; i < GRASS_CHUNK; i += 3) {
      const tx = x0 + i + (hv(x0 + i, y0 + j, 1) % 3), ty = y0 + j + (hv(x0 + i, y0 + j, 2) % 3); if (!this.isGrass(tx, ty)) continue;
      const zone = n(tx * 0.065, ty * 0.065) * 0.65 + n(tx * 0.21 + 7, ty * 0.21 + 3) * 0.35, p = 0.12 + 0.88 * sstep(0.36, 0.64, zone); if (u(tx, ty, 3) > p) continue;
      const M = 2 + Math.floor(zone * zone * 9 * (0.4 + u(tx, ty, 4))), rad = 0.7 + 0.42 * Math.sqrt(M) * (0.7 + u(tx, ty, 5) * 0.6), cxp = (tx + 0.2 + u(tx, ty, 6) * 0.6) * TS, cyp = (ty + 0.2 + u(tx, ty, 7) * 0.6) * TS;
      for (let k = 0; k < Math.min(M, 8); k++) {
        const h = hv(tx, ty, 10 + k), a = (h & 1023) / 1024 * 6.2832, r = rad * TS * Math.sqrt(u(tx, ty, 20 + k)) * (0.5 + 0.5 * u(tx, ty, 30 + k));
        this.tuft(out, cxp + Math.cos(a) * r, cyp + Math.sin(a) * r * 0.7, pick(h >>> 10), 0.62 + 0.55 * (1 - k / (M + 1)) * (0.7 + u(tx, ty, 40 + k) * 0.5), 50 + k);
      }
    }
    // 2) ven nước và 3) ven đường / đất trống: duyệt từng ô của khối
    const isWater = (c) => isWaterC(c), isPath = (c) => c === C.DIRT || c === C.PAVE || c === C.SAND;
    for (let y = y0; y < Math.min(this.H, y0 + GRASS_CHUNK); y++) for (let x = x0; x < Math.min(this.W, x0 + GRASS_CHUNK); x++) {
      if (!this.isGrass(x, y)) continue;
      if (u(x, y, 60) < GRASS_RULES.shoreChance && this.near(x, y, isWater, 2)) { // hướng "ra xa nước" = tổng vector từ các ô nước tới ô này
        let gx = 0, gy = 0; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const a = x + i, b = y + j; if (a >= 0 && b >= 0 && a < this.W && b < this.H && isWater(this.map.cls[b * this.W + a])) { gx -= i; gy -= j; } }
        const l = Math.hypot(gx, gy) || 1; gx /= l; gy /= l; const cnt = 2 + (hv(x, y, 61) % 3), px0 = (x + 0.5 + gx * 0.25) * TS, py0 = (y + 0.5 + gy * 0.25) * TS;
        for (let k = 0; k < cnt; k++) { const t = (k - (cnt - 1) / 2) * 0.55 * TS; this.tuft(out, px0 - gy * t + (u(x, y, 62 + k) - 0.5) * 8, py0 + gx * t + (u(x, y, 70 + k) - 0.5) * 6, pick(hv(x, y, 80 + k) >>> 3), 0.75 + u(x, y, 90 + k) * 0.4, 100 + k); }
      } else if (u(x, y, 110) < GRASS_RULES.verges && this.near(x, y, isPath, 1)) { // mép đường: 1-2 búi nhỏ, lệch về phía xa đường
        let gx = 0, gy = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const a = x + i, b = y + j; if (a >= 0 && b >= 0 && a < this.W && b < this.H && isPath(this.map.cls[b * this.W + a])) { gx -= i; gy -= j; } }
        const l = Math.hypot(gx, gy) || 1; gx /= l; gy /= l; const cnt = 1 + (hv(x, y, 111) & 1);
        for (let k = 0; k < cnt; k++) this.tuft(out, (x + 0.5 + gx * 0.3) * TS + (u(x, y, 112 + k) - 0.5) * 10, (y + 0.55 + gy * 0.3) * TS + (u(x, y, 120 + k) - 0.5) * 6, pick(hv(x, y, 130 + k) >>> 3), 0.5 + u(x, y, 140 + k) * 0.25, 150 + k);
      }
    }
    return out;
  }
}
