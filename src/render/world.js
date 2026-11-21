import Phaser from 'phaser';
import { T } from '../map/tiles.js';
import { makeNoise } from '../core/rng.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { GROUND_RES, TILE_SRC, TILES, ROCKS, BUSH, TREE_ZONES, TREE_DISPLAY, ROCK_DISPLAY, BUSH_DISPLAY, assetManifest } from '../config/art.js';
import { FX } from '../config/fx.js';
const TS = GAME_CONFIG.tileSize, CH = 16, PAD = 4, vh = (x, y) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;

export function preloadWorldAssets(scene) { scene.load.setPath('assets/'); for (const [k, f] of assetManifest()) scene.load.image(k, f); }
// Tranh sơn dầu không phải pixel art -> lọc tuyến tính cho mượt (game vẫn pixelArt cho sprite nhân vật/slime)
export function smoothWorldTextures(scene) { for (const [k] of assetManifest()) scene.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR); }

// Nền: nướng thành các mảng 16x16 ô khi camera tới gần, hủy khi ở xa -> bộ nhớ ổn định kể cả bản đồ 400x400.
export class GroundRenderer {
  constructor(scene, map) {
    this.scene = scene; this.map = map; this.chunks = new Map(); this.first = true; this.S = Math.round(TS * GROUND_RES);
    this.cw = Math.ceil(map.width / CH); this.ch = Math.ceil(map.height / CH);
    this.plaza = map.playerStart; this.gates = map.gates;
  }
  at(x, y) { const m = this.map; return x < 0 || y < 0 || x >= m.width || y >= m.height ? T.TREE : m.tiles[y * m.width + x]; }
  pave(x, y) { const p = this.plaza; if (Math.hypot(x - p.x, y - p.y) <= 3.7) return true; for (const g of this.gates) if (Math.hypot(x - g.x, y - g.y) <= 2.5) return true; return false; }
  tileKey(x, y) {
    const t = this.at(x, y), h = vh(x, y);
    if (t === T.RIVER) { const shallow = this.at(x - 1, y) !== T.RIVER || this.at(x + 1, y) !== T.RIVER || this.at(x, y - 1) !== T.RIVER || this.at(x, y + 1) !== T.RIVER; const a = shallow ? TILES.waterShallow : TILES.water; return a[h % a.length]; }
    if (this.pave(x, y)) return TILES.pave[h % 3];
    if (t === T.DIRT) return TILES.sand[h % TILES.sand.length];
    if (t === T.GRASS && (h >> 9) % 17 === 0) return TILES.grassAccent[(h >> 14) % 4];
    return TILES.grass[h % TILES.grass.length];
  }
  build(cx, cy) {
    const { scene, S, map } = this, size = CH * S + PAD * 2, rt = scene.add.renderTexture(cx * CH * TS - PAD / GROUND_RES, cy * CH * TS - PAD / GROUND_RES, size, size).setOrigin(0).setScale(1 / GROUND_RES).setDepth(0);
    rt.texture.setFilter(Phaser.Textures.FilterMode.LINEAR); rt.beginDraw();
    for (let y = cy * CH - 1; y <= cy * CH + CH; y++) for (let x = cx * CH - 1; x <= cx * CH + CH; x++) {
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      const px = (x - cx * CH) * S + PAD, py = (y - cy * CH) * S + PAD; rt.batchDraw(this.tileKey(x, y), px, py);
      if (this.at(x, y) === T.RIVER) {
        if (this.at(x, y - 1) !== T.RIVER) rt.batchDraw('foam_n', px, py); if (this.at(x, y + 1) !== T.RIVER) rt.batchDraw('foam_s', px, py + S - 3);
        if (this.at(x - 1, y) !== T.RIVER) rt.batchDraw('foam_w', px, py); if (this.at(x + 1, y) !== T.RIVER) rt.batchDraw('foam_e', px + S - 3, py);
      }
    }
    rt.endDraw(); return rt;
  }
  update(cam) {
    const v = cam.worldView, x0 = Math.max(0, Math.floor(v.left / (CH * TS)) - 1), x1 = Math.min(this.cw - 1, Math.floor(v.right / (CH * TS)) + 1), y0 = Math.max(0, Math.floor(v.top / (CH * TS)) - 1), y1 = Math.min(this.ch - 1, Math.floor(v.bottom / (CH * TS)) + 1);
    let budget = this.first ? 1e9 : 3; this.first = false;
    for (let cy = y0; cy <= y1 && budget > 0; cy++) for (let cx = x0; cx <= x1 && budget > 0; cx++) { const k = cy * this.cw + cx; if (!this.chunks.has(k)) { this.chunks.set(k, this.build(cx, cy)); budget--; } }
    for (const [k, rt] of this.chunks) { const cx = k % this.cw, cy = (k / this.cw) | 0; if (cx < x0 - 2 || cx > x1 + 2 || cy < y0 - 2 || cy > y1 + 2) { rt.destroy(); this.chunks.delete(k); } }
  }
  destroy() { for (const rt of this.chunks.values()) rt.destroy(); this.chunks.clear(); }
}

