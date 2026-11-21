import { GAME_CONFIG } from '../config/gameConfig.js';
import { ensureFarmer, FARMER_ORIGIN_Y } from '../render/farmer.js';
import { SkillSet } from '../sim/skills.js';
import { SPEED_UPGRADE, SKILLS } from '../config/skills.js';
import { FONT } from '../config/ui.js';
const TS = GAME_CONFIG.tileSize;
// Vị trí (x,y) tính bằng ĐƠN VỊ Ô, là vị trí chân. Va chạm: hộp vuông bán kính `radius` so với Grid.isWalkable
// (cùng quy tắc với A* và sau này là AI quái vật + kiểm tra xây tháp).
export class Player {
  constructor(scene, grid, x, y, { name, shirt, hp = GAME_CONFIG.player.hp, skillCdMul = 1 }) {
    this.scene = scene; this.grid = grid; this.x = x; this.y = y; this.name = name; this.shirt = shirt;
    this.r = GAME_CONFIG.player.radius; this.maxHp = hp; this.hp = hp; this.invuln = 0; this.speedLevel = 0; this.onPhaseEnd = null; this.locked = false;
    this.skills = new SkillSet(Object.fromEntries(Object.entries(SKILLS).map(([k, v]) => [k, { ...v, cooldown: Math.round(v.cooldown * skillCdMul) }]))); this.dead = false; this.facingLeft = false;
    this.key = ensureFarmer(scene, shirt);
    this.sprite = scene.add.sprite(x * TS, y * TS, this.key, 'idle_0').setOrigin(0.5, FARMER_ORIGIN_Y);
    this.label = scene.add.text(0, 0, name, { fontFamily: FONT, fontSize: '11px', fontStyle: '600', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setResolution(2);
    this.aura = scene.add.ellipse(0, 0, 38, 46, 0xffe066, 0.28).setStrokeStyle(2, 0xffe066, 0.9).setVisible(false);
    this.anim = null; this.play('idle');
    this.lastX = x; this.lastY = y;
  }
  tile() { return { x: Math.floor(this.x), y: Math.floor(this.y) }; }
  moveSpeed() { return GAME_CONFIG.player.runSpeed * (1 + SPEED_UPGRADE.perLevel * this.speedLevel); }
  useSkill(k) { return !this.dead && this.skills.use(k); }
  collides(x, y) {
    const r = this.r;
    if (this.skills.isActive('phase')) return x - r < 0 || y - r < 0 || x + r > this.grid.width || y + r > this.grid.height; // xuyên vật thể nhưng không ra ngoài bản đồ
    for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) if (!this.grid.isWalkable(tx, ty)) return true;
    return false;
  }
  play(name) { if (this.anim === name) return; this.anim = name; this.sprite.play(`${this.key}:${name}`, true); }
  playOnce(name) { // build / hurt / die: khóa animation tới khi xong (die giữ nguyên khung cuối)
    this.locked = true; this.anim = name; this.sprite.play(`${this.key}:${name}`, true);
    if (name !== 'die') this.sprite.once('animationcomplete', () => { this.locked = false; this.anim = null; });
  }
  hurt() { if (!this.dead) this.playOnce('hurt'); }
  // Trả về true nếu sát thương được áp dụng. Có thời gian miễn thương ngắn sau mỗi lần trúng đòn.
  takeDamage(n) {
    if (this.dead || this.invuln > 0 || this.skills.isActive('invincible')) return false;
    this.hp = Math.max(0, this.hp - n); this.invuln = GAME_CONFIG.player.invulnTime;
    if (this.hp === 0) this.die(); else this.hurt();
    return true;
  }
  startBuild() { if (!this.dead) { this.locked = true; this.anim = 'build'; this.sprite.play(`${this.key}:build`, true); this.scene.time.delayedCall(900, () => { this.locked = false; this.anim = null; }); } }
  die() { if (this.dead) return; this.dead = true; this.playOnce('die'); }
  // Hết xuyên vật thể: nếu đang nằm trong vật cản thì đưa về ô đi được gần nhất (không bao giờ kẹt trong vật cản)
  settleAfterPhase() {
    if (!this.collides(this.x, this.y)) return;
    const n = this.grid.nearestWalkable(Math.floor(this.x), Math.floor(this.y), 20); if (!n) return;
    this.x = n.x + 0.5; this.y = n.y + 0.5; this.onPhaseEnd?.(this);
  }
  update(dt, joy) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.skills.update(dt, (k) => { if (k === 'phase') this.settleAfterPhase(); });
    if (!this.dead) {
      let vx = 0, vy = 0, speed = GAME_CONFIG.player.walkSpeed, moving = false;
      const jl = joy ? Math.hypot(joy.x, joy.y) : 0; // chỉ di chuyển bằng joystick / WASD (đã bỏ chạm màn hình để đi)
      if (!this.locked || this.anim !== 'build') {
        if (jl > 0.15) { vx = joy.x / jl; vy = joy.y / jl; speed = this.moveSpeed(); moving = true; /* luôn chạy hết tốc độ, rê nhẹ cũng không đi chậm */ }
        if (moving) {
          const s = speed * dt;
          if (!this.collides(this.x + vx * s, this.y)) this.x += vx * s;
          if (!this.collides(this.x, this.y + vy * s)) this.y += vy * s;
          if (vx < -0.05) this.facingLeft = true; else if (vx > 0.05) this.facingLeft = false;
          if (!this.locked) this.play('run');
        } else if (!this.locked) this.play('idle');
      }
    }
    this.sprite.setPosition(Math.round(this.x * TS), Math.round(this.y * TS)).setDepth(this.y * TS).setFlipX(this.facingLeft);
    const ph = this.skills.isActive('phase'), iv = this.skills.isActive('invincible');
    this.sprite.setAlpha((ph ? 0.55 : 1) * (this.invuln > 0 && !this.dead ? (Math.floor(this.invuln * 12) % 2 ? 0.6 : 1) : 1));
    if (ph) this.sprite.setTint(this.skills.remainingActive('phase') < 1 && Math.floor(this.skills.remainingActive('phase') * 8) % 2 ? 0xffb0b0 : 0x9ad0ff); else if (iv) this.sprite.setTint(0xfff0a0); else this.sprite.clearTint();
    this.aura.setVisible(iv && !this.dead).setPosition(this.sprite.x, this.sprite.y - 18).setScale(1 + 0.08 * Math.sin(this.scene.time.now / 120)).setDepth(this.y * TS - 1);
    this.label.setPosition(this.sprite.x, this.sprite.y - 44).setDepth(1e7);
  }
}
