import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { GameServer } from '../server/gameServer.js';
import { PROTOCOL_VERSION, configChecksum, mapChecksum, PALETTE, RESPAWN_TIME, RECONNECT_GRACE } from '../src/net/protocol.js';
import { generateMap } from '../src/map/index.js';
import { T } from '../src/map/tiles.js';

class Fake extends EventEmitter { constructor() { super(); this.msgs = []; this.closed = false; } send(s) { this.msgs.push(JSON.parse(s)); return true; } close() { if (!this.closed) { this.closed = true; this.emit('close'); } } of(t) { return this.msgs.filter((m) => m.t === t); } last(t) { return this.of(t).at(-1); } }
let T0 = 0; const clock = () => T0;
const HELLO = { v: PROTOCOL_VERSION, cfg: configChecksum() };
const tx = (s, o) => s.conn.emit('message', JSON.stringify(o));
function mkServer() { T0 = 0; return new GameServer({ clock }); }
function client(server) { const c = new Fake(); const s = server.connect(c); return { c, s }; }
function lobby(server, n, opts = {}) {
  const cs = []; const a = client(server); tx(a.s, { t: 'create', ...HELLO, name: 'Host', color: PALETTE[0], respawn: opts.respawn, mapId: opts.mapId }); const code = a.c.last('joined').room.code; cs.push(a);
  for (let i = 1; i < n; i++) { const b = client(server); tx(b.s, { t: 'join', ...HELLO, code, name: 'P' + i, color: PALETTE[i] }); cs.push(b); }
  return { cs, code, room: server.rooms.get(code) };
}
function play(server, n, opts) { const L = lobby(server, n, opts); tx(L.cs[0].s, { t: 'start' }); return L; }
const tick = (server, sec, dt = 0.05) => { for (let t = 0; t < sec - 1e-9; t += dt) { T0 += dt; server.tickAll(dt); } };
function freeCell(room, p) { for (let r = 2; r < 15; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = Math.floor(p.x) + dx, y = Math.floor(p.y) + dy; if (room.ts.checkPlacement(x, y, room.targets(), { ignoreGold: true }).ok) return { x, y }; } }

