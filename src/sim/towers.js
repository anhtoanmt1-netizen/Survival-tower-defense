import { TOWER_TYPES, BRANCHES, computeStats, pendingPicks } from '../config/towers.js';
import { ECON, upgradeCost } from '../config/economy.js';
import { FlowField } from '../core/flowfield.js';
import { isBuildableTerrain } from '../map/tiles.js';
export const MSG = {
  blocked: 'KHÔNG THỂ XÂY THÁP - ĐƯỜNG DI CHUYỂN CỦA QUÁI VẬT BỊ CHẶN.',
  terrain: 'Không thể xây ở ô này.', bounds: 'Ngoài bản đồ.', occupied: 'Ô này đã có tháp.', player: 'Có nhân vật đang đứng ở ô này.',
  gold: 'Không đủ vàng.', noPlayers: 'Không có người chơi còn sống.',
};
const fail = (reason, message) => ({ ok: false, reason, message: message || MSG[reason] });
// Hệ thống tháp thuần (không phụ thuộc Phaser): xây, nâng cấp, nhánh kỹ năng, bán, nhắm bắn, mũi tên.
export class TowerSystem {
  constructor({ grid, world, economy, gates, hooks = {}, rng = Math.random }) {
    Object.assign(this, { grid, world, economy, gates, hooks, rng }); this.towers = []; this.projectiles = []; this.pool = []; this.nextId = 1;
    this.scratch = new FlowField(grid.width, grid.height); this.stats = { built: 0, damage: 0 };
  }
  buildCost() { return Math.round(ECON.buildCost * (1 + ECON.buildCostGrowth * this.towers.length)); }
  towerAt(x, y) { return this.towers.find((t) => t.x === x && t.y === y) || null; }
  // Ô x,y có chặn hết đường từ MỌI cổng đang hoạt động tới người chơi còn sống không? Cùng FlowField + isWalkable với AI quái vật.
  pathsOkWith(x, y, players) {
    const g = this.grid, i = y * g.width + x, prev = g.extra[i]; g.extra[i] = 1; // tạm đặt, KHÔNG tăng version, luôn hoàn lại
    try {
      const targets = players.filter((p) => !p.dead).map((p) => ({ x: Math.floor(p.x), y: Math.floor(p.y) }));
      if (!targets.length) return false;
      this.scratch.compute(g, targets);
      for (const gate of this.gates) {
        let ok = false;
        for (let dy = -2; dy <= 2 && !ok; dy++) for (let dx = -2; dx <= 2; dx++) { const gx = gate.x + dx, gy = gate.y + dy; if (g.isWalkable(gx, gy) && this.scratch.dist[gy * g.width + gx] < Infinity) { ok = true; break; } }
        if (!ok) return false;
      }
      return true;
    } finally { g.extra[i] = prev; }
  }
  checkPlacement(x, y, players, { ignoreGold = false } = {}) {
    const g = this.grid;
    if (!g.inBounds(x, y)) return fail('bounds');
    if (this.towerAt(x, y) || g.extra[y * g.width + x]) return fail('occupied');
    if (!isBuildableTerrain(g.tile(x, y))) return fail('terrain');
    for (const p of players) if (!p.dead) { const r = p.r ?? 0.3; if (p.x + r > x && p.x - r < x + 1 && p.y + r > y && p.y - r < y + 1) return fail('player'); }
    if (!this.pathsOkWith(x, y, players)) return fail('blocked');
    if (!ignoreGold && this.economy.gold < this.buildCost()) return fail('gold', `Không đủ vàng (cần ${this.buildCost()}).`);
    return { ok: true, cost: this.buildCost() };
  }
  build(x, y, players, type = 'archer') {
    const c = this.checkPlacement(x, y, players); if (!c.ok) return c;
    if (!this.economy.spend(c.cost)) return fail('gold');
    const t = { id: this.nextId++, type, x, y, level: 1, picks: [], invested: c.cost, state: 'building', buildT: ECON.buildTime, cd: 0, angle: 0, kills: 0 };
    this.refresh(t); this.towers.push(t); this.grid.setBlocked(x, y, true); this.stats.built++; this.hooks.onBuildStart?.(t);
    return { ok: true, tower: t };
  }
  refresh(t) { t.stats = computeStats(t.type, t.level, t.picks); t.pending = pendingPicks(t.type, t.level, t.picks); }
  upgradeInfo(t) {
    const max = TOWER_TYPES[t.type].maxLevel;
    if (t.level >= max) return { ok: false, reason: 'max', message: 'Đã tối đa.' };
    if (t.pending > 0) return { ok: false, reason: 'pick', message: 'Hãy chọn nhánh kỹ năng trước.' };
    const cost = upgradeCost(t.level); return { ok: true, cost, before: t.stats, after: computeStats(t.type, t.level + 1, t.picks), nextIsMilestone: TOWER_TYPES[t.type].milestones.includes(t.level + 1) };
  }
  upgrade(t) {
    if (t.state !== 'ready') return fail('building', 'Tháp đang xây.');
    const i = this.upgradeInfo(t); if (!i.ok) return i;
    if (!this.economy.spend(i.cost)) return fail('gold', `Không đủ vàng (cần ${i.cost}).`);
    t.level++; t.invested += i.cost; this.refresh(t); this.hooks.onChanged?.(t); return { ok: true, tower: t };
  }
  pickBranch(t, branch) {
    if (!BRANCHES[branch]) return fail('branch', 'Nhánh không tồn tại.');
    if (t.pending <= 0) return fail('nopick', 'Chưa tới mốc chọn nhánh.');
    if ((t.stats.tiers[branch] ?? -1) + 1 >= BRANCHES[branch].tiers.length) return fail('full', 'Nhánh này đã đạt tối đa.');
    t.picks.push(branch); this.refresh(t); this.hooks.onChanged?.(t); return { ok: true };
  }
  resetPicks(t) { // chọn lại nhánh phải trả phí
    if (!t.picks.length) return fail('nopicks', 'Chưa chọn nhánh nào.');
    if (!this.economy.spend(ECON.resetBranchCost)) return fail('gold', `Không đủ vàng (cần ${ECON.resetBranchCost}).`);
    t.picks = []; this.refresh(t); this.hooks.onChanged?.(t); return { ok: true };
  }
  sellValue(t) { return Math.floor(t.invested * ECON.sellRefund); }
  sell(t) {
    const i = this.towers.indexOf(t); if (i < 0) return fail('gone', 'Tháp không còn.');
    const v = this.sellValue(t); this.towers.splice(i, 1); this.grid.setBlocked(t.x, t.y, false); this.economy.add(v); this.hooks.onSold?.(t); return { ok: true, refund: v };
  }
  update(dt) {
    const ms = this.world.monsters;
    for (const t of this.towers) {
      if (t.state === 'building') { t.buildT -= dt; if (t.buildT <= 0) { t.state = 'ready'; this.hooks.onBuilt?.(t); } continue; }
      const s = t.stats, cx = t.x + 0.5, cy = t.y + 0.5; t.cd -= dt;
      const near = []; for (const m of ms) if (!m.dying) { const d = Math.hypot(m.x - cx, m.y - cy); if (d <= s.range) near.push([d, m]); }
      if (!near.length) continue; near.sort((a, b) => a[0] - b[0]);
      const tgt = near[0][1]; t.angle = Math.atan2(tgt.y - cy, tgt.x - cx);
      if (t.cd <= 0) {
        t.cd = 1 / s.fireRate; const n = s.arrows;
        for (let k = 0; k < n; k++) this.shoot(t, near[k % near.length][1], (k - (n - 1) / 2) * s.fanAngle);
        this.hooks.onShoot?.(t);
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i], tg = p.target;
      if (tg && tg.alive && !tg.dying) { p.tx = tg.x; p.ty = tg.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), sp = p.speed;
      const k = Math.min(1, dt * 9); p.vx += ((dx / (d || 1)) * sp - p.vx) * k; p.vy += ((dy / (d || 1)) * sp - p.vy) * k;
      const step = sp * dt; p.age += dt;
      if (d <= step + 0.18 || p.age > 3) { this.hit(p); this.projectiles.splice(i, 1); this.pool.push(p); this.hooks.onProjFree?.(p); continue; }
      const vl = Math.hypot(p.vx, p.vy) || 1; p.x += (p.vx / vl) * step; p.y += (p.vy / vl) * step;
    }
  }
  shoot(t, target, offset) {
    const s = t.stats, p = this.pool.pop() || {}, a = Math.atan2(target.y - (t.y + 0.5), target.x - (t.x + 0.5)) + offset, crit = this.rng() < s.critChance;
    Object.assign(p, { x: t.x + 0.5, y: t.y + 0.3, vx: Math.cos(a) * s.arrowSpeed, vy: Math.sin(a) * s.arrowSpeed, speed: s.arrowSpeed, target, tx: target.x, ty: target.y, age: 0, crit, tower: t, view: null,
      dmg: s.damage * (crit ? s.critMult : 1), kind: s.kind,
      slow: s.slowPct ? { pct: s.slowPct, dur: s.slowDur, radius: s.slowRadius } : null,
      burn: s.burnDps ? { burnDps: s.burnDps, burnDur: s.burnDur, spreadChance: s.spreadChance, spreadRadius: s.spreadRadius } : null });
    this.projectiles.push(p); this.hooks.onProjSpawn?.(p);
  }
  hit(p) {
    const m = p.target; if (!m || !m.alive || m.dying) return; const w = this.world;
    this.stats.damage += Math.min(p.dmg, m.hp); const hpBefore = m.hp;
    if (w.damage(m, p.dmg) && p.tower) p.tower.kills++;
    if (hpBefore > 0 && !m.dying) { // đòn không giết chết mới áp hiệu ứng
      if (p.slow) for (const o of w.monsters) if (!o.dying && (o === m || (p.slow.radius > 0 && Math.hypot(o.x - m.x, o.y - m.y) <= p.slow.radius))) w.applySlow(o, p.slow.pct, p.slow.dur);
      if (p.burn) w.ignite(m, p.burn);
    }
    this.hooks.onHitFx?.(p, m);
  }
}
