import { Monster } from './monster.js';
import { FlowField } from '../core/flowfield.js';
import { MONSTER_SETTINGS } from '../config/slimes.js';
const REFRESH = 0.2; // giây: giới hạn tần suất tính lại flow field
// Thế giới quái vật: pooling, flow field dùng chung, va chạm giữa quái, tấn công người chơi.
export class MonsterWorld {
  constructor(grid, hooks = {}, rng = Math.random) {
    this.rng = rng;
    this.grid = grid; this.field = new FlowField(grid.width, grid.height); this.hooks = hooks;
    this.monsters = []; this.free = []; this.active = 0; this.kills = 0; this.damageDealt = 0; this.refreshT = 0; this.fieldKey = null;
  }
  spawn(type, x, y, hpMul, speedMul, rewardMul) {
    const m = (this.free.pop() || new Monster()).init(type, x, y, hpMul, speedMul, rewardMul);
    this.monsters.push(m); this.active++; this.hooks.onSpawn?.(m); return m;
  }
  damage(m, amount, opts) {
    if (!m.dying && m.alive) this.damageDealt += Math.max(0, Math.min(amount, m.hp));
    const died = m.damage(amount, opts?.silent); if (!opts?.silent) this.hooks.onHit?.(m);
    if (died) {
      this.active--; this.kills++; this.hooks.onKill?.(m);
      if (m.burnT > 0 && m.spreadChance > 0 && this.rng() < m.spreadChance) { // lửa lan sang slime ở gần
        for (const o of this.monsters) if (o !== m && !o.dying && Math.hypot(o.x - m.x, o.y - m.y) <= m.spreadRadius) this.ignite(o, m);
      }
    }
    return died;
  }
  applySlow(m, pct, dur) { if (m.dying) return; if (pct >= m.slowPct || m.slowT <= 0) m.slowPct = pct; m.slowT = Math.max(m.slowT, dur); }
  // cfg: {burnDps, burnDur, spreadChance, spreadRadius}
  ignite(m, cfg) {
    if (m.dying || !cfg.burnDps) return;
    m.burnDps = Math.max(m.burnT > 0 ? m.burnDps : 0, cfg.burnDps); m.burnT = Math.max(m.burnT, cfg.burnDur); m.burnDur = cfg.burnDur;
    m.spreadChance = cfg.spreadChance || 0; m.spreadRadius = cfg.spreadRadius || 0;
  }
  // players: [{x,y,r,dead,takeDamage(n)->bool}]
  update(dt, players) {
    const events = [], alive = players.filter((p) => !p.dead), grid = this.grid;
    const tiles = alive.map((p) => grid.targetTile(p)).filter(Boolean), key = tiles.map((t) => t.x + ',' + t.y).join('|');
    this.refreshT -= dt;
    if (this.fieldKey === null || (this.refreshT <= 0 && (key !== this.fieldKey || this.field.gridVersion !== grid.version))) {
      this.field.compute(grid, tiles); this.fieldKey = key; this.refreshT = REFRESH;
    }
    for (const m of this.monsters.slice()) { // hiệu ứng trạng thái: làm chậm, cháy
      if (m.dying) continue;
      if (m.slowT > 0) { m.slowT -= dt; if (m.slowT <= 0) { m.slowT = 0; m.slowPct = 0; } }
      m.slow = 1 - m.slowPct;
      if (m.burnT > 0) { m.burnT -= dt; m.burnAcc += m.burnDps * dt; if (m.burnAcc >= 1) { const d = Math.floor(m.burnAcc); m.burnAcc -= d; this.damage(m, d, { silent: true }); } if (m.burnT <= 0) { m.burnT = 0; m.burnAcc = 0; } }
    }
    for (const m of this.monsters) {
      if (m.dying) { m.update(dt, this.field, grid); continue; }
      let goal = null, bd = Infinity;
      for (const p of alive) { const d = (p.x - m.x) ** 2 + (p.y - m.y) ** 2; if (d < bd) { bd = d; goal = p; } }
      m.update(dt, this.field, grid, goal);
    }
    this.separate();
    for (const m of this.monsters) {
      if (m.dying || m.attackCd > 0) continue;
      for (const p of alive) {
        if (Math.hypot(p.x - m.x, p.y - m.y) < m.r + (p.r ?? 0.3) + 0.12) {
          m.attackCd = m.cfg.attackCooldown;
          if (p.takeDamage(MONSTER_SETTINGS.contactDamage)) events.push({ type: 'hit', monster: m, player: p });
          break;
        }
      }
    }
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i]; if (m.dying && m.dieT <= 0) { m.alive = false; this.monsters.splice(i, 1); this.free.push(m); this.hooks.onFree?.(m); }
    }
    return events;
  }
  separate() { // đẩy nhẹ các slime chồng nhau (băm theo ô). Vẫn qua kiểm tra va chạm địa hình.
    const ms = this.monsters, buckets = new Map(), s = MONSTER_SETTINGS.separation;
    for (const m of ms) { if (m.dying) continue; const k = Math.floor(m.x) * 4096 + Math.floor(m.y); (buckets.get(k) || buckets.set(k, []).get(k)).push(m); }
    for (const a of ms) {
      if (a.dying) continue; const cx = Math.floor(a.x), cy = Math.floor(a.y);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const list = buckets.get((cx + dx) * 4096 + cy + dy); if (!list) continue;
        for (const b of list) {
          if (b === a) continue; const ex = a.x - b.x, ey = a.y - b.y, d = Math.hypot(ex, ey), min = (a.r + b.r) * s;
          if (d < min) { const push = (min - d) * 0.25, ux = d > 1e-4 ? ex / d : 1, uy = d > 1e-4 ? ey / d : 0; a.tryMove(this.grid, ux * push, uy * push); }
        }
      }
    }
  }
}
