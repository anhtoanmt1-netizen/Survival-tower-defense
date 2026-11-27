import { GAME_CONFIG } from '../config/gameConfig.js';
import { ensureFarmer, dirFrom, FARMER_ORIGIN_Y, FARMER_ANIMS, FarmerHair } from '../render/farmer.js';
import { DashSkill, moveWithCollision } from '../sim/dash.js';
import { perf } from '../systems/Perf.js';
import { PLAYER_DISPLAY } from '../config/art.js';
import { SkillSet } from '../sim/skills.js';
import { SPEED_UPGRADE, SKILLS } from '../config/skills.js';
import { FONT } from '../config/ui.js';
const TS = GAME_CONFIG.tileSize, RUN_FRAMES = [1, 0, 1, 2], DIR_VEC = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
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
    this.hair = new FarmerHair(scene); this.dash = new DashSkill(undefined, { cdMul: skillCdMul }); this.timeScale = 1; this.t = 0; this.vx = 0; this.vy = 0; this.hairAcc = 0; this.hairN = 0;
    this.onStep = null; this.onDashStart = null; this.onDashTick = null; this.onDashEnd = null; this.onDashReady = null; this.state = 'idle'; this.animT = 0; this.frame = 1; this.lastIdx = 0; this.lastJoy = null;
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
  // Hoạt ảnh do Player tự điều khiển (không dùng bộ hẹn giờ của Phaser) để BƯỚC CHÂN khớp tuyệt đối với khung hình: mỗi lần bàn chân chạm đất (khung 0 và 2 của chu kỳ chạy) phát onStep.
  play(name) { if (name === this.state) return; this.state = name; if (name === 'idle') { this.animT = 0; this.frame = 1; this.lastIdx = 0; } }
  advanceAnim(dt) {
    if (this.state !== 'run') { this.frame = 1; return; }
    this.animT += dt * FARMER_ANIMS.run.rate * this.timeScale; const idx = Math.floor(this.animT) % 4, f = RUN_FRAMES[idx];
    if (idx !== this.lastIdx) { this.lastIdx = idx; this.frame = f; if (f !== 1 && !this.dead) this.onStep?.(f === 0 ? 0 : 1, this); } else this.frame = f;
  }
  // Dash: hướng = vector điều khiển hiện tại, nếu đang đứng yên thì theo hướng nhìn. Trả về { ok, reason }.
  tryDash(joy) {
    if (this.dead || this.locked || this.buildT > 0) return { ok: false, reason: 'busy' }; if (!this.dash.can()) return { ok: false, reason: 'cooldown' };
    const jl = joy ? Math.hypot(joy.x, joy.y) : 0, [fx, fy] = DIR_VEC[this.dir] || DIR_VEC.down, dx = jl > 0.15 ? joy.x / jl : fx, dy = jl > 0.15 ? joy.y / jl : fy;
    const probe = moveWithCollision((x, y) => this.collides(x, y), this.x, this.y, dx * 0.6, dy * 0.6); if (probe.moved < 0.3) return { ok: false, reason: 'blocked' }; // sát vật cản: không tiêu hồi chiêu vô ích
    if (!this.dash.start(dx, dy)) return { ok: false, reason: 'cooldown' }; this.face(dx, dy); this.play('run'); this.onDashStart?.(this, dx, dy); return { ok: true };
  }
  face(vx, vy) { const d = dirFrom(vx, vy, this.dir); this.dir = d; this.facingLeft = d === 'left'; }
  hurt() { if (!this.dead) this.hurtT = 0.28; }                       // chớp đỏ ngắn (sheet không có khung bị đánh riêng)
  revive(x, y) { this.dead = false; this.dieT = 0; this.sprite.setAngle(0); this.anim = null; this.state = ''; this.dash.cancel(); if (x !== undefined) { this.x = x; this.y = y; } }
  // Trả về true nếu sát thương được áp dụng. Có thời gian miễn thương ngắn sau mỗi lần trúng đòn.
  takeDamage(n) {
    if (this.dead || this.invuln > 0 || this.skills.isActive('invincible')) return false;
    this.hp = Math.max(0, this.hp - n); this.invuln = GAME_CONFIG.player.invulnTime;
    if (this.hp === 0) this.die(); else this.hurt();
    return true;
  }
  startBuild() { if (!this.dead) { this.locked = true; this.buildT = 0.9; this.anim = null; this.dir = 'down'; this.dash.cancel(); this.state = ''; this.play('idle'); } }   // đứng yên + nhún búa (xem update)
  die() { if (this.dead) return; this.dead = true; this.dieT = 0; this.dash.cancel(); this.play('idle'); }
  // Hết xuyên vật thể: nếu đang nằm trong vật cản thì đưa về ô đi được gần nhất (không bao giờ kẹt trong vật cản)
  settleAfterPhase() {
    if (!this.collides(this.x, this.y)) return;
    const n = this.grid.nearestWalkable(Math.floor(this.x), Math.floor(this.y), 20); if (!n) return;
    this.x = n.x + 0.5; this.y = n.y + 0.5; this.onPhaseEnd?.(this);
  }
  update(dt, joy) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.skills.update(dt, (k) => { if (k === 'phase') this.settleAfterPhase(); });
    const dashWasCd = this.dash.cd > 0; this.dash.update(dt, () => this.onDashEnd?.(this)); if (dashWasCd && this.dash.cd <= 0 && !this.dead) this.onDashReady?.(this);
    this.t += dt; let mvx = 0, mvy = 0;
    if (!this.dead && this.dash.active) { // đang lướt: chuyển động do Dash điều khiển (bỏ qua joystick), vẫn va chạm đầy đủ với địa hình
      const d = this.dash, r = moveWithCollision((x, y) => this.collides(x, y), this.x, this.y, d.dx * d.speed * dt, d.dy * d.speed * dt);
      mvx = (r.x - this.x) / (dt || 1); mvy = (r.y - this.y) / (dt || 1); this.x = r.x; this.y = r.y; this.play('run'); this.onDashTick?.(this, dt);
      if (r.blocked && r.moved < d.speed * dt * 0.25) d.cancel(); // chạm tường: dừng lướt ngay, không "ép" xuyên vật
    } else if (!this.dead) {
      let vx = 0, vy = 0, speed = GAME_CONFIG.player.walkSpeed, moving = false;
      const jl = joy ? Math.hypot(joy.x, joy.y) : 0; // chỉ di chuyển bằng joystick / WASD (đã bỏ chạm màn hình để đi)
      if (this.buildT <= 0) {   // đang đóng búa (xây) thì đứng yên
        if (jl > 0.05) { vx = joy.x / jl; vy = joy.y / jl; speed = this.moveSpeed(); moving = true; /* luôn chạy hết tốc độ, rê nhẹ cũng không đi chậm */ }
        if (moving) {
          const s = speed * dt;
          const ox = this.x, oy = this.y;
          if (!this.collides(this.x + vx * s, this.y)) this.x += vx * s;
          if (!this.collides(this.x, this.y + vy * s)) this.y += vy * s;
          if (dt > 0) { mvx = (this.x - ox) / dt; mvy = (this.y - oy) / dt; }
          this.face(vx, vy); if (!this.locked) this.play('run');
        } else if (!this.locked) this.play('idle');
      }
    }
    // build: nhún nhẹ như đang đóng búa; die: ngã ra sau rồi mờ dần; hurt: chớp đỏ
    let by = 0, sx = 1, sy = 1; if (this.buildT > 0) { this.buildT -= dt; const ph = Math.sin(this.buildT * 18); by = -Math.max(0, ph) * 2; sy = 1 - Math.max(0, -ph) * 0.05; sx = 1 + Math.max(0, -ph) * 0.04; if (this.buildT <= 0) { this.locked = false; this.anim = null; } }
    if (this.hurtT > 0) this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.dead) { this.dieT += dt; const k = Math.min(1, this.dieT / 0.4); this.sprite.setAngle(80 * k * (this.dir === 'left' ? -1 : 1)); by = 7 * k; } else if (this.sprite.angle) this.sprite.setAngle(0);
    this.advanceAnim(dt); this.sprite.setFrame(`${this.dir}_${this.frame}`); this.vx = mvx; this.vy = mvy; this.lastJoy = joy;
    this.sprite.setPosition(this.x * TS, this.y * TS + by).setScale(PLAYER_DISPLAY.scale * sx, PLAYER_DISPLAY.scale * sy).setDepth(this.y * TS);
    this.shadow.setPosition(this.sprite.x, this.y * TS - 1).setDepth(this.y * TS - 0.5).setAlpha(this.dead ? 0.3 : 0.55);
    const ph = this.skills.isActive('phase'), iv = this.skills.isActive('invincible');
    this.sprite.setAlpha((ph ? 0.55 : 1) * (this.dead ? 0.85 : 1) * (this.invuln > 0 && !this.dead ? (Math.floor(this.invuln * 12) % 2 ? 0.6 : 1) : 1));
    if (ph) this.sprite.setTint(this.skills.remainingActive('phase') < 1 && Math.floor(this.skills.remainingActive('phase') * 8) % 2 ? 0xffb0b0 : 0x9ad0ff); else if (iv) this.sprite.setTint(0xfff0a0); else this.sprite.clearTint();
    if (this.hurtT > 0 && Math.floor(this.hurtT * 24) % 2 === 0) this.sprite.setTintFill(0xff4040);
    this.aura.setVisible(iv && !this.dead).setPosition(this.sprite.x, this.sprite.y - 18).setScale(1 + 0.08 * Math.sin(this.scene.time.now / 120)).setDepth(this.y * TS - 1);
    this.label.setPosition(this.sprite.x, this.sprite.y - 50).setDepth(1e7);
    // tóc: lò xo cập nhật theo nhịp của chế độ hiệu năng (dt được cộng dồn nên chuyển động vẫn đúng tốc độ); đồng bộ khung/vị trí mỗi khung vì rất rẻ
    this.hairAcc += dt; if (++this.hairN >= perf.p.hairStride || dt === 0) { this.hair.step(this.hairAcc, this.vx, this.vy, this.t, this.state === 'run'); this.hairAcc = 0; this.hairN = 0; } this.hair.sync(this.sprite);
  }
}
