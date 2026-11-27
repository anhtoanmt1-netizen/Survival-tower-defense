import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { VISUAL } from '../config/visual.js';
import { make } from './textures.js';
import { isWaterC } from '../map/terrain/classes.js';
// Hiệu ứng nước (pixel-art-friendly, KHÔNG shader/CSS): tia phản chiếu lấp lánh + gợn sóng loang, chỉ sinh trong khung nhìn, tối đa VISUAL.water.max sprite.
// Không đụng tới địa hình/va chạm. Tắt trong Cài đặt => sprite được thu hồi ngay, nước vẫn giữ hình nền tĩnh.
const TS = GAME_CONFIG.tileSize;
export function createWaterTextures(scene) {
  make(scene, 'fx_glint', 9, 9, (c) => { c.imageSmoothingEnabled = true; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(4.5, 0); c.lineTo(5.6, 3.4); c.lineTo(9, 4.5); c.lineTo(5.6, 5.6); c.lineTo(4.5, 9); c.lineTo(3.4, 5.6); c.lineTo(0, 4.5); c.lineTo(3.4, 3.4); c.closePath(); c.fill(); });
  // sóng dài: đường lượn mảnh mờ hai đầu, trôi chậm ngang mặt nước
  make(scene, 'fx_wave', 48, 10, (c) => { c.imageSmoothingEnabled = true; const g = c.createLinearGradient(0, 0, 48, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.3, 'rgba(255,255,255,.95)'); g.addColorStop(0.7, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = g; c.lineWidth = 1.5; c.lineCap = 'round'; c.beginPath(); for (let x = 2; x <= 46; x += 2) { const y = 5 + Math.sin(x / 48 * 6.2832 * 1.5) * 2.2; if (x === 2) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); });
  make(scene, 'fx_ripple', 32, 12, (c) => { c.imageSmoothingEnabled = true; c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 1.4; c.beginPath(); c.ellipse(16, 6, 13, 4, 0, 0, 6.2832); c.stroke(); });
}
export class WaterFx {
  constructor(scene, map) { this.scene = scene; this.map = map; this.pool = []; this.live = []; this.acc = 0; }
  water(cx, cy) { const m = this.map; return cx >= 0 && cy >= 0 && cx < m.width && cy < m.height && isWaterC(m.cls[cy * m.width + cx]); }
  clear() { for (const e of this.live) { e.s.setVisible(false); this.pool.push(e.s); } this.live.length = 0; }
  update(dt, cam, enabled, quality = 1) {
    if (!enabled) { if (this.live.length) this.clear(); return; }
    const V = VISUAL.water, v = cam.worldView, max = Math.round(V.max * quality); this.acc += dt * V.perSecond * quality;
    while (this.acc >= 1) { this.acc -= 1; if (this.live.length >= max) break;
      for (let t = 0; t < V.tries; t++) { const x = v.x + Math.random() * v.width, y = v.y + Math.random() * v.height, cx = Math.floor(x / TS), cy = Math.floor(y / TS); if (!this.water(cx, cy) || !this.water(cx + 1, cy) || !this.water(cx - 1, cy) || !this.water(cx, cy + 1) || !this.water(cx, cy - 1)) continue;
        const r0 = Math.random(), wave = r0 < 0.22 && this.water(cx + 2, cy) && this.water(cx - 2, cy), ripple = !wave && r0 < 0.55, s = (this.pool.pop() || this.scene.add.image(0, 0, 'fx_glint')).setTexture(wave ? 'fx_wave' : ripple ? 'fx_ripple' : 'fx_glint').setVisible(true).setBlendMode(Phaser.BlendModes.ADD).setDepth(0.3).setPosition(x, y).setRotation(0);
        this.live.push({ s, ripple, wave, x, y, age: 0, life: wave ? 3.2 + Math.random() * 1.2 : ripple ? V.rippleLife * (0.8 + Math.random() * 0.5) : V.glintLife * (0.7 + Math.random() * 0.7), sc: 0.6 + Math.random() * 0.7, dx: wave ? 6 + Math.random() * 5 : (Math.random() - 0.3) * 5 }); break; } }
    for (let i = this.live.length - 1; i >= 0; i--) { const e = this.live[i]; e.age += dt; const k = e.age / e.life; if (k >= 1) { e.s.setVisible(false); this.pool.push(e.s); this.live.splice(i, 1); continue; }
      const pulse = Math.sin(Math.PI * k); if (e.wave) e.s.setPosition(e.x + e.dx * e.age, e.y + Math.sin(e.age * 2.1 + e.x) * 1.2).setScale(e.sc * 1.3, e.sc).setAlpha(pulse * 0.34); else if (e.ripple) e.s.setPosition(e.x + e.dx * e.age, e.y).setScale((0.35 + k * 0.95) * e.sc, (0.35 + k * 0.95) * e.sc).setAlpha(pulse * 0.28); else e.s.setPosition(e.x + e.dx * e.age, e.y).setScale(e.sc * (0.5 + pulse * 0.6)).setAlpha(pulse * 0.62); }
  }
  destroy() { for (const e of this.live) e.s.destroy(); for (const s of this.pool) s.destroy(); this.live = []; this.pool = []; }
}
