import { GAME_CONFIG } from '../config/gameConfig.js';
import { VISUAL } from '../config/visual.js';
import { make, rect } from './textures.js';
import { makeNoise } from '../core/rng.js';
import { C, F } from '../map/terrain/classes.js';
// Cỏ nhỏ trên nền cỏ: cụm theo vùng (nhiễu tần thấp), không rải đều; chỉ tạo sprite cho các ô trong khung nhìn (có giới hạn).
// Gió lay nhẹ; khi nhân vật bước qua, cỏ nghiêng ra xa theo hướng đi. Tắt hiệu ứng => cỏ vẫn hiện nhưng đứng yên (tĩnh).
const TS = GAME_CONFIG.tileSize, hv = (x, y, s = 0) => { let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(s + 1, 83492791)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0; };
export const GRASS_KEYS = ['grass_tuft_0', 'grass_tuft_1', 'grass_tuft_2', 'grass_flower_0', 'grass_flower_1'];
export function createGrassTextures(scene) {
  const G = ['#4f8a3c', '#6aa84a', '#8ec765', '#b6e08a'], tuft = (xs, hs) => (c) => { xs.forEach((x, i) => { const h = hs[i]; rect(c, G[0], x, 11 - h, 1, h); rect(c, G[1], x, 11 - h, 1, h - 2); rect(c, G[2], x, 11 - h, 1, 2); if (i % 2) rect(c, G[3], x, 11 - h, 1, 1); }); rect(c, 'rgba(40,70,30,.35)', 2, 11, 12, 1); };
  make(scene, 'grass_tuft_0', 16, 12, tuft([3, 5, 7, 9, 11], [5, 8, 10, 7, 5])); make(scene, 'grass_tuft_1', 16, 12, tuft([4, 6, 8, 10], [6, 9, 7, 5])); make(scene, 'grass_tuft_2', 16, 12, tuft([2, 4, 6, 8, 10, 12], [4, 6, 8, 9, 6, 4]));
  const flower = (head, core) => (c) => { rect(c, G[1], 7, 5, 1, 7); rect(c, G[0], 5, 8, 2, 1); rect(c, G[2], 8, 7, 2, 1); rect(c, head, 6, 2, 3, 3); rect(c, head, 7, 1, 1, 5); rect(c, core, 7, 3, 1, 1); rect(c, 'rgba(40,70,30,.35)', 3, 11, 9, 1); };
  make(scene, 'grass_flower_0', 16, 12, flower('#f2a0c0', '#fff3b0')); make(scene, 'grass_flower_1', 16, 12, flower('#fafafa', '#f4d35e'));
}
export class GrassLayer {
  constructor(scene, map, density = 1) { this.scene = scene; this.map = map; this.noise = makeNoise((map.seed ^ 0x3a55) >>> 0); this.density = density; this.cells = new Map(); this.rect = null; this.t = 0; this.animated = true; this.keyOf = (id) => id; this.count = 0; this.bend = new WeakMap(); }
  defs(x, y) { // các cụm cỏ của ô (x,y): tất định theo Map ID
    const m = this.map, i = y * m.width + x, cls = m.cls[i]; if ((cls !== C.GRASS && cls !== C.FLOWER) || m.feat[i]) return null;
    const nz = this.noise(x * 0.09, y * 0.09) * 0.7 + this.noise(x * 0.31 + 9, y * 0.31) * 0.3, d = (nz > 0.58 ? 0.95 : nz > 0.45 ? 0.35 : 0.05) * this.density * VISUAL.grass.density, h = hv(x, y), out = [];
    let n = Math.floor(d * 3 + ((h & 255) / 255)); if (n > 3) n = 3;
    for (let k = 0; k < n; k++) { const hh = hv(x, y, k + 3); out.push({ key: GRASS_KEYS[hh % 3], x: x * TS + 3 + (hh & 31) * 0.78, y: y * TS + 8 + ((hh >> 5) & 15) * 1.2 + 4, ph: (hh % 628) / 100, sc: 0.95 + ((hh >> 9) & 7) / 20, flip: !!(hh & 0x4000) }); }
    if (cls === C.FLOWER && (h & 3) < 2) { const hh = hv(x, y, 9); out.push({ key: GRASS_KEYS[3 + (hh & 1)], x: x * TS + 5 + (hh & 15) * 1.4, y: y * TS + 14 + ((hh >> 4) & 7) * 1.4, ph: (hh % 628) / 100, sc: 1, flip: false }); }
    return out;
  }
  addCell(x, y) { const d = this.defs(x, y); if (!d) return; if (this.count + d.length > VISUAL.grass.maxTufts) return; const list = d.map((q) => ({ ...q, s: this.scene.add.image(q.x, q.y, this.keyOf(q.key)).setOrigin(0.5, 1).setDepth(q.y).setScale(q.sc).setFlipX(q.flip), b: 0 })); this.count += list.length; this.cells.set(y * this.map.width + x, list); }
  dropCell(k) { const l = this.cells.get(k); if (!l) return; for (const q of l) q.s.destroy(); this.count -= l.length; this.cells.delete(k); }
  // Cập nhật theo camera/người chơi. animate=false => cỏ tĩnh. player: {x,y} theo ô
  update(dt, cam, player, animate) {
    const v = cam.worldView, W = this.map.width, H = this.map.height, x0 = Math.max(0, Math.floor(v.left / TS) - 1), x1 = Math.min(W - 1, Math.floor(v.right / TS) + 1), y0 = Math.max(0, Math.floor(v.top / TS) - 1), y1 = Math.min(H - 1, Math.floor(v.bottom / TS) + 2), r = this.rect;
    if ((x1 - x0 + 1) * (y1 - y0 + 1) <= VISUAL.grass.cellsMax && (!r || r[0] !== x0 || r[1] !== x1 || r[2] !== y0 || r[3] !== y1)) {
      for (const k of [...this.cells.keys()]) { const x = k % W, y = (k / W) | 0; if (x < x0 || x > x1 || y < y0 || y > y1) this.dropCell(k); }
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!this.cells.has(y * W + x)) this.addCell(x, y);
      this.rect = [x0, x1, y0, y1];
    }
    this.t += dt; const G = VISUAL.grass, t = this.t;
    if (!animate) { if (this.animated) { for (const l of this.cells.values()) for (const q of l) { q.s.rotation = 0; q.b = 0; } this.animated = false; } return; } this.animated = true;
    const px = player ? player.x * TS : -1e9, py = player ? player.y * TS : -1e9;
    for (const l of this.cells.values()) for (const q of l) {
      let a = Math.sin(t * 1.1 + q.x * 0.021 + q.y * 0.013) * G.wind + Math.sin(t * 2.4 + q.ph) * G.gust, target = 0;
      const dx = q.x - px, dy = q.y - py, d2 = dx * dx + dy * dy; if (d2 < G.bendRadius * G.bendRadius) { const d = Math.sqrt(d2), f = 1 - d / G.bendRadius; target = Math.sign(dx || 1) * f * G.bendMax; }
      q.b += (target - q.b) * Math.min(1, dt * (target ? 14 : 5)); q.s.rotation = a + q.b;
    }
  }
  regrade(grader, g) { this.keyOf = (id) => grader.keyOf(id, g); for (const l of this.cells.values()) for (const q of l) q.s.setTexture(this.keyOf(q.key)); }
  destroy() { for (const k of [...this.cells.keys()]) this.dropCell(k); }
}
