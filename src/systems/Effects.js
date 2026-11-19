// Hiệu ứng nhẹ dùng Object Pooling: hạt, vòng sóng, chữ nổi. Giảm số lượng ở chất lượng thấp qua `density`.
const lerp = (a, b, k) => a + (b - a) * k;
export class Effects {
  constructor(scene) { this.scene = scene; this.pools = { fx_dot: [], fx_ring: [] }; this.live = []; this.texts = []; this.liveTexts = []; this.density = 1; }
  _img(key) { const s = this.pools[key].pop() || this.scene.add.image(0, 0, key).setDepth(8e5); return s.setVisible(true); }
  puff(x, y, color, n = 6, speed = 40, life = 0.35, size = 1) {
    n = Math.max(1, Math.round(n * this.density));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = speed * (0.4 + Math.random() * 0.6), s = this._img('fx_dot').setTint(color).setPosition(x, y);
      this.live.push({ s, key: 'fx_dot', t: 0, life: life * (0.7 + Math.random() * 0.6), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, s0: size, s1: 0.2 * size, a0: 1 });
    }
  }
  ring(x, y, color, r0, r1, life = 0.35) { // r0,r1: bán kính pixel
    const s = this._img('fx_ring').setTint(color).setPosition(x, y); this.live.push({ s, key: 'fx_ring', t: 0, life, vx: 0, vy: 0, s0: r0 / 14, s1: r1 / 14, a0: 0.9 });
  }
  float(x, y, str, color = '#ffd24a') {
    const t = this.texts.pop() || this.scene.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '12px', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(9e5).setResolution(2);
    t.setText(str).setColor(color).setPosition(x, y).setVisible(true).setAlpha(1); this.liveTexts.push({ t, age: 0 });
  }
  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const e = this.live[i]; e.t += dt; const k = e.t / e.life;
      if (k >= 1) { e.s.setVisible(false); this.pools[e.key].push(e.s); this.live.splice(i, 1); continue; }
      e.s.setPosition(e.s.x + e.vx * dt, e.s.y + e.vy * dt).setScale(lerp(e.s0, e.s1, k)).setAlpha(e.a0 * (1 - k));
    }
    for (let i = this.liveTexts.length - 1; i >= 0; i--) {
      const e = this.liveTexts[i]; e.age += dt; if (e.age >= 0.9) { e.t.setVisible(false); this.texts.push(e.t); this.liveTexts.splice(i, 1); continue; }
      e.t.y -= 22 * dt; e.t.setAlpha(1 - e.age / 0.9);
    }
  }
}
