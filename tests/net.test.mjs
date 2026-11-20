import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { GameServer } from '../server/gameServer.js';
import { createServer } from '../server/index.js';
import { NetClient } from '../src/net/client.js';
import { GameSession } from '../src/net/gameSession.js';
import { Mirror } from '../src/net/mirror.js';
import { generateMap } from '../src/map/index.js';
import { PROTOCOL_VERSION, configChecksum, PALETTE } from '../src/net/protocol.js';
import { NodeWebSocket } from './helpers/ws-client.mjs';
const WS = globalThis.WebSocket || NodeWebSocket; // Node 20 chưa có WebSocket toàn cục => dùng client dự phòng
const mkClient = (url) => new NetClient(url, { WS });

class Fake extends EventEmitter { constructor() { super(); this.msgs = []; } send(s) { this.msgs.push(JSON.parse(s)); return true; } close() { this.emit('close'); } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(cond, ms = 5000, what = 'điều kiện') { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return; await sleep(15); } throw new Error('Hết thời gian chờ: ' + what); }
const HELLO = { v: PROTOCOL_VERSION, cfg: configChecksum() };

test('gương máy khách khớp trạng thái server: quái, tháp, vàng, đợt, người chơi; tháp bán/xây cập nhật lưới', () => {
  let T0 = 0; const sv = new GameServer({ clock: () => T0 }), c = new Fake(), s = sv.connect(c), tx = (o) => c.emit('message', JSON.stringify(o));
  tx({ t: 'create', ...HELLO, name: 'A', color: PALETTE[0] }); tx({ t: 'start' }); const room = [...sv.rooms.values()][0], start = c.msgs.find((m) => m.t === 'start');
  const map = generateMap(start.mapId), freed = []; const mir = new Mirror({ map, gateIdx: start.gates, you: start.you, players: start.players, hooks: { onFree: (m) => freed.push(m.id) } }); mir.applyStart(start);
  let seen = c.msgs.length; const feed = () => { for (const m of c.msgs.slice(seen)) if (m.t === 'snap') mir.applySnapshot(m); seen = c.msgs.length; };
  const tick = (sec) => { for (let t = 0; t < sec; t += 0.05) { T0 += 0.05; sv.tickAll(0.05); feed(); } };
  room.economy.add(500); const p = room.players.get(1); let cell; for (let dx = 2; dx < 10 && !cell; dx++) if (room.ts.checkPlacement(Math.floor(p.x) + dx, Math.floor(p.y), room.targets(), { ignoreGold: true }).ok) cell = { x: Math.floor(p.x) + dx, y: Math.floor(p.y) };
  tx({ t: 'cmd', id: 1, op: 'build', ...cell }); tick(2.5); assert.equal(mir.ts.towers.length, 1); assert.equal(mir.grid.isWalkable(cell.x, cell.y), false); assert.equal(mir.ts.towers[0].state, 'ready');
  tx({ t: 'cmd', id: 2, op: 'upgrade', tid: room.ts.towers[0].id }); tx({ t: 'cmd', id: 3, op: 'upgrade', tid: room.ts.towers[0].id }); tx({ t: 'cmd', id: 4, op: 'pick', tid: room.ts.towers[0].id, branch: 'burn' }); tick(0.2);
  assert.equal(mir.ts.towers[0].level, 3); assert.deepEqual(mir.ts.towers[0].picks, ['burn']); assert.equal(mir.ts.towers[0].stats.burnDps, 4);
  tick(40); room.tickN = 0; tick(0.05); mir.smooth(1); // ép 1 snapshot đầy đủ (có quái) rồi so sánh
  assert.equal(mir.director.wave, room.director.wave); assert.ok(mir.director.wave >= 1); assert.equal(mir.economy.gold, room.economy.gold); assert.equal(mir.world.monsters.length, room.world.monsters.length);
  for (const sm of room.world.monsters) { const mm = mir.byId.get(sm.id); assert.ok(mm); assert.ok(Math.abs(mm.x - sm.x) < 0.02 && Math.abs(mm.y - sm.y) < 0.02); assert.equal(mm.type, sm.type); }
  assert.equal(mir.world.kills, room.world.kills); assert.equal(mir.me.hp, p.hp); assert.ok(Math.abs(mir.me.tx - p.x) < 0.01);
  tx({ t: 'cmd', id: 5, op: 'sell', tid: room.ts.towers[0].id }); tick(0.2); assert.equal(mir.ts.towers.length, 0); assert.equal(mir.grid.isWalkable(cell.x, cell.y), true);
  tx({ t: 'cmd', id: 6, op: 'skill', name: 'invincible' }); tick(0.2); assert.ok(mir.me.t.invA > 4 && mir.me.inv); assert.ok(mir.me.t.invC > 290);
});

