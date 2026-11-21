import Phaser from 'phaser';
import { FONT } from '../config/ui.js';
import { FX } from '../config/fx.js';
// Hiệu ứng dùng Object Pooling: hạt, vòng sóng, ánh sáng cộng (ADD), tia lửa, chữ nổi, số sát thương.
// Tự giảm mật độ khi quá nhiều hiệu ứng cùng lúc (nhiều tháp bắn) để giữ FPS và tránh rối mắt.
const lerp = (a, b, k) => a + (b - a) * k, ADDS = new Set(['fx_glow', 'fx_spark']);
const STYLE = { fontFamily: FONT, fontStyle: '700', stroke: '#000', strokeThickness: 3 };
export class Effects {
  constructor(scene) {
    this.scene = scene; this.pools = { fx_dot: [], fx_ring: [], fx_glow: [], fx_spark: [] }; this.live = []; this.texts = []; this.liveTexts = [];
    this.dNormal = []; this.dCrit = []; this.liveDmg = []; this.density = 1; this.flashes = 0;
  }
  _img(key) { const s = this.pools[key].pop() || this.scene.add.image(0, 0, key).setDepth(8e5); if (ADDS.has(key)) s.setBlendMode(Phaser.BlendModes.ADD); return s.setVisible(true).setRotation(0).clearTint(); }
  _room() { return this.live.length < FX.maxLive; }
  puff(x, y, color, n = 6, speed = 40, life = 0.35, size = 1) {
    if (!this._room()) return; n = Math.max(1, Math.round(n * this.density));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = speed * (0.4 + Math.random() * 0.6), s = this._img('fx_dot').setTint(color).setPosition(x, y);
      this.live.push({ s, key: 'fx_dot', t: 0, life: life * (0.7 + Math.random() * 0.6), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, s0: size, s1: 0.2 * size, a0: 1 });
    }
  }
  ring(x, y, color, r0, r1, life = 0.35) { if (!this._room()) return; const s = this._img('fx_ring').setTint(color).setPosition(x, y); this.live.push({ s, key: 'fx_ring', t: 0, life, vx: 0, vy: 0, s0: r0 / 14, s1: r1 / 14, a0: 0.9 }); }
  // Quầng sáng cộng màu (ánh chớp nòng, va chạm, hào quang). size = đường kính pixel
  glow(x, y, color, size = 40, life = 0.25, alpha = 0.9) { if (!this._room()) return; const s = this._img('fx_glow').setTint(color).setPosition(x, y); this.live.push({ s, key: 'fx_glow', t: 0, life, vx: 0, vy: 0, s0: size / 64, s1: size / 64 * 0.4, a0: alpha }); }
  // Tia lửa/sao: bay tỏa ra, xoay, mờ dần
  spark(x, y, color, n = 4, speed = 70, life = 0.4, size = 1) {
    if (!this._room()) return; n = Math.max(1, Math.round(n * this.density));
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = speed * (0.5 + Math.random() * 0.5), s = this._img('fx_spark').setTint(color).setPosition(x, y).setRotation(Math.random() * 3); this.live.push({ s, key: 'fx_spark', t: 0, life: life * (0.7 + Math.random() * 0.5), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 14, s0: 0.7 * size, s1: 0.1, a0: 1, spin: (Math.random() - 0.5) * 8 }); }
  }
  trail(x, y, color, size = 0.8) { if (this.density < 0.4 || !this._room()) return; const s = this._img('fx_dot').setTint(color).setPosition(x, y); this.live.push({ s, key: 'fx_dot', t: 0, life: 0.28, vx: 0, vy: -6, s0: size, s1: 0.1, a0: 0.75 }); }
  float(x, y, str, color = '#ffd24a') {
    const t = this.texts.pop() || this.scene.add.text(0, 0, '', { ...STYLE, fontSize: '12px' }).setOrigin(0.5).setDepth(9e5).setResolution(2);
    t.setText(str).setColor(color).setPosition(x, y).setVisible(true).setAlpha(1).setScale(1); this.liveTexts.push({ t, age: 0 });
  }
  // Số sát thương nổi trên đầu quái. Thường: chữ trắng nhỏ. Chí mạng: vàng cam, to, bật nảy, kèm dấu "!". Cháy/băng: nhỏ, màu theo hệ.
  damage(x, y, amount, crit = false, kind = 'arrow') {
    const D = FX.dmg, list = crit ? this.dCrit : this.dNormal;
    if (!crit && this.liveDmg.filter((e) => !e.crit).length >= D.maxNormal) return; if (crit && this.liveDmg.filter((e) => e.crit).length >= D.maxCrit) return;
    const t = list.pop() || this.scene.add.text(0, 0, '', { ...STYLE, fontSize: (crit ? D.critSize : D.size) + 'px', fontStyle: crit ? '800' : '700', strokeThickness: crit ? 5 : 3 }).setOrigin(0.5).setDepth(9.1e5).setResolution(2);
    const n = Math.max(1, Math.round(amount)), col = crit ? '#ffd24a' : kind === 'ice' ? '#cdeeff' : kind === 'fire' ? '#ffd9b0' : kind === 'burn' ? '#ff9a40' : '#ffffff';
    t.setText(crit ? n + '!' : String(n)).setColor(col).setStroke(crit ? '#8a2e00' : '#000000', crit ? 5 : 3).setPosition(x + (Math.random() - 0.5) * 14, y).setVisible(true).setAlpha(1).setScale(0.5);
    this.liveDmg.push({ t, crit, age: 0, life: crit ? D.critLife : D.life, vx: (Math.random() - 0.5) * 22, rise: crit ? D.critRise : D.rise });
  }
  update(dt) {
    this.density = Math.max(0.2, Math.min(1, 1.15 - this.live.length / FX.maxLive));
    for (let i = this.live.length - 1; i >= 0; i--) {
      const e = this.live[i]; e.t += dt; const k = e.t / e.life;
      if (k >= 1) { e.s.setVisible(false); this.pools[e.key].push(e.s); this.live.splice(i, 1); continue; }
      e.s.setPosition(e.s.x + e.vx * dt, e.s.y + e.vy * dt).setScale(lerp(e.s0, e.s1, k)).setAlpha(e.a0 * (1 - k)); if (e.spin) e.s.rotation += e.spin * dt;
    }
    for (let i = this.liveTexts.length - 1; i >= 0; i--) {
      const e = this.liveTexts[i]; e.age += dt; if (e.age >= 0.9) { e.t.setVisible(false); this.texts.push(e.t); this.liveTexts.splice(i, 1); continue; }
      e.t.y -= 22 * dt; e.t.setAlpha(1 - e.age / 0.9);
    }
    for (let i = this.liveDmg.length - 1; i >= 0; i--) {
      const e = this.liveDmg[i]; e.age += dt; const k = e.age / e.life;
      if (k >= 1) { e.t.setVisible(false); (e.crit ? this.dCrit : this.dNormal).push(e.t); this.liveDmg.splice(i, 1); continue; }
      const pop = e.crit ? (e.age < 0.1 ? 0.5 + e.age * 10 : e.age < 0.26 ? 1.5 - (e.age - 0.1) * 3 : 1) : (e.age < 0.08 ? 0.7 + e.age * 5.6 : 1.15 - Math.min(0.15, (e.age - 0.08) * 1.5));
      e.t.setPosition(e.t.x + e.vx * dt * (1 - k), e.t.y - e.rise * dt * (1 - k * 0.7)).setScale(pop).setAlpha(k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
    }
  }
}
