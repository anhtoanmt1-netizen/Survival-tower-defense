import Phaser from 'phaser';
import { planLotus, LOTUS_SPRITES, LOTUS_ASPECT } from '../map/lotusPlan.js';
import { perf } from '../systems/Perf.js';
// HOA SEN trên mặt nước (ảnh gốc Hoasen.png đã tách sẵn). Kế hoạch bố trí tất định ở map/lotusPlan.js. Chỉ dựng sprite cho các bông trong khung nhìn (hồ chứa),
// lay nhẹ như gió thoảng: xoay rất nhỏ quanh mực nước + phập phồng + nhấp nhô, pha theo toạ độ nên sóng gió chạy ngang qua đám sen; dưới mỗi bông có một vòng gợn mờ.
// Gió là hàm của thời gian (không cộng dồn) nên bỏ khung cập nhật khi máy yếu không gây giật. Chế độ Tiết kiệm: thưa bớt bông + bỏ vòng gợn.
export const LOTUS_KEYS = Array.from({ length: LOTUS_SPRITES }, (_, i) => `lotus_${i}`);
const ORIGIN_Y = 0.74, DEPTH = 0.6;   // gốc xoay ở ~74% chiều cao ảnh (mực nước); depth trên nền+gợn nước (0.3), dưới bóng/vật thể
export class LotusLayer {
  constructor(scene, map) { this.scene = scene; this.all = planLotus(map); this.live = new Map(); this.pool = []; this.rings = []; this.t = 0; this.animated = true; this.setQuality(); this.lastPerf = perf.p.id; }
  setQuality() { this.keep = perf.p.id === 'saver' ? 0.6 : 1; this.ripples = perf.p.id !== 'saver'; }
  show(q) {
    const s = (this.pool.pop() || this.scene.add.image(0, 0, LOTUS_KEYS[0])).setTexture(LOTUS_KEYS[q.v]).setVisible(true).setOrigin(0.5, ORIGIN_Y).setDepth(DEPTH);
    const sc = q.w / this.scene.textures.get(LOTUS_KEYS[q.v]).getSourceImage().width; s.setPosition(q.x, q.y).setScale(sc * (q.flip ? -1 : 1), sc).setRotation(0).setAlpha(1);
    let r = null; if (this.ripples) { r = (this.rings.pop() || this.scene.add.image(0, 0, 'fx_ripple')).setVisible(true).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH - 0.1).setPosition(q.x, q.y + q.w * LOTUS_ASPECT[q.v] * 0.2).setScale(q.w / 26, q.w / 26 * 0.9).setAlpha(0.2); }
    const e = { q, s, r, sc }; this.live.set(q, e); return e;
  }
  hide(e) { e.s.setVisible(false); this.pool.push(e.s); if (e.r) { e.r.setVisible(false); this.rings.push(e.r); } this.live.delete(e.q); }
  rebuild() { for (const e of [...this.live.values()]) this.hide(e); this.setQuality(); }
  // dt thực (giây). animate=false => đứng yên (tắt hiệu ứng nước trong Cài đặt)
  update(dt, cam, animate) {
    if (this.lastPerf !== perf.p.id) { this.lastPerf = perf.p.id; this.rebuild(); }
    this.t += dt; const v = cam.worldView, pad = 140, l = v.left - pad, r = v.right + pad, tp = v.top - pad, b = v.bottom + pad;
    if (!this.all.length) return;
    // Hiện/ẩn theo khung nhìn (duyệt danh sách ≤ vài trăm phần tử: rẻ), tránh làm mỗi khung khi nhân vật đứng yên bằng cách chỉ làm khi camera đổi chỗ đủ xa
    const key = (l / 64 | 0) + ',' + (tp / 64 | 0) + ',' + (r / 64 | 0) + ',' + (b / 64 | 0);
    if (key !== this.viewKey) { this.viewKey = key;
      for (const q of this.all) { const inView = q.rank <= this.keep && q.x > l && q.x < r && q.y > tp && q.y < b, e = this.live.get(q); if (inView && !e) this.show(q); else if (!inView && e) this.hide(e); } }
    if (!animate) { if (this.animated) { for (const e of this.live.values()) { e.s.setRotation(0).setPosition(e.q.x, e.q.y).setScale(e.sc * (e.q.flip ? -1 : 1), e.sc); } this.animated = false; } return; }
    this.animated = true; if (!perf.due(1)) return;
    const t = this.t, gust = 0.7 + 0.3 * Math.sin(t * 0.31);
    for (const e of this.live.values()) { const q = e.q, ph = t * 1.1 * q.spd + q.ph - (q.x * 0.8 + q.y * 0.35) * 0.011, w = Math.sin(ph) * gust * q.amp;
      e.s.setRotation(w * 0.035 + Math.sin(t * 2.3 * q.spd + q.ph) * 0.006).setPosition(q.x + w * 0.8, q.y + Math.sin(t * 1.7 * q.spd + q.ph) * 0.7).setScale(e.sc * (q.flip ? -1 : 1) * (1 + Math.sin(ph * 0.8) * 0.006), e.sc * (1 + Math.cos(ph * 0.8) * 0.008));
      if (e.r) { const k = (t * 0.33 * q.spd + q.ph) % 1, a = Math.sin(Math.PI * k); e.r.setAlpha(0.06 + a * 0.2).setScale(q.w / 26 * (0.85 + k * 0.3), q.w / 26 * 0.9 * (0.85 + k * 0.3)); } }
  }
  destroy() { for (const e of [...this.live.values()]) this.hide(e); for (const s of this.pool) s.destroy(); for (const s of this.rings) s.destroy(); this.pool = []; this.rings = []; }
}
