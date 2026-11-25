import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { GameServer } from '../server/gameServer.js';
import { GameSession } from '../src/net/gameSession.js';
import { PROTOCOL_VERSION, configChecksum, PALETTE } from '../src/net/protocol.js';
import { ECON } from '../src/config/economy.js';

// Tường trong chế độ nhiều người: server quyết định, máy khách (Mirror) nhận qua sự kiện 'wl' + trường walls khi vào lại.
class Fake extends EventEmitter { constructor(onMsg) { super(); this.onMsg = onMsg; this.msgs = []; } send(s) { const m = JSON.parse(s); this.msgs.push(m); this.onMsg?.(m); return true; } close() { this.emit('close'); } of(t) { return this.msgs.filter((m) => m.t === t); } last(t) { return this.of(t).pop(); } }
let T0 = 0; const clock = () => T0, HELLO = { v: PROTOCOL_VERSION, cfg: configChecksum() };
const tick = (sv, sec, dt = 0.05) => { for (let t = 0; t < sec - 1e-9; t += dt) { T0 += dt; sv.tickAll(dt); } };
function setup() {
  T0 = 0; const sv = new GameServer({ clock }), stub = { onmessage: null, inGame: false }, sess = new GameSession(stub), c = new Fake((m) => stub.onmessage(m)), s = sv.connect(c), tx = (o) => c.emit('message', JSON.stringify(o));
  tx({ t: 'create', ...HELLO, name: 'A', color: PALETTE[0] }); tx({ t: 'start' }); const room = [...sv.rooms.values()][0]; return { sv, sess, c, tx, room };
}
const cell = (room) => { const p = [...room.players.values()][0]; for (let r = 2; r < 15; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = Math.floor(p.x) + dx, y = Math.floor(p.y) + dy; if (room.ts.checkPlacement(x, y, room.targets(), { ignoreGold: true, kind: 'wall' }).ok) return { x, y }; } };

test('nhiều người: lệnh wall tạo tường trên server, trừ 5 vàng, máy khách thấy tường và ô bị chặn', () => {
  const { sv, sess, tx, room } = setup(); const { x, y } = cell(room), g0 = room.economy.gold;
  tx({ t: 'cmd', id: 1, op: 'wall', x, y }); assert.equal(room.ts.walls.length, 1); assert.equal(room.economy.gold, g0 - ECON.wallCost);
  tick(sv, 0.2); const mir = sess.mirror; assert.equal(mir.ts.walls.length, 1); assert.deepEqual([mir.ts.walls[0].x, mir.ts.walls[0].y], [x, y]); assert.equal(mir.grid.isWalkable(x, y), false);
});
test('nhiều người: sellwall hoàn vàng và gỡ tường ở cả server lẫn máy khách; id lạ bị từ chối', () => {
  const { sv, sess, c, tx, room } = setup(); const { x, y } = cell(room); tx({ t: 'cmd', id: 1, op: 'wall', x, y }); tick(sv, 0.2); const wid = room.ts.walls[0].id, g = room.economy.gold;
  tx({ t: 'cmd', id: 2, op: 'sellwall', wid: 9999 }); assert.equal(c.last('res').ok, false);
  tx({ t: 'cmd', id: 3, op: 'sellwall', wid }); assert.equal(c.last('res').ok, true); assert.ok(room.economy.gold > g); tick(sv, 0.2);
  assert.equal(room.ts.walls.length, 0); assert.equal(sess.mirror.ts.walls.length, 0); assert.equal(sess.mirror.grid.isWalkable(x, y), true);
});
test('nhiều người: vào lại phòng nhận đủ danh sách tường (trường walls trong start)', () => {
  const { sv, sess, tx, room } = setup(); const { x, y } = cell(room); tx({ t: 'cmd', id: 1, op: 'wall', x, y }); tick(sv, 0.2);
  const p = [...room.players.values()][0]; sess.mirror.removeWall(room.ts.walls[0].id); assert.equal(sess.mirror.ts.walls.length, 0);
  sess.mirror.applyStart(room.startMsg(p)); assert.equal(sess.mirror.ts.walls.length, 1);
});