test('phòng: mã 6 ký tự, tối đa 8 người, màu không trùng, từ chối sai mã/sai phiên bản/đầy phòng', () => {
  const sv = mkServer(); const { cs, code, room } = lobby(sv, 8); assert.match(code, /^[A-Z2-9]{6}$/); assert.equal(room.players.size, 8);
  assert.equal(new Set([...room.players.values()].map((p) => p.color)).size, 8);
  const x = client(sv); tx(x.s, { t: 'join', ...HELLO, code, name: 'X' }); assert.equal(x.c.last('err').code, 'full');
  const y = client(sv); tx(y.s, { t: 'join', ...HELLO, code: 'ZZZZZZ', name: 'Y' }); assert.equal(y.c.last('err').code, 'no_room');
  const z = client(sv); tx(z.s, { t: 'join', v: 999, cfg: configChecksum(), code, name: 'Z' }); assert.equal(z.c.last('err').code, 'version');
  const w = client(sv); tx(w.s, { t: 'join', v: PROTOCOL_VERSION, cfg: 'deadbeef', code, name: 'W' }); assert.equal(w.c.last('err').code, 'config');
  // trùng màu khi vào => tự gán màu khác; đổi sang màu đã có người => bị từ chối
  const sv2 = mkServer(); const L = lobby(sv2, 2); const d = client(sv2); tx(d.s, { t: 'join', ...HELLO, code: L.code, name: 'D', color: PALETTE[0] });
  const cols = [...L.room.players.values()].map((p) => p.color); assert.equal(new Set(cols).size, 3);
  tx(L.cs[1].s, { t: 'color', color: PALETTE[0] }); assert.equal(L.cs[1].c.last('err').code, 'color'); tx(L.cs[1].s, { t: 'color', color: PALETTE[7] }); assert.equal(L.room.players.get(2).color, PALETTE[7]);
});
test('chủ phòng: chỉ chủ bắt đầu được; chủ rời thì chuyển chủ; phòng trống thì đóng', () => {
  const sv = mkServer(); const { cs, code, room } = lobby(sv, 3); tx(cs[1].s, { t: 'start' }); assert.equal(cs[1].c.last('err').code, 'start'); assert.equal(room.state, 'lobby');
  tx(cs[0].s, { t: 'leave' }); assert.equal(room.hostId, 2); tx(cs[1].s, { t: 'leave' }); tx(cs[2].s, { t: 'leave' }); assert.equal(sv.rooms.has(code), false);
});
test('bắt đầu ván: n người = n cổng khác nhau, vị trí riêng đi được, mọi máy cùng Map ID + checksum bản đồ', () => {
  const sv = mkServer(); const { cs, room } = play(sv, 4); assert.equal(room.state, 'playing'); assert.equal(room.gates.length, 4); assert.equal(new Set(room.gates).size, 4);
  const pos = [...room.players.values()].map((p) => `${p.x},${p.y}`); assert.equal(new Set(pos).size, 4); for (const p of room.players.values()) assert.ok(room.grid.isWalkable(Math.floor(p.x), Math.floor(p.y)));
  const starts = cs.map((x) => x.c.last('start')); assert.ok(starts.every((m) => m.mapId === room.mapId && m.mapSum === starts[0].mapSum));
  assert.equal(starts[0].mapSum, mapChecksum(generateMap(room.mapId).tiles)); assert.deepEqual(starts[0].gates, starts[3].gates); assert.deepEqual(starts.map((m) => m.you), [1, 2, 3, 4]);
});
test('vàng/xây do server quyết định: vàng chung, xây trùng ô bị từ chối, lệnh gửi trùng không bị trừ 2 lần, client không tự đặt vàng', () => {
  const sv = mkServer(); const { cs, room } = play(sv, 2); const p0 = room.players.get(1), g0 = room.economy.gold; const cell = freeCell(room, p0);
  tx(cs[0].s, { t: 'cmd', id: 1, op: 'build', ...cell }); assert.equal(cs[0].c.last('res').ok, true); assert.equal(room.economy.gold, g0 - 60); assert.equal(room.ts.towers.length, 1);
  tx(cs[0].s, { t: 'cmd', id: 1, op: 'build', ...cell }); assert.equal(cs[0].c.last('res').dup, true); assert.equal(room.economy.gold, g0 - 60); assert.equal(room.ts.towers.length, 1);
  tx(cs[1].s, { t: 'cmd', id: 1, op: 'build', ...cell }); const r = cs[1].c.last('res'); assert.equal(r.ok, false); assert.equal(r.reason, 'occupied'); assert.equal(room.economy.gold, g0 - 60);
  tx(cs[1].s, { t: 'cmd', id: 2, op: 'gold', amount: 9999 }); assert.equal(cs[1].c.last('res').ok, false); tx(cs[1].s, { t: 'cmd', id: 3, op: 'build', x: 'a', y: null }); assert.equal(cs[1].c.last('res').ok, false); assert.equal(room.economy.gold, g0 - 60);
  tick(sv, 0.1); const snap = cs[1].c.last('snap'); assert.equal(snap.g, room.economy.gold); assert.equal(snap.tw.length, 1);
});
test('xây chặn hết đường bị từ chối với MỌI cổng/người chơi: đúng thông báo, không trừ vàng', () => {
  const sv = mkServer(); const { cs, room } = play(sv, 2); const g0 = room.economy.gold; const p = room.players.get(1), s = room.map.playerStart;
  const ring = []; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === 2) ring.push([s.x + dx, s.y + dy]);
  ring.slice(0, -1).forEach(([x, y]) => room.grid.setBlocked(x, y, true)); const last = ring.at(-1); // chừa đúng 1 ô để tháp mới đóng kín vòng quanh các người chơi
  for (const pl of room.players.values()) { pl.x = s.x + 0.5; pl.y = s.y + 0.5; }
  tx(cs[0].s, { t: 'cmd', id: 9, op: 'build', x: last[0], y: last[1] }); const r = cs[0].c.last('res');
  assert.equal(r.ok, false); assert.equal(r.reason, 'blocked'); assert.equal(r.message, 'KHÔNG THỂ XÂY THÁP - ĐƯỜNG DI CHUYỂN CỦA QUÁI VẬT BỊ CHẶN.'); assert.equal(room.economy.gold, g0); assert.equal(room.ts.towers.length, 0);
});
test('nâng cấp/nhánh/bán qua server: người khác thấy kết quả trong snapshot; vàng chung', () => {
  const sv = mkServer(); const { cs, room } = play(sv, 2); room.economy.add(1000); const cell = freeCell(room, room.players.get(1));
  tx(cs[0].s, { t: 'cmd', id: 1, op: 'build', ...cell }); tick(sv, 2.2); const t = room.ts.towers[0]; assert.equal(t.state, 'ready');
  tx(cs[1].s, { t: 'cmd', id: 1, op: 'upgrade', tid: t.id }); tx(cs[1].s, { t: 'cmd', id: 2, op: 'upgrade', tid: t.id }); assert.equal(t.level, 3); assert.equal(t.pending, 1);
  tx(cs[1].s, { t: 'cmd', id: 3, op: 'upgrade', tid: t.id }); assert.equal(cs[1].c.last('res').ok, false); tx(cs[1].s, { t: 'cmd', id: 4, op: 'pick', tid: t.id, branch: 'frost' }); assert.deepEqual(t.picks, ['frost']);
  tick(sv, 0.1); const evs = cs[0].c.msgs.filter((m) => m.t === 'snap').flatMap((m) => m.ev).filter((e) => e[0] === 'tw'); assert.ok(evs.some((e) => e[1] === 'upd' && e[2].picks[0] === 'frost'));
  const gold = room.economy.gold; tx(cs[0].s, { t: 'cmd', id: 5, op: 'sell', tid: t.id }); assert.equal(room.ts.towers.length, 0); assert.ok(room.economy.gold > gold);
});
test('kiểm tra di chuyển: bước hợp lệ nhận, dịch chuyển xa/xuyên vật cản bị từ chối và kéo về; xuyên vật thể do server cấp phép', () => {
  const sv = mkServer(); const { cs, room } = play(sv, 1); const p = room.players.get(1); const x0 = p.x, y0 = p.y;
  T0 += 0.1; tx(cs[0].s, { t: 'mv', x: x0 + 0.3, y: y0, f: 0 }); assert.equal(p.x, x0 + 0.3);
  T0 += 0.1; tx(cs[0].s, { t: 'mv', x: x0 + 12, y: y0 }); assert.equal(p.x, x0 + 0.3); assert.ok(cs[0].c.last('pos')); assert.equal(p.badMoves, 1);
  tx(cs[0].s, { t: 'mv', x: 'abc', y: NaN }); // không làm hỏng
  // tìm cây cạnh ô trống
  let tree = null; for (let y = 5; y < 95 && !tree; y++) for (let x = 5; x < 95; x++) if (room.map.tiles[y * 100 + x] === T.TREE && room.grid.isWalkable(x - 1, y)) { tree = { x, y }; break; }
  p.x = tree.x - 0.5; p.y = tree.y + 0.5; p.lastMv = null;
  const walk = () => { let ok = true; for (let i = 0; i < 6; i++) { T0 += 0.06; const before = p.x; tx(cs[0].s, { t: 'mv', x: p.x + 0.3, y: p.y }); if (p.x === before) ok = false; } return ok; };
  assert.equal(walk(), false); assert.ok(p.x < tree.x - 0.2, 'không xuyên cây khi thường');
  tx(cs[0].s, { t: 'cmd', id: 1, op: 'skill', name: 'phase' }); assert.equal(cs[0].c.last('res').ok, true); p.x = tree.x - 0.5; p.lastMv = null; assert.equal(walk(), true); assert.ok(p.x > tree.x, 'xuyên vật thể được phép');
  tx(cs[0].s, { t: 'cmd', id: 2, op: 'skill', name: 'phase' }); assert.equal(cs[0].c.last('res').ok, false);
  tick(sv, 5.2); assert.ok(!boxHit(room, p), 'hết hạn không kẹt trong vật cản');
});
const boxHit = (room, p) => !room.grid.isWalkable(Math.floor(p.x), Math.floor(p.y));
test('mất kết nối & kết nối lại: trạng thái trận không đổi, bị loại khỏi mục tiêu quái, rejoin bằng token, sai token bị từ chối, quá hạn thì bị loại', () => {
  const sv = mkServer(); const { cs, room, code } = play(sv, 2); room.economy.add(500); const cell = freeCell(room, room.players.get(1));
  tx(cs[0].s, { t: 'cmd', id: 1, op: 'build', ...cell }); tick(sv, 3); const gold = room.economy.gold, towers = room.ts.towers.length, b = room.players.get(2), token = b.token, px = b.x;
  cs[1].c.close(); assert.equal(b.connected, false); assert.equal(room.players.has(2), true); assert.ok(!room.targets().includes(b)); tick(sv, 10);
  assert.equal(room.ts.towers.length, towers); assert.ok(room.economy.gold >= gold); assert.equal(b.x, px);
  const n = client(sv); tx(n.s, { t: 'rejoin', code, token: 'bad' }); assert.equal(n.c.last('err').code, 'token');
  tx(n.s, { t: 'rejoin', code, token }); assert.equal(n.c.last('joined').rejoined, true); const st = n.c.last('start'); assert.equal(st.mapId, room.mapId); assert.equal(st.towers.length, towers); assert.equal(st.you, 2); assert.equal(b.connected, true); assert.ok(room.targets().includes(b));
  n.c.close(); tick(sv, RECONNECT_GRACE + 1); assert.equal(room.players.has(2), false); assert.equal(room.players.has(1), true);
});
test('hồi sinh & thua chung: bật hồi sinh thì sống lại sau thời gian; tất cả bị hạ => thua + thống kê; tắt hồi sinh thì không hồi', () => {
  const sv = mkServer(); const { cs, room } = play(sv, 2, { respawn: true }); const [a, b] = [room.players.get(1), room.players.get(2)];
  const kill = (p) => { for (let i = 0; i < 3; i++) { p.invuln = 0; p.takeDamage(1); } }; kill(a); assert.equal(a.dead, true); assert.equal(room.state, 'playing');
  tick(sv, RESPAWN_TIME - 1); assert.equal(a.dead, true); tick(sv, 1.2); assert.equal(a.dead, false); assert.equal(a.hp, 3);
  kill(a); kill(b); tick(sv, 0.1); assert.equal(room.state, 'ended'); const e = cs[0].c.last('end').stats; assert.equal(e.won, false); assert.ok('kills' in e && 'gold' in e && 'towers' in e && 'damage' in e && 'time' in e);
  const sv2 = mkServer(); const L = play(sv2, 2, { respawn: false }); const a2 = L.room.players.get(1); for (let i = 0; i < 3; i++) { a2.invuln = 0; a2.takeDamage(1); } tick(sv2, RESPAWN_TIME + 2); assert.equal(a2.dead, true);
});
test('đợt & đồng bộ: đợt 1 đúng giờ do server; snapshot khớp trạng thái server; chiến thắng sau đợt 100', () => {
  const sv = mkServer(); const { cs, room } = play(sv, 2); tick(sv, 14.9); assert.equal(room.director.wave, 0); tick(sv, 0.3); assert.equal(room.director.wave, 1);
  const full = (c) => c.of('snap').filter((m) => m.m).at(-1); const s0 = full(cs[0].c), s1 = full(cs[1].c); assert.equal(s0.w, 1); assert.deepEqual([s0.w, s0.g, s0.a, s0.m.length], [s1.w, s1.g, s1.a, s1.m.length]);
  room.tickN = 0; tick(sv, 0.05); const s = cs[0].c.last('snap'); assert.ok(s.m, 'tick chẵn gửi kèm quái'); assert.equal(s.m.length, room.world.monsters.length); assert.equal(s.a, room.world.active);
  room.director.wave = 100; room.director.queue.length = 0; for (const m of room.world.monsters.slice()) room.world.damage(m, 1e9); tick(sv, 1); assert.equal(room.state, 'ended'); assert.equal(cs[0].c.last('end').stats.won, true);
});
test('chống lạm dụng: JSON rác, tin quá lớn, tần suất quá cao đều không làm hỏng server', () => {
  const sv = mkServer(); const { cs, room } = play(sv, 1); const s = cs[0].s;
  s.conn.emit('message', '{not json'); s.conn.emit('message', 'x'.repeat(50000)); s.conn.emit('message', JSON.stringify({ t: 'cmd', op: { a: 1 }, id: {} })); s.conn.emit('message', JSON.stringify([1, 2])); s.conn.emit('message', JSON.stringify({ t: 'mv', x: 1e308, y: -1e308 }));
  for (let i = 0; i < 1000; i++) tx(s, { t: 'ping', n: i }); assert.ok(cs[0].c.of('pong').length < 300, 'bị giới hạn tần suất'); T0 += 5; tx(s, { t: 'ping', n: 1 }); assert.ok(cs[0].c.last('pong')); tick(sv, 1); assert.equal(room.state, 'playing');
});