test('ĐẦU-CUỐI qua WebSocket thật (localhost): tạo/vào phòng, bắt đầu, đồng bộ 2 máy, xây tháp, mất kết nối + tự vào lại', async () => {
  const srv = createServer({ port: 0 }); const port = await srv.listen(), url = `ws://127.0.0.1:${port}/ws`;
  try {
    const mk = (name) => { const c = mkClient(url), g = new GameSession(c); g.name = name; g.log = []; const base = g.onMsg.bind(g); g.onMsg = (m) => { g.log.push(m.t); base(m); }; c.onmessage = (m) => g.onMsg(m); return { c, g }; };
    const A = mk('A'), B = mk('B'); await A.c.connect(); await B.c.connect();
    A.c.send({ t: 'create', ...A.c.hello(), name: 'Alice', color: PALETTE[0] }); await until(() => A.g.room, 3000, 'A tạo phòng'); const code = A.g.room.code; assert.match(code, /^[A-Z2-9]{6}$/);
    B.c.send({ t: 'join', ...B.c.hello(), code, name: 'Bob', color: PALETTE[0] }); await until(() => B.g.room && A.g.room.players.length === 2, 3000, 'B vào phòng');
    assert.notEqual(A.g.room.players[0].color, A.g.room.players[1].color, 'không trùng màu');
    A.c.send({ t: 'start' }); await until(() => A.g.mirror && B.g.mirror, 4000, 'cả hai nhận start'); assert.equal(A.g.mirror.map.id, B.g.mirror.map.id); assert.equal(A.g.mirror.activeGates.length, 2);
    await until(() => A.g.mirror.time > 0.3 && B.g.mirror.time > 0.3, 3000, 'nhận snapshot');
    // di chuyển của A thấy được ở máy B
    const me = A.g.mirror.me, bobSeesA = () => B.g.mirror.players.get(A.g.mirror.you); const x0 = me.tx;
    for (let i = 0; i < 4; i++) { A.c.send({ t: 'mv', x: x0 + 0.2 * (i + 1), y: me.ty, f: 0 }); await sleep(60); }
    await until(() => Math.abs(bobSeesA().tx - (x0 + 0.8)) < 0.05, 3000, 'B thấy A di chuyển');
    // B xây tháp: cả hai thấy, vàng chung giảm đúng 1 lần dù gửi lệnh 2 lần cùng id
    const g0 = B.g.mirror.economy.gold, mB = B.g.mirror; let cell; const pl = [...mB.players.values()];
    for (let r = 2; r < 8 && !cell; r++) for (let dx = -r; dx <= r && !cell; dx++) { const x = Math.floor(me.tx) + dx, y = Math.floor(me.ty) + r; if (mB.ts.checkPlacement(x, y, pl, { ignoreGold: true }).ok) cell = { x, y }; }
    const id = B.c.cmd('build', cell); B.c.send({ t: 'cmd', id, op: 'build', ...cell }); await until(() => A.g.mirror.ts.towers.length === 1 && B.g.mirror.ts.towers.length === 1, 3000, 'tháp xuất hiện ở cả hai');
    await sleep(150); assert.equal(A.g.mirror.economy.gold, B.g.mirror.economy.gold); assert.equal(g0 - A.g.mirror.economy.gold - 0, 60, 'chỉ trừ vàng 1 lần'); // 60 vàng (chưa có quái bị diệt)
    // mất kết nối của B: bị đóng đột ngột => tự kết nối lại và vào lại đúng phòng/người chơi
    const sroom = [...srv.game.rooms.values()][0], bplayer = sroom.players.get(B.g.mirror.you); B.c.ws.close(); await until(() => !bplayer.connected, 3000, 'server phát hiện B rớt');
    assert.equal(sroom.ts.towers.length, 1, 'trạng thái trận không đổi khi B rớt');
    await until(() => bplayer.connected, 8000, 'B tự vào lại'); await until(() => B.c.status === 'open' && B.g.log.filter((t) => t === 'start').length >= 2, 4000, 'B nhận lại trạng thái');
    await until(() => Math.abs(B.g.mirror.time - A.g.mirror.time) < 1.0, 3000, 'B bắt kịp thời gian'); assert.equal(B.g.mirror.ts.towers.length, 1); assert.equal(B.g.mirror.you, bplayer.id);
    // tin nhắn quá lớn bị server đóng kết nối, không sập
    const evil = mkClient(url); await evil.connect(); evil.ws.send('x'.repeat(40000)); await until(() => evil.status === 'closed', 3000, 'đóng kết nối tin quá lớn'); assert.equal((await fetch(`http://127.0.0.1:${port}/health`)).status, 200);
    A.c.close(); B.c.close();
  } finally { srv.close(); }
});
test('đường dẫn WebSocket sai bị từ chối; /health hoạt động', async () => {
  const srv = createServer({ port: 0 }); const port = await srv.listen();
  try { const bad = mkClient(`ws://127.0.0.1:${port}/nope`); await assert.rejects(bad.connect(3000), /Không kết nối|Kết nối bị đóng/); /* đúng lý do, không phải lỗi khác */ const j = await (await fetch(`http://127.0.0.1:${port}/health`)).json(); assert.equal(j.ok, true); } finally { srv.close(); }
});
