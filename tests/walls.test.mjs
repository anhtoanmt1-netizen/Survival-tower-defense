import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { generateMap } from '../src/map/index.js';
import { formatMapId } from '../src/map/mapId.js';
import { Grid } from '../src/map/grid.js';
import { FlowField } from '../src/core/flowfield.js';
import { MonsterWorld } from '../src/sim/world.js';
import { TowerSystem } from '../src/sim/towers.js';
import { Economy } from '../src/sim/economy.js';
import { boxCollides, segmentClear } from '../src/sim/movement.js';
import { ECON } from '../src/config/economy.js';
import { mulberry32 } from '../src/core/rng.js';
import { GameServer } from '../server/gameServer.js';
import { PROTOCOL_VERSION, configChecksum, PALETTE } from '../src/net/protocol.js';
import { Mirror } from '../src/net/mirror.js';

const mapOf = (s) => generateMap(formatMapId({ theme: 'FOREST', edition: 2026, seed: (s * 104729) & 0x3fffffff }));
function setup(s = 1) {
  const m = mapOf(s), grid = new Grid(m), rng = mulberry32(1), economy = new Economy(), world = new MonsterWorld(grid, {}, rng);
  const events = [], ts = new TowerSystem({ grid, world, economy, gates: [m.gates[0]], rng, hooks: { onWallBuilt: (w) => events.push(['b', w.id]), onWallSold: (w) => events.push(['s', w.id]) } });
  return { m, grid, economy, ts, events, p: { x: m.playerStart.x + 0.5, y: m.playerStart.y + 0.5, r: 0.3, dead: false } };
}
const freeCell = (c) => { for (let r = 2; r < 15; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = c.m.playerStart.x + dx, y = c.m.playerStart.y + dy; if (c.ts.checkPlacement(x, y, [c.p], { ignoreGold: true, kind: 'wall' }).ok) return { x, y }; } };

