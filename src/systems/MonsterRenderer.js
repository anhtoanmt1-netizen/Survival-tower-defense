import { ensureSlimes, SLIME_ORIGIN_Y } from '../render/slime.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { FX } from '../config/fx.js';
import { ensureSlimeV2, displayScale, ORIGIN_Y as V2_ORIGIN_Y } from '../render/slimeArtPhaser.js';
const TS = GAME_CONFIG.tileSize;
// Gắn sprite vào Monster. Object Pooling: sprite được tái sử dụng, không tạo/hủy liên tục. Vẽ luôn thanh máu (chỉ khi vừa bị đánh).
export class MonsterRenderer {
  constructor(scene, fx) { this.scene = scene; this.fx = fx; this.pool = []; ensureSlimes(scene); this.bars = scene.add.graphics().setDepth(8.4e5); this.zg = scene.add.graphics().setDepth(8.3e5); }
  acquire(m) {
    const s = this.pool.pop() || this.scene.add.sprite(0, 0, 'slime_green').setOrigin(0.5, SLIME_ORIGIN_Y);
    if (m.v2) { ensureSlimeV2(this.scene, m.cfg.id); s.setOrigin(0.5, V2_ORIGIN_Y).setTexture('slime_' + m.type, 'idle_0').setScale((m.scale ?? m.cfg.scale) * displayScale(m.cfg.id)); }
    else s.setOrigin(0.5, SLIME_ORIGIN_Y).setTexture('slime_' + m.type, 'idle_0').setScale(m.cfg.scale);
    s.setVisible(true).setActive(true).clearTint(); s.anim = null; s.dyingPlayed = false;
    m.view = s; return s;
  }
  release(m) { const s = m.view; if (!s) return; s.setVisible(false).setActive(false).anims.stop(); this.pool.push(s); m.view = null; }
  // Gọi mỗi khung hình; chỉ cập nhật vị trí/animation (các sprite ngoài camera được Phaser bỏ qua khi vẽ)
  sync(monsters, dt = 0, cam = null) {
    const B = FX.bar, g = this.bars, v = cam?.worldView; g.clear();
    this.drawRuntime(this.scene.world?.runtime);
    for (const m of monsters) {
      const s = m.view || this.acquire(m), key = 'slime_' + m.type; if (m.v2 && m.shieldUp) this._shield(g, m);
      s.setPosition(Math.round(m.x * TS), Math.round(m.y * TS)).setDepth(m.y * TS).setFlipX(m.faceLeft);
      if (m.v2 && !m.dying) { const sc = (m.scale ?? m.cfg.scale) * displayScale(m.cfg.id); if (s.scaleX !== sc) s.setScale(sc); } // buff Cuồng nộ / hợp nhất / quái con đổi kích thước theo thời gian
      const want = m.dying ? 'die' : m.state === 'move' ? 'move' : 'idle';
      if (s.anim !== want) { s.anim = want; s.play(`${key}:${want}`, true); }
      if (m.hitFlash > 0 && !m.dying) s.setTintFill(0xffffff);
      else if (m.burnT > 0 && !m.dying) { s.setTint(0xff9a40); if (this.fx && Math.random() < 0.05) this.fx.puff(m.x * TS, m.y * TS - 10, 0xff8a2a, 1, 20, 0.4); }
      else if (m.slowT > 0 && !m.dying) s.setTint(0x8fd0ff);
      else if (m.tint && !m.dying) s.setTint(m.tint);
      else s.clearTint();
      s.setAlpha(m.v2 ? (m.dodged > 0 ? 0.5 : m.alpha ?? 1) : 1); if (m.dodged > 0) m.dodged -= dt;
      if (m.dying || m.barT <= 0) continue;
      const px = m.x * TS, py = m.y * TS; if (v && (px < v.left - 30 || px > v.right + 30 || py < v.top - 40 || py > v.bottom + 30)) continue;
      const ratio = Math.max(0, m.hp / m.maxHp); m.hpShown = Math.max(ratio, m.hpShown - dt * B.trailDrop);
      const w = B.w * (0.8 + m.cfg.scale * 0.2), x = Math.round(px - w / 2), y = Math.round(py - 24 * m.cfg.scale - B.dy), a = Math.min(1, m.barT / B.fade);
      g.fillStyle(0x000000, 0.6 * a).fillRect(x - 1, y - 1, w + 2, B.h + 2);
      g.fillStyle(0xffffff, 0.9 * a).fillRect(x, y, w * m.hpShown, B.h);                               // vệt máu vừa mất (trắng, tụt dần)
      g.fillStyle(ratio > 0.6 ? 0x5fd35a : ratio > 0.3 ? 0xf0c13a : 0xe0463e, a).fillRect(x, y, w * ratio, B.h);
      g.fillStyle(0xffffff, 0.25 * a).fillRect(x, y, w * ratio, 1);
    }
  }
  _shield(g, m) { const r = 16 * (m.scale ?? m.cfg.scale), x = m.x * TS, y = m.y * TS - 10 * (m.scale ?? 1); g.lineStyle(2, 0x9fe8ff, 0.5 + 0.4 * (m.shieldHit > 0 ? 1 : 0)).strokeEllipse(x, y, r * 2.2, r * 1.8); }
  // Vùng kỹ năng (độc/lửa/băng/aura) và đạn kỹ năng: vẽ nhẹ bằng một Graphics dùng chung (không tạo object mỗi khung)
  drawRuntime(rt) {
    const g = this.zg; g.clear(); if (!rt) return; const t = this.scene.time.now / 1000;
    for (const z of rt.zones) { const c = z.def?.vfx?.[0] ?? 0xffffff, col = typeof c === 'number' ? c : 0xff8a2a, a = 0.14 + 0.06 * Math.sin(t * 6); g.fillStyle(col, a).fillEllipse(z.x * TS, z.y * TS, z.r * TS * 2, z.r * TS * 1.5); g.lineStyle(2, col, 0.5).strokeEllipse(z.x * TS, z.y * TS, z.r * TS * 2, z.r * TS * 1.5); }
    for (const q of rt.projs) { g.fillStyle(0xffffff, 0.9).fillCircle(q.x * TS, q.y * TS - 8, 4); g.fillStyle(0xff9a40, 0.5).fillCircle(q.x * TS, q.y * TS - 8, 8); }
  }
}
