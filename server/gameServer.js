import crypto from 'node:crypto';
import { Room } from './room.js';
import { newRandomMapId, parseMapId } from '../src/map/index.js';
import { PROTOCOL_VERSION, ROOM_CODE_ALPHABET, configChecksum, normalizeCode, cleanName } from '../src/net/protocol.js';
const MAX_MSG = 16 * 1024;
// Bộ định tuyến thông điệp + quản lý phòng. Không phụ thuộc kiểu kết nối: chỉ cần conn.send(str), conn.close(), và sự kiện 'message'/'close'.
export class GameServer {
  constructor({ clock = () => performance.now() / 1000, maxRooms = 200, log = () => {} } = {}) { this.rooms = new Map(); this.sessions = new Set(); this.clock = clock; this.maxRooms = maxRooms; this.log = log; this.timer = null; }
  connect(conn) {
    const s = { conn, room: null, player: null, tokens: 120, last: this.clock(), abuse: 0 };
    this.sessions.add(s); conn.on('message', (raw) => this.handle(s, raw)); conn.on('close', () => this.disconnect(s)); return s;
  }
  disconnect(s) { this.sessions.delete(s); if (s.room && s.player && s.player.conn === s.conn) s.room.disconnect(s.player); }
  err(s, code, msg) { s.conn.send(JSON.stringify({ t: 'err', code, msg })); }
  newCode() { for (;;) { let c = ''; for (let i = 0; i < 6; i++) c += ROOM_CODE_ALPHABET[crypto.randomInt(ROOM_CODE_ALPHABET.length)]; if (!this.rooms.has(c)) return c; } }
  closeRoom(room) { this.rooms.delete(room.code); }
  handle(s, raw) {
    const now = this.clock(); s.tokens = Math.min(120, s.tokens + (now - s.last) * 100); s.last = now;       // giới hạn tần suất gửi (token bucket)
    if (--s.tokens < 0) { if (++s.abuse > 300) s.conn.close(1008); return; }
    if (typeof raw !== 'string' || raw.length > MAX_MSG) return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    try { this.route(s, m); } catch (e) { this.log('route error', e); this.err(s, 'server', 'Lỗi máy chủ.'); }
  }
  route(s, m) {
    switch (m.t) {
      case 'ping': return s.conn.send(JSON.stringify({ t: 'pong', n: m.n, st: s.room?.time ?? 0 }));
      case 'create': return this.create(s, m);
      case 'join': return this.join(s, m);
      case 'rejoin': return this.rejoin(s, m);
    }
    const room = s.room, p = s.player; if (!room || !p) return this.err(s, 'no_room', 'Bạn chưa ở trong phòng.');
    switch (m.t) {
      case 'mv': return room.move(p, m);
      case 'cmd': return room.command(p, m);
      case 'color': { const e = room.setColor(p, m.color); return e ? this.err(s, 'color', e) : undefined; }
      case 'map': { const e = room.setMap(p, String(m.mapId)); return e ? this.err(s, 'map', e) : undefined; }
      case 'opts': if (p.id !== room.hostId || room.state !== 'lobby') return this.err(s, 'host', 'Chỉ chủ phòng đổi được.'); room.opts.respawn = !!m.respawn; return room.broadcastRoom();
      case 'start': { const e = room.start(p); return e ? this.err(s, 'start', e) : undefined; }
      case 'again': { const e = room.rematch(p); return e ? this.err(s, 'again', e) : undefined; }
      case 'leave': { const r = s.room, pl = s.player; s.room = null; s.player = null; r.removePlayer(pl); return s.conn.send(JSON.stringify({ t: 'left' })); }
    }
  }
  checkVersion(s, m) {
    if (m.v !== PROTOCOL_VERSION) { this.err(s, 'version', 'Phiên bản giao thức khác máy chủ. Hãy cập nhật game.'); return false; }
    if (m.cfg !== configChecksum()) { this.err(s, 'config', 'Cấu hình cân bằng khác máy chủ. Hãy cập nhật game.'); return false; }
    return true;
  }
  create(s, m) {
    if (s.room) return this.err(s, 'busy', 'Bạn đã ở trong một phòng.'); if (!this.checkVersion(s, m)) return;
    if (this.rooms.size >= this.maxRooms) return this.err(s, 'busy', 'Máy chủ đang đầy, thử lại sau.');
    let mapId = newRandomMapId(); if (m.mapId) { const p = parseMapId(m.mapId); if (!p.ok) return this.err(s, 'map', p.error); if (p.size > 200) return this.err(s, 'map', 'Kích thước bản đồ tối đa 200.'); mapId = p.id; }
    const room = new Room(this.newCode(), this, mapId, { respawn: m.respawn !== false }); this.rooms.set(room.code, room);
    this.seat(s, room, m);
  }
  join(s, m) {
    if (s.room) return this.err(s, 'busy', 'Bạn đã ở trong một phòng.'); if (!this.checkVersion(s, m)) return;
    const room = this.rooms.get(normalizeCode(m.code)); if (!room) return this.err(s, 'no_room', 'Không tìm thấy phòng.');
    if (room.state !== 'lobby') return this.err(s, 'in_progress', 'Phòng đã bắt đầu chơi.');
    if (room.players.size >= 8) return this.err(s, 'full', 'Phòng đã đủ 8 người.');
    this.seat(s, room, m);
  }
  seat(s, room, m) {
    const token = crypto.randomBytes(16).toString('hex'), p = room.addPlayer(token, cleanName(m.name), m.color);
    p.conn = s.conn; s.room = room; s.player = p;
    s.conn.send(JSON.stringify({ t: 'joined', you: { id: p.id, token }, room: room.info() })); room.broadcastRoom();
  }
  rejoin(s, m) {
    const room = this.rooms.get(normalizeCode(m.code)); if (!room) return this.err(s, 'no_room', 'Phòng không còn.');
    const p = [...room.players.values()].find((x) => typeof m.token === 'string' && x.token.length === m.token.length && crypto.timingSafeEqual(Buffer.from(x.token), Buffer.from(m.token)));
    if (!p) return this.err(s, 'token', 'Không xác thực được người chơi.');
    for (const o of this.sessions) if (o.player === p && o !== s) { o.room = null; o.player = null; } // phiên cũ bị thay thế
    s.room = room; s.player = p; s.conn.send(JSON.stringify({ t: 'joined', you: { id: p.id, token: p.token }, room: room.info(), rejoined: true })); room.rejoin(p, s.conn);
  }
  tickAll(dt) {
    for (const room of [...this.rooms.values()]) {
      room.tick(dt);
      const anyConn = [...room.players.values()].some((p) => p.connected);
      room.idleT = anyConn ? 0 : room.idleT + dt; if (room.idleT > 120 && room.state !== 'playing') this.closeRoom(room); else if (room.idleT > 90 && room.state === 'playing') this.closeRoom(room);
    }
  }
  start(hz = 20) { let last = performance.now(); this.timer = setInterval(() => { const n = performance.now(); this.tickAll(Math.min(0.1, (n - last) / 1000)); last = n; }, 1000 / hz); this.timer.unref?.(); }
  stop() { clearInterval(this.timer); }
}
