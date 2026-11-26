import { GAME_CONFIG } from '../config/gameConfig.js';
import { ensureFarmer, dirFrom, FARMER_ORIGIN_Y, FarmerHair } from '../render/farmer.js';
import { PLAYER_DISPLAY } from '../config/art.js';
const TS = GAME_CONFIG.tileSize;
// Hiển thị người chơi khác từ dữ liệu "gương" (vị trí do server báo, nội suy mượt). Màu áo lấy từ server => đồng nhất mọi máy.
export class RemotePlayer {
  constructor(scene, mp) {
    this.scene = scene; this.mp = mp; this.key = ensureFarmer(scene, mp.color); this.anim = null; this.wasDead = false; this.dir = mp.face ? 'left' : 'right';
    this.shadow = scene.add.image(mp.x * TS, mp.y * TS, 'fx_shadow').setDisplaySize(26, 11).setAlpha(0.55);
    this.sprite = scene.add.sprite(mp.x * TS, mp.y * TS, this.key, 'down_1').setOrigin(0.5, FARMER_ORIGIN_Y).setScale(PLAYER_DISPLAY.scale);
    this.label = scene.add.text(0, 0, mp.name, { fontFamily: 'sans-serif', fontSize: '11px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setResolution(2).setDepth(1e7);
    this.aura = scene.add.ellipse(0, 0, 38, 46, 0xffe066, 0.28).setStrokeStyle(2, 0xffe066, 0.9).setVisible(false);
    this.hair = new FarmerHair(scene); this.play('idle');
  }
  play(n) { const k = `${n}_${this.dir}`; if (this.anim === k) return; this.anim = k; this.sprite.play(`${this.key}:${k}`, true); }
  update() {
    const p = this.mp, moving = Math.hypot(p.tx - p.x, p.ty - p.y) > 0.04;
    if (moving) this.dir = dirFrom(p.tx - p.x, p.ty - p.y, this.dir); else if (p.face !== undefined && this.dir !== 'up' && this.dir !== 'down') this.dir = p.face ? 'left' : 'right';
    if (p.dead) { this.wasDead = true; this.play('idle'); this.sprite.setAngle(80 * (this.dir === 'left' ? -1 : 1)); } else { if (this.wasDead) { this.wasDead = false; this.anim = null; this.sprite.setAngle(0); } this.play(moving ? 'run' : 'idle'); }
    this.sprite.setPosition(Math.round(p.x * TS), Math.round(p.y * TS)).setDepth(p.y * TS).setAlpha(!p.conn ? 0.35 : p.phase ? 0.55 : p.dead ? 0.85 : 1);
    this.shadow.setPosition(this.sprite.x, this.sprite.y - 1).setDepth(p.y * TS - 0.5).setAlpha(p.dead ? 0.3 : 0.55);
    if (p.phase) this.sprite.setTint(0x9ad0ff); else if (p.inv) this.sprite.setTint(0xfff0a0); else this.sprite.clearTint();
    this.aura.setVisible(p.inv && !p.dead).setPosition(this.sprite.x, this.sprite.y - 18).setDepth(p.y * TS - 1);
    this.hair.step(1 / 60, (p.tx - p.x) * 20, (p.ty - p.y) * 20, performance.now() / 1000, moving); this.hair.sync(this.sprite);
    this.label.setText(p.conn ? p.name : p.name + ' (mất kết nối)').setPosition(this.sprite.x, this.sprite.y - 50);
  }
  destroy() { this.hair.destroy(); this.sprite.destroy(); this.shadow.destroy(); this.label.destroy(); this.aura.destroy(); }
}