test('tường: giá 5 vàng/ô (cố định), xây tức thì, ô trở thành vật cản, không xây trùng ô, không đủ vàng thì từ chối', () => {
  const c = setup(), cell = freeCell(c), g0 = c.economy.gold; assert.equal(ECON.wallCost, 5); assert.equal(c.ts.wallCost(), 5);
  const r = c.ts.buildWall(cell.x, cell.y, [c.p]); assert.equal(r.ok, true); assert.equal(c.economy.gold, g0 - 5); assert.equal(c.ts.walls.length, 1);
  assert.equal(c.grid.isWalkable(cell.x, cell.y), false); assert.equal(c.ts.wallAt(cell.x, cell.y).id, r.wall.id);
  assert.equal(c.ts.buildWall(cell.x, cell.y, [c.p]).reason, 'occupied'); assert.equal(c.ts.build(cell.x, cell.y, [c.p]).reason, 'occupied'); assert.equal(c.economy.gold, g0 - 5);
  const c2 = setup(); c2.economy.gold = 4; const cell2 = freeCell(c2); assert.equal(c2.ts.buildWall(cell2.x, cell2.y, [c2.p]).reason, 'gold'); assert.equal(c2.economy.gold, 4); assert.equal(c2.ts.walls.length, 0);
  assert.equal(c.ts.stats.built, 0); assert.equal(c.ts.stats.walls, 1); // tường không tính là tháp trong thống kê
});
test('tường: bán hoàn tiền, ô giải phóng, bản đồ đổi version để quái tính lại đường', () => {
  const c = setup(), cell = freeCell(c), { wall } = c.ts.buildWall(cell.x, cell.y, [c.p]), v = c.grid.version, g = c.economy.gold;
  const r = c.ts.sellWall(wall); assert.equal(r.ok, true); assert.equal(r.refund, Math.floor(5 * 0.6)); assert.equal(c.economy.gold, g + 3); assert.equal(c.grid.isWalkable(cell.x, cell.y), true); assert.ok(c.grid.version > v);
  assert.equal(c.ts.sellWall(wall).ok, false); assert.deepEqual(c.events.map((e) => e[0]), ['b', 's']);
});
test('tường: chặn quái thật sự (FlowField coi là vật cản) nhưng KHÔNG cho phép bịt kín hoàn toàn đường tới người chơi', () => {
  const c = setup(); c.economy.gold = 100000; const ps = c.m.playerStart; let blocked = 0, built = 0;
  for (let r = 1; r <= 2; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = ps.x + dx, y = ps.y + dy; if (!c.grid.isWalkable(x, y)) continue; const res = c.ts.buildWall(x, y, [c.p]); if (res.ok) built++; else if (res.reason === 'blocked') blocked++; }
  assert.ok(built > 0 && blocked > 0, `đã xây ${built}, bị từ chối vì chặn kín ${blocked}`);
  const ff = new FlowField(c.grid.width, c.grid.height); ff.compute(c.grid, [c.grid.targetTile(c.p)]); for (const w of c.ts.walls) assert.equal(ff.dist[w.y * c.grid.width + w.x], Infinity);
  const gate = c.m.gates[0]; let reach = false; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (c.grid.isWalkable(gate.x + dx, gate.y + dy) && ff.dist[(gate.y + dy) * c.grid.width + gate.x + dx] < Infinity) reach = true; assert.ok(reach, 'cổng vẫn có đường tới người chơi');
});
test('tường + kỹ năng Xuyên vật thể: người thường không đi qua tường, đang xuyên vật thể thì đi qua bình thường', () => {
  const c = setup(), cell = freeCell(c), x = cell.x + 0.5, y = cell.y + 0.5; c.ts.buildWall(cell.x, cell.y, [c.p]);
  assert.equal(boxCollides(c.grid, x, y, 0.3, false), true); assert.equal(boxCollides(c.grid, x, y, 0.3, true), false);
  assert.equal(segmentClear(c.grid, x - 2, y, x + 2, y, 0.3, true), true); assert.equal(segmentClear(c.grid, x - 2, y, x + 2, y, 0.3, false), false);
});
// ---------- máy chủ + gương ----------
class Fake extends EventEmitter { constructor() { super(); this.msgs = []; } send(s) { this.msgs.push(JSON.parse(s)); return true; } close() { this.emit('close'); } of(t) { return this.msgs.filter((m) => m.t === t); } last(t) { return this.of(t).at(-1); } }
test('máy chủ: lệnh wall/sellwall, sự kiện "wl", gói start có walls, Mirror dựng lại đúng và chặn ô', () => {
  let T0 = 0; const sv = new GameServer({ clock: () => T0 }), H = { v: PROTOCOL_VERSION, cfg: configChecksum() }, c = new Fake(), s = sv.connect(c), tx = (o) => c.emit('message', JSON.stringify(o));
  tx({ t: 'create', ...H, name: 'A', color: PALETTE[0] }); tx({ t: 'start' }); const room = sv.rooms.values().next().value, p = room.players.get(1), g0 = room.economy.gold;
  let cell; outer: for (let r = 2; r < 15; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = Math.floor(p.x) + dx, y = Math.floor(p.y) + dy; if (room.ts.checkPlacement(x, y, room.targets(), { ignoreGold: true, kind: 'wall' }).ok) { cell = { x, y }; break outer; } }
  tx({ t: 'cmd', id: 1, op: 'wall', ...cell }); assert.equal(c.last('res').ok, true); assert.equal(room.economy.gold, g0 - 5); assert.equal(room.ts.walls.length, 1);
  tx({ t: 'cmd', id: 1, op: 'wall', ...cell }); assert.equal(c.last('res').dup, true); assert.equal(room.economy.gold, g0 - 5);
  tx({ t: 'cmd', id: 2, op: 'wall', ...cell }); assert.equal(c.last('res').reason, 'occupied');
  T0 += 0.05; sv.tickAll(0.05); assert.ok(c.last('snap').ev.some((e) => e[0] === 'wl' && e[1] === 'add' && e[2].x === cell.x));
  const start = c.last('start'); tx({ t: 'rejoin', code: room.code, token: c.last('joined').you.token }); const st2 = c.last('start'); assert.equal(st2.walls.length, 1);
  const map = generateMap(start.mapId), mir = new Mirror({ map, gateIdx: start.gates, you: start.you, players: start.players }); mir.applyStart(st2); assert.equal(mir.grid.isWalkable(cell.x, cell.y), false); assert.equal(mir.ts.walls.length, 1);
  tx({ t: 'cmd', id: 3, op: 'sellwall', wid: room.ts.walls[0].id }); assert.equal(c.last('res').ok, true); assert.equal(room.ts.walls.length, 0); T0 += 0.05; sv.tickAll(0.05);
  for (const ev of c.last('snap').ev) mir.event(ev, false); assert.equal(mir.ts.walls.length, 0); assert.equal(mir.grid.isWalkable(cell.x, cell.y), true);
  sv.stop();
});
