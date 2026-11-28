import { TOWER_TYPES, BRANCHES, computeStats, pendingPicks } from '../config/towers.js';
import { ECON, upgradeCost } from '../config/economy.js';
import { NEUTRAL } from '../config/difficulty.js';
import { towerStage } from '../config/art.js';
import { FlowField } from '../core/flowfield.js';
import { isBuildableTerrain } from '../map/tiles.js';
export const MSG = {
  blocked: 'KHÔNG THỂ XÂY THÁP - ĐƯỜNG DI CHUYỂN CỦA QUÁI VẬT BỊ CHẶN.',
  terrain: 'Không thể xây ở ô này.', bounds: 'Ngoài bản đồ.', occupied: 'Vị trí này đã có công trình.', player: 'Có nhân vật đang đứng ở ô này.',
  gold: 'Không đủ vàng.', gone: 'Công trình không còn.', noPlayers: 'Không có người chơi còn sống.',
};
const FT = ECON.footprint.tower, FW = ECON.footprint.wall, FOOT = { tower: FT, wall: FW };
const fail = (reason, message) => ({ ok: false, reason, message: message || MSG[reason] });
// Hệ thống tháp thuần (không phụ thuộc Phaser): xây, nâng cấp, nhánh kỹ năng, bán, nhắm bắn, mũi tên.
export class TowerSystem {
  constructor({ grid, world, economy, gates, hooks = {}, rng = Math.random, diff = NEUTRAL }) {
    Object.assign(this, { grid, world, economy, gates, hooks, rng, diff }); world.towers = null; /* gán sau khi tạo mảng */ this.mods = { damage: diff.towerDamageMul, fireRate: diff.towerRateMul }; this.buildTime = ECON.buildTime; this.towers = []; world.towers = this.towers; world.towerFT = FT; this.walls = []; this.projectiles = []; this.pool = []; this.nextId = 1; this.nextWallId = 1;
    this.scratch = new FlowField(grid.width, grid.height); this.stats = { built: 0, walls: 0, damage: 0, refunded: 0 };
  }
  buildCost() { return this.diff.buildCost; } // giá cố định, không đổi theo số tháp hay thời gian
  wallCost() { return ECON.wallCost; } // giá tường cố định 5 vàng/ô ở mọi độ khó
  // tra theo MỌI ô trong khối chiếm chỗ (2x2), không chỉ ô góc
  wallAt(x, y) { return this.walls.find((w) => x >= w.x && x < w.x + FW && y >= w.y && y < w.y + FW) || null; }
  towerAt(x, y) { return this.towers.find((t) => x >= t.x && x < t.x + FT && y >= t.y && y < t.y + FT) || null; }
  // Ô x,y có chặn hết đường từ MỌI cổng đang hoạt động tới người chơi còn sống không? Cùng FlowField + isWalkable với AI quái vật.
  pathsOkWith(x, y, players, n = 1) {
    const g = this.grid, idx = [], prev = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = (y + j) * g.width + x + i; idx.push(k); prev.push(g.extra[k]); g.extra[k] = 1; } // tạm đặt cả khối, KHÔNG tăng version, luôn hoàn lại
    try {
      const targets = players.filter((p) => !p.dead).map((p) => g.targetTile(p)).filter(Boolean);
      if (!targets.length) return false;
      this.scratch.compute(g, targets);
      for (const gate of this.gates) {
        let ok = false;
        for (let dy = -2; dy <= 2 && !ok; dy++) for (let dx = -2; dx <= 2; dx++) { const gx = gate.x + dx, gy = gate.y + dy; if (g.isWalkable(gx, gy) && this.scratch.dist[gy * g.width + gx] < Infinity) { ok = true; break; } }
        if (!ok) return false;
      }
      return true;
    } finally { idx.forEach((k, m) => { g.extra[k] = prev[m]; }); }
  }
  // kind: 'tower' | 'wall'. Cùng một bộ quy tắc (địa hình, ô trống, không có người đứng, KHÔNG chặn kín đường tới người chơi); chỉ khác giá.
  checkPlacement(x, y, players, { ignoreGold = false, kind = 'tower' } = {}) {
    const cost = kind === 'wall' ? this.wallCost() : this.buildCost();
    const g = this.grid, n = FOOT[kind];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (!g.inBounds(x + i, y + j)) return fail('bounds');
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (g.extra[(y + j) * g.width + x + i]) return fail('occupied');
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (!isBuildableTerrain(g.tile(x + i, y + j))) return fail('terrain');
    for (const p of players) if (!p.dead) { const r = p.r ?? 0.3; if (p.x + r > x && p.x - r < x + n && p.y + r > y && p.y - r < y + n) return fail('player'); }
    if (!this.pathsOkWith(x, y, players, n)) return fail('blocked');
    if (!ignoreGold && this.economy.gold < cost) return fail('gold', `Không đủ vàng (cần ${cost}).`);
    return { ok: true, cost };
  }
  build(x, y, players, type = 'archer') {
    const c = this.checkPlacement(x, y, players); if (!c.ok) return c;
    if (!this.economy.spend(c.cost)) return fail('gold');
    const t = { id: this.nextId++, type, x, y, level: 1, stage: 0, picks: [], invested: c.cost, state: 'building', buildT: this.buildTime, cd: 0, angle: 0, kills: 0 };
    this.refresh(t); this.towers.push(t); this.grid.setBlockedRect(x, y, FT, true); this.stats.built++; this.hooks.onBuildStart?.(t);
    return { ok: true, tower: t };
  }
  // --- TƯỜNG: 2x2 ô, xây tức thì, chặn quái vật như tháp (grid.extra => FlowField + va chạm quái/người chơi dùng chung). Kỹ năng Xuyên vật thể bỏ qua grid nên không bị ảnh hưởng. ---
  buildWall(x, y, players) {
    const c = this.checkPlacement(x, y, players, { kind: 'wall' }); if (!c.ok) return c;
    if (!this.economy.spend(c.cost)) return fail('gold');
    const w = { id: this.nextWallId++, x, y }; this.walls.push(w); this.grid.setBlockedRect(x, y, FW, true); this.stats.walls++; this.hooks.onWallBuilt?.(w);
    return { ok: true, wall: w };
  }
  wallRefund() { return Math.floor(ECON.wallCost * this.diff.sellRefund); }
  sellWall(w) {
    const i = this.walls.indexOf(w); if (i < 0) return fail('gone');
    const v = this.wallRefund(); this.walls.splice(i, 1); this.grid.setBlockedRect(w.x, w.y, FW, false); this.economy.add(v); this.stats.refunded += v; this.hooks.onWallSold?.(w); return { ok: true, refund: v };
  }
  refresh(t) { t.stats = computeStats(t.type, t.level, t.picks, this.mods); t.pending = pendingPicks(t.type, t.level, t.picks); }
  upgradeInfo(t) {
    const max = TOWER_TYPES[t.type].maxLevel;
    if (t.level >= max) return { ok: false, reason: 'max', message: 'Đã tối đa.' };
    if (t.pending > 0) return { ok: false, reason: 'pick', message: 'Hãy chọn nhánh kỹ năng trước.' };
    const cost = Math.round(upgradeCost(t.level) * this.diff.upgradeMul); return { ok: true, cost, before: t.stats, after: computeStats(t.type, t.level + 1, t.picks, this.mods), nextIsMilestone: TOWER_TYPES[t.type].milestones.includes(t.level + 1) };
  }
  upgrade(t) {
    if (t.state !== 'ready') return fail('building', 'Tháp đang xây.');
    const i = this.upgradeInfo(t); if (!i.ok) return i;
    if (!this.economy.spend(i.cost)) return fail('gold', `Không đủ vàng (cần ${i.cost}).`);
    t.level++; t.invested += i.cost; this.refresh(t); this.hooks.onChanged?.(t);
    const st = towerStage(t.level); if (st !== t.stage) { t.stage = st; this.hooks.onEvolve?.(t); } // đổi hình tháp ở LV5/7/9/12/15
    return { ok: true, tower: t };
  }
  pickBranch(t, branch) {
    if (!BRANCHES[branch]) return fail('branch', 'Nhánh không tồn tại.');
    if (t.pending <= 0) return fail('nopick', 'Chưa tới mốc chọn nhánh.');
    if ((t.stats.tiers[branch] ?? -1) + 1 >= BRANCHES[branch].tiers.length) return fail('full', 'Nhánh này đã đạt tối đa.');
    t.picks.push(branch); this.refresh(t); this.hooks.onChanged?.(t); return { ok: true };
  }
  resetPicks(t) { // chọn lại nhánh phải trả phí
    if (!t.picks.length) return fail('nopicks', 'Chưa chọn nhánh nào.');
    if (!this.economy.spend(this.diff.resetCost)) return fail('gold', `Không đủ vàng (cần ${this.diff.resetCost}).`);
    t.picks = []; this.refresh(t); this.hooks.onChanged?.(t); return { ok: true };
  }
  sellValue(t) { return Math.floor(t.invested * this.diff.sellRefund); }
  sell(t) {
    const i = this.towers.indexOf(t); if (i < 0) return fail('gone', 'Tháp không còn.');
    const v = this.sellValue(t); this.towers.splice(i, 1); this.grid.setBlockedRect(t.x, t.y, FT, false); this.economy.add(v); this.stats.refunded += v; this.hooks.onSold?.(t); return { ok: true, refund: v };
  }
  update(dt) {
    const ms = this.world.monsters;
    for (const t of this.towers) {
      if (t.state === 'building') { t.buildT -= dt; if (t.buildT <= 0) { t.state = 'ready'; this.hooks.onBuilt?.(t); } continue; }
      const s = t.stats, cx = t.x + FT / 2, cy = t.y + FT / 2, dbf = this.world.runtime?.towerDebuff(t) ?? null; t.cd -= dt * (dbf ? dbf.rate : 1); t.dbf = dbf; // dbf: hiệu ứng slime V2 (làm ảo giác/khóa/làm chậm tốc bắn) — null với slime cũ
      const near = []; for (const m of ms) if (!m.dying) { const d = Math.hypot(m.x - cx, m.y - cy); if (d <= s.range) near.push([d, m]); }
      if (!near.length) continue; near.sort((a, b) => a[0] - b[0]);
      const tgt = near[0][1]; t.angle = Math.atan2(tgt.y - cy, tgt.x - cx);
      if (t.cd <= 0) {
        t.cd = 1 / s.fireRate; const n = s.arrows;
        for (let k = 0; k < n; k++) this.shoot(t, near[k % near.length][1], (k - (n - 1) / 2) * s.fanAngle);
        t.flash = 1; this.hooks.onShoot?.(t);
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
    const s = t.stats, dbf = t.dbf, lock = !!dbf?.lock, p = this.pool.pop() || {}, a = Math.atan2(target.y - (t.y + FT / 2), target.x - (t.x + FT / 2)) + offset, crit = this.rng() < s.critChance;
    Object.assign(p, { x: t.x + FT / 2, y: t.y + 0.15, vx: Math.cos(a) * s.arrowSpeed, vy: Math.sin(a) * s.arrowSpeed, speed: s.arrowSpeed, target, tx: target.x, ty: target.y, age: 0, crit, tower: t, view: null,
      dmg: s.damage * (crit ? s.critMult : 1), kind: s.kind,
      miss: !!dbf && dbf.miss > 0 && this.rng() < dbf.miss,
      slow: s.slowPct && !lock ? { pct: s.slowPct, dur: s.slowDur, radius: s.slowRadius } : null,
      burn: s.burnDps && !lock ? { burnDps: s.burnDps, burnDur: s.burnDur, spreadChance: s.spreadChance, spreadRadius: s.spreadRadius } : null });
    this.projectiles.push(p); this.hooks.onProjSpawn?.(p);
  }
  hit(p) {
    const m = p.target; if (!m || !m.alive || m.dying) return; const w = this.world;
    if (p.miss) { this.hooks.onMiss?.(p, m); return; } // bị ảo giác: đòn trượt
    this.stats.damage += Math.min(p.dmg, m.hp); const hpBefore = m.hp;
    if (w.damage(m, p.dmg) && p.tower) p.tower.kills++;
    if (hpBefore > 0 && !m.dying) { // đòn không giết chết mới áp hiệu ứng
      if (p.slow) for (const o of w.monsters) if (!o.dying && (o === m || (p.slow.radius > 0 && Math.hypot(o.x - m.x, o.y - m.y) <= p.slow.radius))) w.applySlow(o, p.slow.pct, p.slow.dur);
      if (p.burn) w.ignite(m, p.burn);
    }
    this.hooks.onHitFx?.(p, m);
  }
}
