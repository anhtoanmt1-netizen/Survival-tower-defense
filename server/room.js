import { generateMap, newRandomMapId, parseMapId } from '../src/map/index.js';
import { Grid } from '../src/map/grid.js';
import { MonsterWorld } from '../src/sim/world.js';
import { WaveDirector, selectGates } from '../src/sim/director.js';
import { TowerSystem } from '../src/sim/towers.js';
import { Economy } from '../src/sim/economy.js';
import { SkillSet } from '../src/sim/skills.js';
import { boxCollides, segmentClear } from '../src/sim/movement.js';
import { mulberry32 } from '../src/core/rng.js';
import { randomSeed } from '../src/map/mapId.js';
import { SKILLS, SPEED_UPGRADE, speedUpgradeCost } from '../src/config/skills.js';
import { WAVE_SETTINGS } from '../src/config/waves.js';
import { GAME_CONFIG } from '../src/config/gameConfig.js';
import { TYPES, KINDS, PALETTE, MAX_PLAYERS, RECONNECT_GRACE, RESPAWN_TIME, mapChecksum, configChecksum, num } from '../src/net/protocol.js';
const r2 = (v) => Math.round(v * 100) / 100;
export class ServerPlayer {
  constructor(id, token, name, color) { Object.assign(this, { id, token, name, color, conn: null, connected: true, discAt: null, host: false }); this.r = GAME_CONFIG.player.radius; this.maxHp = GAME_CONFIG.player.hp; this.results = new Map(); this.reset(0, 0); }
  reset(x, y) { Object.assign(this, { x, y, hp: this.maxHp, dead: false, invuln: 0, skills: new SkillSet(), speedLevel: 0, lastMv: null, respawnT: 0, face: 0, badMoves: 0 }); this.results.clear(); }
  moveSpeed() { return GAME_CONFIG.player.runSpeed * (1 + SPEED_UPGRADE.perLevel * this.speedLevel); }
  takeDamage(n) {
    if (this.dead || this.invuln > 0 || this.skills.isActive('invincible')) return false;
    this.hp = Math.max(0, this.hp - n); this.invuln = GAME_CONFIG.player.invulnTime; if (this.hp === 0) { this.dead = true; this.respawnT = RESPAWN_TIME; }
    this.onHurt?.(this); return true;
  }
}
export class Room {
  constructor(code, server, mapId, opts = {}) {
    this.code = code; this.server = server; this.mapId = mapId; this.opts = { respawn: opts.respawn !== false }; this.state = 'lobby';
    this.players = new Map(); this.nextPid = 1; this.hostId = null; this.now = 0; this.idleT = 0; this.clock = server.clock; this.events = []; this.mid = 0; this.tickN = 0;
  }
  // ---------- lobby ----------
  info() { return { code: this.code, state: this.state, hostId: this.hostId, mapId: this.mapId, opts: this.opts, max: MAX_PLAYERS, players: [...this.players.values()].map((p) => ({ id: p.id, name: p.name, color: p.color, connected: p.connected, host: p.id === this.hostId })) }; }
  broadcastRoom() { this.broadcast({ t: 'room', room: this.info() }); }
  broadcast(obj) { const s = JSON.stringify(obj); for (const p of this.players.values()) if (p.connected && p.conn) p.conn.send(s); }
  send(p, obj) { if (p.connected && p.conn) p.conn.send(JSON.stringify(obj)); }
  freeColor(want) { const used = new Set([...this.players.values()].map((p) => p.color)); return PALETTE.includes(want) && !used.has(want) ? want : PALETTE.find((c) => !used.has(c)); }
  addPlayer(token, name, color) {
    const p = new ServerPlayer(this.nextPid++, token, name, this.freeColor(color)); p.onHurt = (pl) => this.events.push(pl.dead ? ['dd', pl.id] : ['hp', pl.id]);
    this.players.set(p.id, p); if (this.hostId === null) this.hostId = p.id; return p;
  }
  setColor(p, color) {
    if (!PALETTE.includes(color)) return 'Màu không hợp lệ.';
    for (const o of this.players.values()) if (o !== p && o.color === color) return 'Màu này đã có người dùng.'; // không trùng màu trong phòng
    p.color = color; this.state === 'lobby' ? this.broadcastRoom() : this.events.push(['col', p.id, color]); return null;
  }
  setMap(p, mapId) {
    if (p.id !== this.hostId || this.state !== 'lobby') return 'Chỉ chủ phòng đổi bản đồ trước khi bắt đầu.';
    if (mapId === 'random') this.mapId = newRandomMapId(); else { const m = parseMapId(mapId); if (!m.ok) return m.error; if (m.size > 200) return 'Kích thước bản đồ tối đa 200 trong phòng nhiều người.'; this.mapId = m.id; }
    this.broadcastRoom(); return null;
  }
  disconnect(p) {
    if (!this.players.has(p.id)) return; p.conn = null; p.connected = false; p.discAt = this.now;
    if (this.state === 'lobby') this.removePlayer(p); else this.events.push(['dc', p.id]);
    if (this.state === 'lobby') this.broadcastRoom();
  }
  removePlayer(p) {
    this.players.delete(p.id);
    if (p.id === this.hostId) { const next = [...this.players.values()].find((x) => x.connected) || [...this.players.values()][0]; this.hostId = next ? next.id : null; }
    if (this.players.size === 0) { this.server.closeRoom(this); return; }
    if (this.state === 'lobby') this.broadcastRoom(); else this.events.push(['lv', p.id]);
  }
  // ---------- bắt đầu ván ----------
  start(p) {
    if (p.id !== this.hostId) return 'Chỉ chủ phòng mới bắt đầu được.'; if (this.state !== 'lobby') return 'Ván đã bắt đầu.';
    if (![...this.players.values()].some((x) => x.connected)) return 'Không có người chơi.';
    this.map = generateMap(this.mapId); this.grid = new Grid(this.map); this.rng = mulberry32(randomSeed()); this.economy = new Economy(); this.events = []; this.mid = 0; this.time = 0;
    this.world = new MonsterWorld(this.grid, {
      onSpawn: (m) => { m.id = ++this.mid; },
      onKill: (m) => { this.economy.add(m.reward); this.events.push(['k', m.id, r2(m.x), r2(m.y), m.reward]); },
      onHit: (m) => this.events.push(['mh', m.id]),
    }, this.rng);
    const n = [...this.players.values()].length;
    this.gates = selectGates(this.map.gates, n, this.rng); // n người = n cổng
    this.director = new WaveDirector({ grid: this.grid, world: this.world, gates: this.gates, rng: this.rng });
    this.ts = new TowerSystem({ grid: this.grid, world: this.world, economy: this.economy, gates: this.gates, rng: this.rng, hooks: {
      onBuildStart: (t) => this.events.push(['tw', 'add', this.towerInfo(t)]), onBuilt: (t) => this.events.push(['tb', t.id]),
      onChanged: (t) => this.events.push(['tw', 'upd', this.towerInfo(t)]), onSold: (t) => this.events.push(['tw', 'del', t.id]),
      onHitFx: (pr, m) => this.events.push(['h', m.id, KINDS.indexOf(pr.kind), pr.crit ? 1 : 0, pr.slow ? pr.slow.radius : 0]),
    } });
    const spots = this.spawnSpots(n); let i = 0;
    for (const pl of this.players.values()) { pl.reset(spots[i].x, spots[i].y); i++; }
    this.state = 'playing'; this.noConnT = 0; this.endInfo = null;
    for (const pl of this.players.values()) this.send(pl, this.startMsg(pl));
    return null;
  }
  spawnSpots(n) {
    const s = this.map.playerStart, cells = [];
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (this.grid.isWalkable(s.x + dx, s.y + dy)) cells.push({ x: s.x + dx + 0.5, y: s.y + dy + 0.5, d: Math.hypot(dx, dy) });
    cells.sort((a, b) => a.d - b.d); return cells.slice(0, Math.max(n, 1));
  }
  towerInfo(t) { return { id: t.id, x: t.x, y: t.y, type: t.type, level: t.level, picks: t.picks, state: t.state, buildT: r2(t.buildT), invested: t.invested }; }
  startMsg(p) {
    return { t: 'start', you: p.id, mapId: this.mapId, mapSum: mapChecksum(this.map.tiles), cfg: configChecksum(), gates: this.gates.map((g) => this.map.gates.indexOf(g)), opts: this.opts,
      players: [...this.players.values()].map((x) => ({ id: x.id, name: x.name, color: x.color })), towers: this.ts.towers.map((t) => this.towerInfo(t)), snap: this.snapshot(true) };
  }
  rejoin(p, conn) { if (p.conn && p.conn !== conn) p.conn.close(4000); p.conn = conn; p.connected = true; p.discAt = null; this.events.push(['rc', p.id]); if (this.state === 'lobby') this.broadcastRoom(); else this.send(p, this.startMsg(p)); }
  // ---------- mỗi tick ----------
  targets() { return [...this.players.values()].filter((p) => p.connected && !p.dead); }
  tick(dt) {
    this.now += dt; if (this.state !== 'playing') return; this.time += dt;
    for (const p of [...this.players.values()]) {
      p.invuln = Math.max(0, p.invuln - dt);
      p.skills.update(dt, (k) => { if (k === 'phase') this.settle(p); });
      if (p.dead && this.opts.respawn && p.connected) { p.respawnT -= dt; if (p.respawnT <= 0) this.respawn(p); }
      if (!p.connected && this.now - p.discAt > RECONNECT_GRACE) this.removePlayer(p); // quá hạn giữ chỗ
    }
    if (this.state !== 'playing') return;
    this.director.update(dt); this.world.update(dt, this.targets()); this.ts.update(dt); this.economy.update(dt, this.ts.towers.length, this.ts.buildCost());
    this.checkEnd(dt); this.flush();
  }
  settle(p) { // hết xuyên vật thể: nếu đang nằm trong vật cản thì đưa về ô đi được gần nhất
    if (!boxCollides(this.grid, p.x, p.y, p.r, false)) return; const n = this.grid.nearestWalkable(Math.floor(p.x), Math.floor(p.y), 20); if (!n) return;
    p.x = n.x + 0.5; p.y = n.y + 0.5; this.send(p, { t: 'pos', x: r2(p.x), y: r2(p.y) }); this.events.push(['pe', p.id, r2(p.x), r2(p.y)]);
  }
  respawn(p) { const s = this.spawnSpots(1)[0]; p.dead = false; p.hp = p.maxHp; p.x = s.x; p.y = s.y; p.invuln = 1.5; p.lastMv = null; this.send(p, { t: 'pos', x: r2(p.x), y: r2(p.y) }); this.events.push(['rs', p.id, r2(p.x), r2(p.y)]); }
  checkEnd(dt) {
    const all = [...this.players.values()]; if (all.length && all.every((p) => p.dead)) return this.finish(false);
    if (this.director.wave >= WAVE_SETTINGS.totalWaves && this.director.queue.length === 0 && this.world.active === 0) return this.finish(true);
    if (!all.some((p) => p.connected)) { this.noConnT += dt; } else this.noConnT = 0;
  }
  finish(won) {
    this.state = 'ended';
    this.endInfo = { won, wave: this.director.wave, kills: this.world.kills, gold: this.economy.earned - this.ts.stats.refunded, towers: this.ts.stats.built, damage: Math.round(this.world.damageDealt), time: Math.round(this.time), mapId: this.mapId, players: [...this.players.values()].map((p) => ({ name: p.name, color: p.color, dead: p.dead })) };
    this.flush(); this.broadcast({ t: 'end', stats: this.endInfo });
  }
  rematch(p) { if (p.id !== this.hostId || this.state !== 'ended') return 'Chỉ chủ phòng chơi lại được sau khi ván kết thúc.'; this.state = 'lobby'; this.mapId = newRandomMapId(); this.broadcastRoom(); return null; }
  // ---------- đồng bộ ----------
  // full=true: kèm danh sách quái. Quái chỉ gửi 10 lần/giây (mỗi tick chẵn) để giảm một nửa băng thông; người chơi/tháp/đạn/sự kiện gửi mỗi tick.
  snapshot(full = true) {
    const d = this.director, w = this.world, flags = (p) => (p.dead ? 1 : 0) | (p.connected ? 2 : 0) | (p.skills.isActive('phase') ? 4 : 0) | (p.skills.isActive('invincible') ? 8 : 0);
    const tn = (x) => Math.round(x * 10);
    return { t: 'snap', st: r2(this.time), w: d.wave, cd: Number.isFinite(d.countdown) ? r2(Math.max(0, d.countdown)) : -1, q: d.queue.length, a: w.active, g: this.economy.gold, k: w.kills,
      p: [...this.players.values()].map((p) => [p.id, r2(p.x), r2(p.y), p.hp, flags(p), p.speedLevel, p.face, tn(p.skills.remainingActive('invincible')), tn(p.skills.remainingCd('invincible')), tn(p.skills.remainingActive('phase')), tn(p.skills.remainingCd('phase'))]),
      m: !full ? undefined : w.monsters.map((m) => [m.id, TYPES.indexOf(m.type), r2(m.x), r2(m.y), Math.max(0, Math.round((m.hp / m.maxHp) * 100)), (m.state === 'nopath' ? 1 : 0) | (m.burnT > 0 ? 2 : 0) | (m.slowT > 0 ? 4 : 0) | (m.dying ? 8 : 0) | (m.faceLeft ? 16 : 0)]),
      tw: this.ts.towers.map((t) => [t.id, t.state === 'ready' ? 1 : 0, tn(t.buildT), Math.round(t.angle * 100)]),
      pr: this.ts.projectiles.map((p) => [r2(p.x), r2(p.y), r2(p.vx), r2(p.vy), KINDS.indexOf(p.kind)]), ev: this.events };
  }
  flush() { const s = this.snapshot(this.tickN++ % 2 === 0); this.events = []; this.broadcast(s); }
  // ---------- lệnh từ người chơi ----------
  move(p, m) {
    if (this.state !== 'playing' || p.dead || !p.connected) return;
    const x = num(m.x, 0, this.grid.width, NaN), y = num(m.y, 0, this.grid.height, NaN); if (Number.isNaN(x) || Number.isNaN(y)) return;
    const t = this.clock(), dtm = p.lastMv == null ? 0.1 : Math.min(0.5, Math.max(0.02, t - p.lastMv)), phase = p.skills.isActive('phase');
    const allowed = p.moveSpeed() * 1.4 * dtm + 0.35, dist = Math.hypot(x - p.x, y - p.y);
    if (dist > allowed || !segmentClear(this.grid, p.x, p.y, x, y, p.r, phase) || boxCollides(this.grid, x, y, p.r, phase)) { p.badMoves++; this.send(p, { t: 'pos', x: r2(p.x), y: r2(p.y) }); return; }
    p.x = x; p.y = y; p.face = m.f ? 1 : 0; p.lastMv = t;
  }
  command(p, m) {
    if (this.state !== 'playing') return this.reply(p, m.id, { ok: false, message: 'Ván chưa bắt đầu.' });
    const id = Number.isInteger(m.id) ? m.id : null;
    if (id !== null && p.results.has(id)) return this.send(p, { t: 'res', id, ...p.results.get(id), dup: true }); // chống gửi trùng: trả lại kết quả cũ, không thực hiện lại
    let r; try { r = this.exec(p, m); } catch { r = { ok: false, message: 'Lệnh không hợp lệ.' }; }
    if (id !== null) { p.results.set(id, r); if (p.results.size > 64) p.results.delete(p.results.keys().next().value); }
    this.reply(p, id, r);
  }
  reply(p, id, r) { this.send(p, { t: 'res', id, ok: !!r.ok, reason: r.reason, message: r.message }); }
  tower(m) { return Number.isInteger(m.tid) ? this.ts.towers.find((t) => t.id === m.tid) : null; }
  exec(p, m) {
    if (p.dead || !p.connected) return { ok: false, message: 'Bạn đang bị hạ.' };
    const out = (r) => ({ ok: r.ok, reason: r.reason, message: r.message });
    switch (m.op) {
      case 'build': {
        if (!Number.isInteger(m.x) || !Number.isInteger(m.y)) return { ok: false, message: 'Tọa độ sai.' };
        for (const o of this.players.values()) if (!o.connected && !o.dead && o.x + o.r > m.x && o.x - o.r < m.x + 1 && o.y + o.r > m.y && o.y - o.r < m.y + 1) return { ok: false, reason: 'player', message: 'Có nhân vật đang đứng ở ô này.' };
        return out(this.ts.build(m.x, m.y, this.targets()));
      }
      case 'upgrade': { const t = this.tower(m); return t ? out(this.ts.upgrade(t)) : { ok: false, message: 'Tháp không còn.' }; }
      case 'pick': { const t = this.tower(m); return t ? out(this.ts.pickBranch(t, String(m.branch))) : { ok: false, message: 'Tháp không còn.' }; }
      case 'reset': { const t = this.tower(m); return t ? out(this.ts.resetPicks(t)) : { ok: false, message: 'Tháp không còn.' }; }
      case 'sell': { const t = this.tower(m); return t ? out(this.ts.sell(t)) : { ok: false, message: 'Tháp không còn.' }; }
      case 'skill': {
        if (!SKILLS[m.name]) return { ok: false, message: 'Kỹ năng không tồn tại.' };
        if (!p.skills.use(m.name)) return { ok: false, message: `${SKILLS[m.name].name} đang hồi chiêu.` };
        this.events.push(['sk', p.id, m.name]); return { ok: true };
      }
      case 'speed': {
        if (p.speedLevel >= SPEED_UPGRADE.maxLevel) return { ok: false, message: 'Tốc độ chạy đã tối đa.' };
        const c = speedUpgradeCost(p.speedLevel); if (!this.economy.spend(c)) return { ok: false, reason: 'gold', message: `Không đủ vàng (cần ${c}).` };
        p.speedLevel++; return { ok: true };
      }
      default: return { ok: false, message: 'Lệnh không hợp lệ.' };
    }
  }
}
