import { perf } from './Perf.js';
// Hiệu ứng Dash: ẢO ẢNH (nhiều bóng mờ của chính khung hình nhân vật, nhạt dần rồi biến mất) + vệt sáng nhẹ. Dùng hồ chứa sprite, tổng số bóng giới hạn theo chế độ hiệu năng.
const LIFE = 0.32, GAP = 0.035;
export class DashFx {
  constructor(scene) { this.scene = scene; this.pool = []; this.live = []; this.acc = 0; }
  _get(key, frame) { const s = this.pool.pop() || this.scene.add.image(0, 0, key, frame); return s.setTexture(key, frame).setVisible(true); }
  begin() { this.acc = GAP; }
  // gọi mỗi khung trong lúc lướt; p = Player. Ảo ảnh màu xanh lam nhạt, cùng khung hình/hướng/tỉ lệ, ở phía sau (depth thấp hơn nhân vật).
  trail(p, dt) {
    this.acc += dt; if (this.acc < GAP || this.live.length >= perf.p.ghosts) return; this.acc = 0;
    const sp = p.sprite, s = this._get(sp.texture.key, sp.frame.name).setOrigin(sp.originX, sp.originY).setScale(sp.scaleX, sp.scaleY).setPosition(sp.x, sp.y).setDepth(sp.depth - 0.4).setTint(0x8fd0ff).setAlpha(0.55).setFlipX(sp.flipX);
    this.live.push({ s, t: 0 });
  }
  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const e = this.live[i]; e.t += dt; const k = e.t / LIFE; if (k >= 1) { e.s.setVisible(false); this.pool.push(e.s); this.live.splice(i, 1); continue; }
      e.s.setAlpha(0.55 * (1 - k) * (1 - k));
    }
  }
  clear() { for (const e of this.live) { e.s.setVisible(false); this.pool.push(e.s); } this.live.length = 0; }
  destroy() { for (const s of [...this.pool, ...this.live.map((e) => e.s)]) s.destroy(); this.pool.length = 0; this.live.length = 0; }
}
