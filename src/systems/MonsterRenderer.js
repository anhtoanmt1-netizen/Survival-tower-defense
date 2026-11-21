import { ensureSlimes, SLIME_ORIGIN_Y } from '../render/slime.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { FX } from '../config/fx.js';
const TS = GAME_CONFIG.tileSize;
// Gắn sprite vào Monster. Object Pooling: sprite được tái sử dụng, không tạo/hủy liên tục. Vẽ luôn thanh máu (chỉ khi vừa bị đánh).
export class MonsterRenderer {
  constructor(scene, fx) { this.scene = scene; this.fx = fx; this.pool = []; ensureSlimes(scene); this.bars = scene.add.graphics().setDepth(8.4e5); }
  acquire(m) {
    const s = this.pool.pop() || this.scene.add.sprite(0, 0, 'slime_green').setOrigin(0.5, SLIME_ORIGIN_Y);
    s.setTexture('slime_' + m.type, 'idle_0').setVisible(true).setActive(true).setScale(m.cfg.scale).clearTint(); s.anim = null; s.dyingPlayed = false;
    m.view = s; return s;
  }
  release(m) { const s = m.view; if (!s) return; s.setVisible(false).setActive(false).anims.stop(); this.pool.push(s); m.view = null; }
  // Gọi mỗi khung hình; chỉ cập nhật vị trí/animation (các sprite ngoài camera được Phaser bỏ qua khi vẽ)
  sync(monsters, dt = 0, cam = null) {
    const B = FX.bar, g = this.bars, v = cam?.worldView; g.clear();
    for (const m of monsters) {
      const s = m.view || this.acquire(m), key = 'slime_' + m.type;
      s.setPosition(Math.round(m.x * TS), Math.round(m.y * TS)).setDepth(m.y * TS).setFlipX(m.faceLeft);
      const want = m.dying ? 'die' : m.state === 'move' ? 'move' : 'idle';
      if (s.anim !== want) { s.anim = want; s.play(`${key}:${want}`, true); }
      if (m.hitFlash > 0 && !m.dying) s.setTintFill(0xffffff);
      else if (m.burnT > 0 && !m.dying) { s.setTint(0xff9a40); if (this.fx && Math.random() < 0.05) this.fx.puff(m.x * TS, m.y * TS - 10, 0xff8a2a, 1, 20, 0.4); }
      else if (m.slowT > 0 && !m.dying) s.setTint(0x8fd0ff);
      else s.clearTint();
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
}
