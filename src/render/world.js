import Phaser from 'phaser';
import { T } from '../map/tiles.js';
import { makeNoise } from '../core/rng.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { TREE_ZONES, assetManifest } from '../config/art.js';
import { VISUAL } from '../config/visual.js';
import { ASSET_MANIFEST } from '../map/terrain/registryIndex.js';
import { rockSprite, treeSpecies } from '../map/terrain/autoterrain.js';
import { TERRAIN_THEMES } from '../map/terrain/themes.js';
import { F } from '../map/terrain/classes.js';
const TS = GAME_CONFIG.tileSize, vh = (x, y) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0, rnd = (r) => r[0] + Math.random() * (r[1] - r[0]);
export function preloadWorldAssets(scene) { scene.load.setPath('assets/'); for (const [k, f] of [...assetManifest(), ...ASSET_MANIFEST]) scene.load.image(k, f); }
// Tranh sơn dầu không phải pixel art -> lọc tuyến tính cho mượt (sprite nhân vật/slime vẫn pixel art)
export function smoothWorldTextures(scene) { for (const [k] of [...assetManifest(), ...ASSET_MANIFEST]) if (scene.textures.exists(k)) scene.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR); }

// Cây / đá / bụi + BÓNG TIẾP ĐẤT. Bản đồ mới: cây 2x2 ô theo map.trees (neo giữa đáy, chân cây nằm trong 2 ô dưới); bản đồ cũ: cây 1 ô theo từng ô.
// Y-sorting: depth = y chân vật thể (thế giới px). Bóng ở depth 0.5: trên nền, dưới mọi vật thể.
export class ObjectLayer {
  constructor(scene, map) {
    this.scene = scene; this.trees = []; this.vis = []; this.t = 0; this.items = []; this.ids = new Set();
    const zone = makeNoise((map.seed ^ 0x51ed270b) >>> 0), th = map.terrain ? TERRAIN_THEMES[map.terrain.themeCode] : null, zones = th?.zones || ['oak', 'pine', 'orchard', 'blossom', 'autumn', 'bamboo'];
    const { width: W, height: H, tiles, feat } = map, V = VISUAL.tree, SH = VISUAL.shadow;
    const add = (id, x, by, wW, flip = false) => { const tx = scene.textures.get(id).getSourceImage(), img = scene.add.image(x, by, id).setOrigin(0.5, 1).setScale(wW / tx.width).setDepth(by).setFlipX(flip); this.items.push({ img, id }); this.ids.add(id); return img; };
    const shadow = (x, by, [w, h, a]) => scene.add.image(x, by - 1, 'fx_shadow').setDepth(0.5).setDisplaySize(w, h).setAlpha(a);
    const tree = (cx, by, sp, h, big) => { const k = 0.94 + ((h >> 10) & 15) / 160, wW = (big ? V.displayW : V.legacyW) * k, s = big ? 1.1 : 0.8; shadow(cx, by, [SH.tree[0] * (wW / V.displayW) * (big ? 1 : 1.5), SH.tree[1], SH.tree[2]]);
      const img = add('tree_' + sp, cx, by, wW, !!(h & 0x100)); this.trees.push({ img, x: cx, y: by, hh: img.displayHeight, sp, ph: (h % 628) / 100, spd: 0.9 + ((h >> 4) % 7) / 10, amp: (0.012 + ((h >> 8) % 9) / 500) * (big ? 0.85 : 1) * s }); };
    if (map.trees) for (const [x, y] of map.trees) { const h = vh(x, y); tree((x + 1) * TS + ((h & 7) - 3.5) * 0.5, (y + 2) * TS + V.baseOffset + (((h >> 3) & 3) - 1.5) * 0.6, treeSpecies(map, x, y, zone, zones, TREE_ZONES), h, true); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, t = tiles[i]; if (t !== T.TREE && t !== T.ROCK && t !== T.BUSH) continue; const h = vh(x, y), by = y * TS + 30, jx = ((h & 7) - 3.5) * 0.9;
      if (t === T.TREE) { if (!map.trees) tree(x * TS + 16 + jx, by + (((h >> 3) & 7) - 3.5) * 0.6, treeSpecies(map, x, y, zone, zones, TREE_ZONES), h, false); }   // cây 2x2 đã vẽ theo map.trees
      else if (t === T.ROCK) { if (feat[i] === F.CLIFF) continue; const r = rockSprite(map, x, y); shadow(x * TS + 16 + jx, by + 2, SH.rock); add(r.id, x * TS + 16 + jx, by + 2, 1.5 * TS, r.flipX); }   // vách đã được ghép vào nền
      else { const w = (0.95 + ((h >> 5) & 7) / 40) * TS; shadow(x * TS + 16 + jx, by + 1, SH.bush); add('bush_cluster', x * TS + 16 + jx, by + 1, w, !!(h & 0x20)); }
    }
  }
  // Chỉ cây trong tầm nhìn mới được lay (rẻ cả khi có hàng nghìn cây)
  update(dt, cam) {
    this.t += dt; const v = cam.worldView, vis = (this.vis.length = 0, this.vis), l = v.left - 80, r = v.right + 80, tp = v.top - 140, b = v.bottom + 80;
    for (const t of this.trees) if (t.x > l && t.x < r && t.y > tp && t.y < b) { t.img.rotation = Math.sin(this.t * t.spd + t.ph) * t.amp + Math.sin(this.t * 2.1 + t.ph * 1.7) * t.amp * 0.25; vis.push(t); }
  }
  retexture(grader, g) { for (const it of this.items) it.img.setTexture(grader.keyOf(it.id, g)); }
}

