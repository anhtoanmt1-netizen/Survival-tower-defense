import { GAME_CONFIG } from '../config/gameConfig.js';
import { WALL_DISPLAY } from '../config/art.js';
import { ECON } from '../config/economy.js';
const TS = GAME_CONFIG.tileSize;
// Hiển thị TƯỜNG (Wall.png): khối 2x2 ô, rộng WALL_DISPLAY.width px, chân neo đáy khối, Y-sorting cùng tháp/cây (depth = y chân) nên tường kề nhau nối liền.
// Xuất hiện: trồi lên + nảy nhẹ (≈0.22s) kèm bụi. Bị phá: mờ dần. Tường đang "chờ xác nhận bán" nhấp nháy đỏ.
export class WallRenderer {
  constructor(scene, ts, fx) { this.scene = scene; this.ts = ts; this.fx = fx; this.views = new Map(); this.t = 0; this.armed = null; }
  create(w, animate) {
    const S = this.scene, F = ECON.footprint.wall, x = (w.x + F / 2) * TS, yb = (w.y + F) * TS + 2, img = S.add.image(x, yb, 'wall').setOrigin(0.5, 1).setDepth((w.y + F) * TS - 2);
    const k = WALL_DISPLAY.width / img.width; img.setScale(k);
    const shadow = S.add.image(x, (w.y + F) * TS - 3, 'fx_shadow').setDepth(0.6).setDisplaySize(80, 26).setAlpha(0.34);
    const v = { img, shadow, k, age: animate ? 0 : 1, x, yb }; this.views.set(w.id, v);
    if (animate) { img.setScale(k * 0.7, k * 0.2).setAlpha(0.2); this.fx.puff(x, yb - 4, 0xc9b88a, 12, 60, 0.4); }
    return v;
  }
  hit(id) { const v = this.views.get(id); if (v) v.hit = 1; }
  arm(w) { this.armed = w ? w.id : null; }
  sync(dt) {
    this.t += dt; const alive = new Set();
    for (const w of this.ts.walls) {
      alive.add(w.id); const v = this.views.get(w.id) || this.create(w, true);
      if (v.age < 1) { v.age = Math.min(1, v.age + dt / 0.22); const e = v.age, o = 1 + 2.2 * Math.pow(e - 1, 3) + 1.2 * Math.pow(e - 1, 2); v.img.setScale(v.k * (0.7 + 0.3 * Math.min(1, e * 1.4)), v.k * Math.max(0.2, o)).setAlpha(Math.min(1, 0.2 + e * 1.4)); } // easeOutBack theo trục đứng
      if (this.armed === w.id) v.img.setTint(Math.floor(this.t * 8) % 2 ? 0xff9a9a : 0xffffff); else v.img.clearTint();
    }
    for (const [id, v] of this.views) if (!alive.has(id)) { this.fx.puff(v.x, v.yb - 8, 0xb89a6a, 12, 64, 0.45); v.img.destroy(); v.shadow.destroy(); this.views.delete(id); }
  }
}
