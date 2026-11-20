import { GAME_CONFIG } from '../config/gameConfig.js';
import { ensureFarmer, FARMER_ORIGIN_Y } from '../render/farmer.js';
const TS = GAME_CONFIG.tileSize;
// Hiển thị người chơi khác từ dữ liệu "gương" (vị trí do server báo, nội suy mượt). Màu áo lấy từ server => đồng nhất mọi máy.
export class RemotePlayer {
  constructor(scene, mp) {
    this.scene = scene; this.mp = mp; this.key = ensureFarmer(scene, mp.color); this.anim = null; this.wasDead = false;
    this.sprite = scene.add.sprite(mp.x * TS, mp.y * TS, this.key, 'idle_0').setOrigin(0.5, FARMER_ORIGIN_Y);
    this.label = scene.add.text(0, 0, mp.name, { fontFamily: 'sans-serif', fontSize: '11px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setResolution(2).setDepth(1e7);
    this.aura = scene.add.ellipse(0, 0, 38, 46, 0xffe066, 0.28).setStrokeStyle(2, 0xffe066, 0.9).setVisible(false);
    this.play('idle');
  }
  play(n, once) { if (this.anim === n) return; this.anim = n; this.sprite.play(`${this.key}:${n}`, true); }
  update() {
    const p = this.mp, moving = Math.hypot(p.tx - p.x, p.ty - p.y) > 0.04;
    if (p.dead) { this.play('die'); this.wasDead = true; } else { if (this.wasDead) { this.wasDead = false; this.anim = null; } this.play(moving ? 'run' : 'idle'); }
    this.sprite.setPosition(Math.round(p.x * TS), Math.round(p.y * TS)).setDepth(p.y * TS).setFlipX(!!p.face).setAlpha(!p.conn ? 0.35 : p.phase ? 0.55 : 1);
    if (p.phase) this.sprite.setTint(0x9ad0ff); else if (p.inv) this.sprite.setTint(0xfff0a0); else this.sprite.clearTint();
    this.aura.setVisible(p.inv && !p.dead).setPosition(this.sprite.x, this.sprite.y - 18).setDepth(p.y * TS - 1);
    this.label.setText(p.conn ? p.name : p.name + ' (mất kết nối)').setPosition(this.sprite.x, this.sprite.y - 44);
  }
  destroy() { this.sprite.destroy(); this.label.destroy(); this.aura.destroy(); }
}
