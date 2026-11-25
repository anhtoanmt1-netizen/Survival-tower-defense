import { Grid } from '../map/grid.js';
import { TowerSystem } from '../sim/towers.js';
import { SLIMES } from '../config/slimes.js';
import { waveSpec } from '../config/waves.js';
import { TYPES, KINDS } from './protocol.js';
// "Gương" trạng thái phía máy khách: nhận bản đồ + snapshot từ server và dựng lại các cấu trúc mà renderer/UI đang dùng
// (world.monsters, director, economy, ts.towers, ts.projectiles, players). KHÔNG mô phỏng gì: mọi thứ do server quyết định.
export class Mirror {
  constructor({ map, gateIdx, you, players, hooks = {} }) {
    this.map = map; this.grid = new Grid(map); this.you = you; this.hooks = hooks; this.time = 0;
    this.activeGates = gateIdx.map((i) => map.gates[i]);
    this.world = { monsters: [], active: 0, kills: 0 }; this.byId = new Map();
    this.director = { wave: 0, countdown: 0, queue: { length: 0 }, currentSpec: waveSpec(1) };
    this.economy = { gold: 0, earned: 0 };
    // TowerSystem thật nhưng KHÔNG chạy update(): chỉ dùng để xem trước vị trí xây (checkPlacement), tính chỉ số, giá nâng cấp
    this.ts = new TowerSystem({ grid: this.grid, world: this.world, economy: this.economy, gates: this.activeGates, hooks: { onProjFree: (p) => hooks.onProjFree?.(p) } });
    this.players = new Map(); for (const p of players) this.players.set(p.id, this.newPlayer(p));
  }
  newPlayer(p) { return { id: p.id, name: p.name, color: p.color, x: 0, y: 0, tx: 0, ty: 0, hp: 3, dead: false, conn: true, phase: false, inv: false, speedLevel: 0, face: 0, t: { invA: 0, invC: 0, phA: 0, phC: 0 }, seen: false }; }
  get me() { return this.players.get(this.you); }
  // --- tháp ---
  applyTower(info) {
    let t = this.ts.towers.find((x) => x.id === info.id);
    if (!t) { t = { id: info.id, x: info.x, y: info.y, type: info.type, cd: 0, angle: 0, kills: 0 }; this.ts.towers.push(t); this.grid.setBlocked(t.x, t.y, true); }
    Object.assign(t, { level: info.level, picks: info.picks.slice(), state: info.state, buildT: info.buildT, invested: info.invested }); this.ts.refresh(t); return t;
  }
  applyWall(info) { if (this.ts.walls.some((w) => w.id === info.id)) return; this.ts.walls.push({ id: info.id, x: info.x, y: info.y }); this.grid.setBlocked(info.x, info.y, true); this.hooks.onWallAdded?.(info); }
  removeWall(id) { const i = this.ts.walls.findIndex((w) => w.id === id); if (i < 0) return; const w = this.ts.walls[i]; this.ts.walls.splice(i, 1); this.grid.setBlocked(w.x, w.y, false); this.hooks.onWallRemoved?.(w); }
  removeTower(id) { const i = this.ts.towers.findIndex((x) => x.id === id); if (i < 0) return; const t = this.ts.towers[i]; this.ts.towers.splice(i, 1); this.grid.setBlocked(t.x, t.y, false); this.hooks.onTowerRemoved?.(t); }
  applyStart(msg) { // cũng dùng khi vào lại phòng: đối chiếu để bỏ tháp đã bị bán trong lúc mất kết nối
    const ids = new Set(msg.towers.map((t) => t.id)); for (const t of this.ts.towers.slice()) if (!ids.has(t.id)) this.removeTower(t.id);
    const wids = new Set((msg.walls || []).map((w) => w.id)); for (const w of this.ts.walls.slice()) if (!wids.has(w.id)) this.removeWall(w.id);
    for (const info of msg.towers) this.applyTower(info); for (const info of msg.walls || []) this.applyWall(info); this.applySnapshot(msg.snap, true);
  }
  // --- snapshot ---
  applySnapshot(s, first = false) {
    this.time = s.st; const d = this.director;
    d.wave = s.w; d.countdown = s.cd < 0 ? Infinity : s.cd; d.queue.length = s.q; d.currentSpec = waveSpec(Math.max(1, s.w)); this.world.active = s.a; this.world.kills = s.k; this.economy.gold = s.g;
    for (const a of s.p) {
      const p = this.players.get(a[0]); if (!p) continue; const fl = a[4];
      p.tx = a[1]; p.ty = a[2]; if (!p.seen || first) { p.x = p.tx; p.y = p.ty; p.seen = true; }
      const wasDead = p.dead, hpBefore = p.hp; p.hp = a[3]; p.dead = !!(fl & 1); p.conn = !!(fl & 2); p.phase = !!(fl & 4); p.inv = !!(fl & 8); p.speedLevel = a[5]; p.face = a[6];
      p.t.invA = a[7] / 10; p.t.invC = a[8] / 10; p.t.phA = a[9] / 10; p.t.phC = a[10] / 10;
      if (!first && p.hp < hpBefore && !p.dead) this.hooks.onHurt?.(p); if (!first && p.dead && !wasDead) this.hooks.onDead?.(p); if (!first && !p.dead && wasDead) this.hooks.onRevive?.(p);
    }
    if (s.m) { // quái chỉ có trong snapshot 'đầy đủ' (10 Hz); các snapshot khác giữ nguyên + nội suy
        const seen = new Set(), list = [];
    for (const a of s.m) {
      let m = this.byId.get(a[0]); const type = TYPES[a[1]], fl = a[5];
      if (!m) { m = { id: a[0], type, cfg: SLIMES[type], x: a[2], y: a[3], hitFlash: 0, view: null, alive: true }; this.byId.set(m.id, m); this.hooks.onSpawn?.(m); }
      m.tx = a[2]; m.ty = a[3]; m.hpPct = a[4]; m.state = fl & 8 ? 'dying' : fl & 1 ? 'nopath' : 'move'; m.dying = !!(fl & 8); m.burnT = fl & 2 ? 1 : 0; m.slowT = fl & 4 ? 1 : 0; m.faceLeft = !!(fl & 16);
      seen.add(m.id); list.push(m);
    }
    for (const [id, m] of this.byId) if (!seen.has(id)) { this.byId.delete(id); m.alive = false; this.hooks.onFree?.(m); }
    this.world.monsters = list;
    }
    for (const a of s.tw) { const t = this.ts.towers.find((x) => x.id === a[0]); if (!t) continue; const ready = !!a[1]; if (ready && t.state === 'building') t.state = 'ready'; t.buildT = a[2] / 10; t.angle = a[3] / 100; }
    const pr = this.ts.projectiles;
    for (let i = 0; i < s.pr.length; i++) { const a = s.pr[i], p = pr[i] || (pr[i] = { view: null }); p.x = a[0]; p.y = a[1]; p.vx = a[2]; p.vy = a[3]; p.kind = KINDS[a[4]] || 'arrow'; }
    while (pr.length > s.pr.length) this.ts.hooks.onProjFree?.(pr.pop());
    for (const ev of s.ev) this.event(ev, first);
  }
  event(ev, first) {
    const [k] = ev;
    if (k === 'tw') { if (ev[1] === 'del') this.removeTower(ev[2]); else this.applyTower(ev[2]); }
    else if (k === 'wl') { if (ev[1] === 'del') this.removeWall(ev[2]); else this.applyWall(ev[2]); }
    else if (k === 'mh') { const m = this.byId.get(ev[1]); if (m) m.hitFlash = 0.12; }
    if (!first) this.hooks.onEvent?.(ev);
  }
  // nội suy mượt vị trí quái và người chơi khác giữa các snapshot (20 Hz)
  smooth(dt) {
    const k = Math.min(1, dt * 14);
    for (const m of this.world.monsters) { m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k; m.hitFlash = Math.max(0, m.hitFlash - dt); }
    for (const p of this.players.values()) if (p.id !== this.you) { p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; }
  }
}
// Kỹ năng của người chơi cục bộ do server quyết định; lớp này đọc số liệu từ snapshot (giao diện dùng chung với chế độ đơn)
export class MirrorSkills {
  constructor(p) { this.p = p; }
  isActive(k) { return this.remainingActive(k) > 0; }
  remainingActive(k) { return k === 'invincible' ? this.p.t.invA : this.p.t.phA; }
  remainingCd(k) { return k === 'invincible' ? this.p.t.invC : this.p.t.phC; }
  can(k) { return this.remainingCd(k) <= 0; }
  use() { return false; } update() {}
}
