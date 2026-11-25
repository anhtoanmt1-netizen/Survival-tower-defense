import { GAME_CONFIG } from '../config/gameConfig.js';
import { ensureFarmer, dirFrom, FARMER_ORIGIN_Y } from '../render/farmer.js';
import { PLAYER_DISPLAY } from '../config/art.js';
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
    this.skills = new SkillSet(Object.fromEntries(Object.entries(SKILLS).map(([k, v]) => [k, { ...v, cooldown: Math.round(v.cooldown * skillCdMul) }]))); this.dead = false; this.facingLeft = false; this.dir = 'down'; this.hurtT = 0; this.buildT = 0; this.dieT = 0; this.bob = 0;
    this.key = ensureFarmer(scene, shirt);
    this.shadow = scene.add.image(x * TS, y * TS, 'fx_shadow').setDisplaySize(26, 11).setAlpha(0.55);
    this.sprite = scene.add.sprite(x * TS, y * TS, this.key, 'down_1').setOrigin(0.5, FARMER_ORIGIN_Y).setScale(PLAYER_DISPLAY.scale);
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
  // idle / run: hoạt ảnh theo HƯỚNG (xuống/trái/phải/lên). Đổi hướng hoặc đổi trạng thái mới phát lại; không đổi thì giữ nhịp chân (không giật).
  play(name) { const k = `${name}_${this.dir}`; if (this.anim === k) return; this.anim = k; this.sprite.play(`${this.key}:${k}`, true); }
  face(vx, vy) { const d = dirFrom(vx, vy, this.dir); this.dir = d; this.facingLeft = d === 'left'; }
  hurt() { if (!this.dead) this.hurtT = 0.28; }                       // chớp đỏ ngắn (sheet không có khung bị đánh riêng)
  revive(x, y) { this.dead = false; this.dieT = 0; this.sprite.setAngle(0); this.anim = null; if (x !== undefined) { this.x = x; this.y = y; } }
  // Trả về true nếu sát thương được áp dụng. Có thời gian miễn thương ngắn sau mỗi lần trúng đòn.
  takeDamage(n) {
    if (this.dead || this.invuln > 0 || this.skills.isActive('invincible')) return false;
    this.hp = Math.max(0, this.hp - n); this.invuln = GAME_CONFIG.player.invulnTime;
    if (this.hp === 0) this.die(); else this.hurt();
    return true;
  }
  startBuild() { if (!this.dead) { this.locked = true; this.buildT = 0.9; this.anim = null; this.dir = 'down'; this.play('idle'); } }   // đứng yên + nhún búa (xem update)
  die() { if (this.dead) return; this.dead = true; this.dieT = 0; this.play('idle'); }
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
      if (this.buildT <= 0) {   // đang đóng búa (xây) thì đứng yên
        if (jl > 0.15) { vx = joy.x / jl; vy = joy.y / jl; speed = this.moveSpeed(); moving = true; /* luôn chạy hết tốc độ, rê nhẹ cũng không đi chậm */ }
        if (moving) {
          const s = speed * dt;
          if (!this.collides(this.x + vx * s, this.y)) this.x += vx * s;
          if (!this.collides(this.x, this.y + vy * s)) this.y += vy * s;
          this.face(vx, vy); if (!this.locked) this.play('run');
        } else if (!this.locked) this.play('idle');
      }
    }
    // build: nhún nhẹ như đang đóng búa; die: ngã ra sau rồi mờ dần; hurt: chớp đỏ
    let by = 0, sx = 1, sy = 1; if (this.buildT > 0) { this.buildT -= dt; const ph = Math.sin(this.buildT * 18); by = -Math.max(0, ph) * 2; sy = 1 - Math.max(0, -ph) * 0.05; sx = 1 + Math.max(0, -ph) * 0.04; if (this.buildT <= 0) { this.locked = false; this.anim = null; } }
    if (this.hurtT > 0) this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.dead) { this.dieT += dt; const k = Math.min(1, this.dieT / 0.4); this.sprite.setAngle(80 * k * (this.dir === 'left' ? -1 : 1)); by = 7 * k; } else if (this.sprite.angle) this.sprite.setAngle(0);
    this.sprite.setPosition(Math.round(this.x * TS), Math.round(this.y * TS + by)).setScale(PLAYER_DISPLAY.scale * sx, PLAYER_DISPLAY.scale * sy).setDepth(this.y * TS);
    this.shadow.setPosition(this.sprite.x, Math.round(this.y * TS) - 1).setDepth(this.y * TS - 0.5).setAlpha(this.dead ? 0.3 : 0.55);
    const ph = this.skills.isActive('phase'), iv = this.skills.isActive('invincible');
    this.sprite.setAlpha((ph ? 0.55 : 1) * (this.dead ? 0.85 : 1) * (this.invuln > 0 && !this.dead ? (Math.floor(this.invuln * 12) % 2 ? 0.6 : 1) : 1));
    if (ph) this.sprite.setTint(this.skills.remainingActive('phase') < 1 && Math.floor(this.skills.remainingActive('phase') * 8) % 2 ? 0xffb0b0 : 0x9ad0ff); else if (iv) this.sprite.setTint(0xfff0a0); else this.sprite.clearTint();
    if (this.hurtT > 0 && Math.floor(this.hurtT * 24) % 2 === 0) this.sprite.setTintFill(0xff4040);
    this.aura.setVisible(iv && !this.dead).setPosition(this.sprite.x, this.sprite.y - 18).setScale(1 + 0.08 * Math.sin(this.scene.time.now / 120)).setDepth(this.y * TS - 1);
    this.label.setPosition(this.sprite.x, this.sprite.y - 50).setDepth(1e7);
  }
}
