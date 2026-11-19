import { ensureSlimes, SLIME_ORIGIN_Y } from '../render/slime.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
const TS = GAME_CONFIG.tileSize;
// Gắn sprite vào Monster. Object Pooling: sprite được tái sử dụng, không tạo/hủy liên tục.
export class MonsterRenderer {
  constructor(scene) { this.scene = scene; this.pool = []; ensureSlimes(scene); }
  acquire(m) {
    const s = this.pool.pop() || this.scene.add.sprite(0, 0, 'slime_green').setOrigin(0.5, SLIME_ORIGIN_Y);
    s.setTexture('slime_' + m.type, 'idle_0').setVisible(true).setActive(true).setScale(m.cfg.scale).clearTint(); s.anim = null; s.dyingPlayed = false;
    m.view = s; return s;
  }
  release(m) { const s = m.view; if (!s) return; s.setVisible(false).setActive(false).anims.stop(); this.pool.push(s); m.view = null; }
  // Gọi mỗi khung hình; chỉ cập nhật vị trí/animation (các sprite ngoài camera được Phaser bỏ qua khi vẽ)
  sync(monsters) {
    for (const m of monsters) {
      const s = m.view || this.acquire(m), key = 'slime_' + m.type;
      s.setPosition(Math.round(m.x * TS), Math.round(m.y * TS)).setDepth(m.y * TS).setFlipX(m.faceLeft);
      const want = m.dying ? 'die' : m.state === 'move' ? 'move' : 'idle';
      if (s.anim !== want) { s.anim = want; s.play(`${key}:${want}`, true); }
      if (m.hitFlash > 0 && !m.dying) s.setTintFill(0xffffff); else s.clearTint();
    }
  }
}