// Lá / cánh hoa rơi THEO LOÀI cây (bảng VISUAL.leaf): màu, tốc độ rơi/trôi, độ đung đưa, kích cỡ riêng; tối đa FX leaves.max chiếc cùng lúc
export class Ambient {
  constructor(scene, objects) { this.scene = scene; this.objs = objects; this.pool = []; this.live = []; this.acc = 0; }
  update(dt, quality = 1) {
    const cfg = { max: 22, perSecond: 5 }, vis = this.objs.vis, max = Math.round(cfg.max * quality);
    this.acc += dt * cfg.perSecond * quality;
    while (this.acc >= 1) { this.acc -= 1; if (this.live.length >= max || !vis.length) break; const t = vis[(Math.random() * vis.length) | 0], L = VISUAL.leaf[t.sp] || VISUAL.leaf.default; if (Math.random() < L.rate) this.spawn(t, L); }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const l = this.live[i]; l.age += dt; const k = l.age / l.life;
      if (k >= 1) { l.s.setVisible(false); this.pool.push(l.s); this.live.splice(i, 1); continue; }
      l.s.setPosition(l.x0 + l.vx * l.age + Math.sin(l.age * l.sw + l.ph) * 9, l.y0 + l.vy * l.age).setRotation(l.rot + l.age * l.spin).setAlpha(Math.min(1, k * 8, (1 - k) * 2.5) * 0.9);
    }
  }
  spawn(t, L) {
    const s = (this.pool.pop() || this.scene.add.image(0, 0, 'fx_leaf')).setVisible(true), c = L.colors[(Math.random() * L.colors.length) | 0];
    s.setTint(c).setScale(rnd(L.size), rnd(L.size) * (L.size[1] > 1.5 ? 0.8 : 1)).setDepth(8.6e5);
    this.live.push({ s, x0: t.x + (Math.random() - 0.5) * 50, y0: t.y - t.hh * (0.35 + Math.random() * 0.55), vx: rnd(L.vx), vy: rnd(L.vy), sw: rnd(L.sway), ph: Math.random() * 6.28, rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * L.spin * 2, age: 0, life: rnd(L.life) });
  }
}
