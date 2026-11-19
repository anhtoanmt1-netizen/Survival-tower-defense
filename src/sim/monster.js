import { SLIMES, MONSTER_SETTINGS } from '../config/slimes.js';
// Logic quái vật thuần (không phụ thuộc Phaser) để kiểm thử mô phỏng. Quái KHÔNG tấn công tháp, không xuyên vật cản.
export class Monster {
  constructor() { this.view = null; this.alive = false; }
  init(type, x, y, hpMul = 1, speedMul = 1) {
    const c = SLIMES[type]; this.type = type; this.cfg = c; this.x = x; this.y = y; this.r = c.radius;
    this.maxHp = this.hp = c.hp * hpMul; this.speed = c.speed * speedMul; this.slow = 1;
    this.alive = true; this.dying = false; this.dieT = 0; this.attackCd = 0; this.hitFlash = 0; this.state = 'move'; this.vx = 0; this.vy = 0; this.faceLeft = false;
    return this;
  }
  collides(grid, x, y) {
    const r = this.r;
    for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) if (!grid.isWalkable(tx, ty)) return true;
    return false;
  }
  tryMove(grid, dx, dy) {
    if (!this.collides(grid, this.x + dx, this.y)) this.x += dx;
    if (!this.collides(grid, this.x, this.y + dy)) this.y += dy;
  }
  update(dt, field, grid, goal) {
    if (!this.alive) return;
    if (this.dying) { this.dieT -= dt; return; }
    this.attackCd = Math.max(0, this.attackCd - dt); this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.collides(grid, this.x, this.y)) this.unstick(grid, dt);
    const ix = Math.floor(this.x), iy = Math.floor(this.y), W = field.w;
    const d = grid.inBounds(ix, iy) ? field.dist[iy * W + ix] : Infinity;
    this.vx = this.vy = 0;
    if (!(d < Infinity)) { this.state = 'nopath'; return; } // không có đường hợp lệ: đứng yên, tuyệt đối không xuyên vật thể
    this.state = 'move';
    let tx, ty; const n = d < 1.6 ? -1 : field.next(grid, ix, iy);
    if (n >= 0) { tx = (n % W) + 0.5; ty = ((n / W) | 0) + 0.5; } else if (goal) { tx = goal.x; ty = goal.y; } else return;
    const dx = tx - this.x, dy = ty - this.y, dd = Math.hypot(dx, dy); if (dd < 0.04) return;
    const step = Math.min(dd, this.speed * this.slow * dt);
    this.vx = dx / dd; this.vy = dy / dd; this.tryMove(grid, this.vx * step, this.vy * step);
    if (this.vx < -0.1) this.faceLeft = true; else if (this.vx > 0.1) this.faceLeft = false;
  }
  unstick(grid, dt) { // bị kẹt trong ô vừa bị chiếm: đẩy nhẹ về ô trống gần nhất
    let best = null, bd = 1e9, cx = Math.floor(this.x), cy = Math.floor(this.y);
    for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) if (grid.isWalkable(x, y)) { const d = (x + 0.5 - this.x) ** 2 + (y + 0.5 - this.y) ** 2; if (d < bd) { bd = d; best = [x + 0.5, y + 0.5]; } }
    if (!best) return; const dx = best[0] - this.x, dy = best[1] - this.y, dd = Math.hypot(dx, dy) || 1, s = Math.min(dd, 4 * dt);
    this.x += dx / dd * s; this.y += dy / dd * s;
  }
  damage(amount) {
    if (this.dying || !this.alive) return false;
    this.hp -= amount; this.hitFlash = 0.12;
    if (this.hp <= 0) { this.dying = true; this.dieT = MONSTER_SETTINGS.dyingTime; this.state = 'dying'; return true; }
    return false;
  }
}