// Cây / đá / bụi: ảnh từ Tree.png & Background.png. Loài cây chia theo VÙNG (nhiễu thấp tần) -> rừng thông, sồi, vườn táo, hoa anh đào...
const LEAF = { 0: [0xff7a2a, 0xd9421a], 2: [0xffb7d0, 0xff8fb5], 3: [0xff6a6a, 0x7bd34f], 7: [0xc8d070, 0x9bbb4a], default: [0x7bd34f, 0x4fa83a] };
export class ObjectLayer {
  constructor(scene, map) {
    this.scene = scene; this.trees = []; this.vis = []; this.t = 0;
    const zone = makeNoise((map.seed ^ 0x51ed270b) >>> 0), { width: W, height: H, tiles } = map;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = tiles[y * W + x]; if (t !== T.TREE && t !== T.ROCK && t !== T.BUSH) continue;
      const h = vh(x, y), by = y * TS + TREE_DISPLAY.baseY, jx = ((h & 7) - 3.5) * 0.9, jy = (((h >> 3) & 7) - 3.5) * 0.6;
      if (t === T.TREE) {
        const z = TREE_ZONES[Math.min(TREE_ZONES.length - 1, Math.floor(Math.max(0, Math.min(0.999, (zone(x * 0.045 + 3, y * 0.045 + 3) - 0.25) / 0.5)) * TREE_ZONES.length))], sp = z.species[(h >> 6) % z.species.length], k = 0.92 + ((h >> 10) & 15) / 100;
        const img = scene.add.image(x * TS + 16 + jx, by + jy, 'tree_' + sp).setOrigin(0.5, 1).setScale(TREE_DISPLAY.texScale * k).setDepth(by + jy).setFlipX(!!(h & 0x100));
        this.trees.push({ img, x: img.x, y: img.y, ph: (h % 628) / 100, spd: 0.9 + ((h >> 4) % 7) / 10, amp: 0.012 + ((h >> 8) % 9) / 500, leaf: LEAF[sp] || LEAF.default });
      } else if (t === T.ROCK) {
        scene.add.image(x * TS + 16 + jx, by + 2, ROCKS[h % ROCKS.length]).setOrigin(0.5, 1).setScale(ROCK_DISPLAY.texScale * (0.9 + ((h >> 9) & 7) / 30)).setDepth(by).setFlipX(!!(h & 0x40));
      } else scene.add.image(x * TS + 16 + jx, by + 1, BUSH).setOrigin(0.5, 1).setScale(BUSH_DISPLAY.texScale * (0.85 + ((h >> 5) & 7) / 25)).setDepth(by).setFlipX(!!(h & 0x20));
    }
  }
  // Chỉ cây trong tầm nhìn mới được lay (rẻ cả khi có hàng nghìn cây)
  update(dt, cam) {
    this.t += dt; const v = cam.worldView, vis = (this.vis.length = 0, this.vis), l = v.left - 60, r = v.right + 60, tp = v.top - 80, b = v.bottom + 60;
    for (const t of this.trees) if (t.x > l && t.x < r && t.y > tp && t.y < b) { t.img.rotation = Math.sin(this.t * t.spd + t.ph) * t.amp; vis.push(t); }
  }
}

// Lá rơi / cánh hoa: tối đa FX.leaves.max chiếc cùng lúc, sinh từ tán cây đang hiện trên màn hình
export class Ambient {
  constructor(scene, objects) { this.scene = scene; this.objs = objects; this.pool = []; this.live = []; this.acc = 0; }
  update(dt, quality = 1) {
    const cfg = FX.leaves, vis = this.objs.vis, max = Math.round(cfg.max * quality);
    this.acc += dt * cfg.perSecond * quality;
    while (this.acc >= 1) { this.acc -= 1; if (this.live.length >= max || !vis.length) break; this.spawn(vis[(Math.random() * vis.length) | 0]); }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const l = this.live[i]; l.age += dt; const k = l.age / l.life;
      if (k >= 1) { l.s.setVisible(false); this.pool.push(l.s); this.live.splice(i, 1); continue; }
      l.s.setPosition(l.x0 + l.vx * l.age + Math.sin(l.age * l.sw + l.ph) * 9, l.y0 + l.vy * l.age).setRotation(l.rot + l.age * l.spin).setAlpha(Math.min(1, k * 8, (1 - k) * 2.5) * 0.9);
    }
  }
  spawn(t) {
    const s = (this.pool.pop() || this.scene.add.image(0, 0, 'fx_leaf')).setVisible(true), c = t.leaf[(Math.random() * t.leaf.length) | 0];
    s.setTint(c).setScale(0.8 + Math.random() * 0.7).setDepth(8.6e5); const life = 3.2 + Math.random() * 2.2;
    this.live.push({ s, x0: t.x + (Math.random() - 0.5) * 34, y0: t.y - 22 - Math.random() * 26, vx: 4 + Math.random() * 10, vy: 14 + Math.random() * 12, sw: 1.5 + Math.random() * 1.5, ph: Math.random() * 6.28, rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 3, age: 0, life });
  }
}
