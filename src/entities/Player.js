import { GAME_CONFIG } from '../config/gameConfig.js';
import { ensureFarmer, FARMER_ORIGIN_Y } from '../render/farmer.js';
const TS = GAME_CONFIG.tileSize;
// Vị trí (x,y) tính bằng ĐƠN VỊ Ô, là vị trí chân. Va chạm: hộp vuông bán kính `radius` so với Grid.isWalkable
// (cùng quy tắc với A* và sau này là AI quái vật + kiểm tra xây tháp).
export class Player {
  constructor(scene, grid, x, y, { name, shirt }) {
    this.scene = scene; this.grid = grid; this.x = x; this.y = y; this.name = name; this.shirt = shirt;
    this.r = GAME_CONFIG.player.radius; this.maxHp = GAME_CONFIG.player.hp; this.hp = this.maxHp; this.invuln = 0; this.path = null; this.locked = false; this.dead = false; this.facingLeft = false;
    this.key = ensureFarmer(scene, shirt);
    this.sprite = scene.add.sprite(x * TS, y * TS, this.key, 'idle_0').setOrigin(0.5, FARMER_ORIGIN_Y);
    this.label = scene.add.text(0, 0, name, { fontFamily: 'sans-serif', fontSize: '11px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setResolution(2);
    this.anim = null; this.play('idle');
    this.lastX = x; this.lastY = y; this.stuckT = 0;
  }
  tile() { return { x: Math.floor(this.x), y: Math.floor(this.y) }; }
  setPath(p) { this.path = p && p.length ? p : null; this.stuckT = 0; }
  collides(x, y) {
    const r = this.r;
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
    if (this.dead || this.invuln > 0) return false;
    this.hp = Math.max(0, this.hp - n); this.invuln = GAME_CONFIG.player.invulnTime;
    if (this.hp === 0) this.die(); else this.hurt();
    return true;
  }
  startBuild() { if (!this.dead) { this.locked = true; this.anim = 'build'; this.sprite.play(`${this.key}:build`, true); this.scene.time.delayedCall(900, () => { this.locked = false; this.anim = null; }); } }
  die() { if (this.dead) return; this.dead = true; this.path = null; this.playOnce('die'); }
  update(dt, joy) {
    this.invuln = Math.max(0, this.invuln - dt);
    if (!this.dead) {
      let vx = 0, vy = 0, speed = GAME_CONFIG.player.walkSpeed, moving = false;
      const jl = joy ? Math.hypot(joy.x, joy.y) : 0;
      if (!this.locked || this.anim !== 'build') {
        if (jl > 0.15) { this.path = null; const m = Math.min(1, jl); vx = joy.x / jl * m; vy = joy.y / jl * m; speed = m > 0.85 ? GAME_CONFIG.player.runSpeed : GAME_CONFIG.player.walkSpeed * Math.max(0.5, m); moving = true; }
        else if (this.path) {
          const n = this.path[0], dx = n.x + 0.5 - this.x, dy = n.y + 0.5 - this.y, d = Math.hypot(dx, dy);
          if (d < 0.12) { this.path.shift(); if (!this.path.length) this.path = null; } else { vx = dx / d; vy = dy / d; speed = this.path.length > 8 ? GAME_CONFIG.player.runSpeed : GAME_CONFIG.player.walkSpeed; moving = true; }
        }
        if (moving) {
          const ox = this.x, oy = this.y, s = speed * dt;
          if (!this.collides(this.x + vx * s, this.y)) this.x += vx * s;
          if (!this.collides(this.x, this.y + vy * s)) this.y += vy * s;
          if (vx < -0.05) this.facingLeft = true; else if (vx > 0.05) this.facingLeft = false;
          if (this.path) { // kẹt (ví dụ vật cản mới xuất hiện) => hủy đường đi
            this.stuckT = Math.hypot(this.x - ox, this.y - oy) < speed * dt * 0.2 ? this.stuckT + dt : 0;
            if (this.stuckT > 0.4) { this.path = null; this.stuckT = 0; }
          }
          if (!this.locked) this.play(speed > GAME_CONFIG.player.walkSpeed + 0.1 ? 'run' : 'walk');
        } else if (!this.locked) this.play('idle');
      }
    }
    this.sprite.setPosition(Math.round(this.x * TS), Math.round(this.y * TS)).setDepth(this.y * TS).setFlipX(this.facingLeft);
    this.sprite.setAlpha(this.invuln > 0 && !this.dead ? (Math.floor(this.invuln * 12) % 2 ? 0.45 : 1) : 1);
    this.label.setPosition(this.sprite.x, this.sprite.y - 44).setDepth(1e7);
  }
}
