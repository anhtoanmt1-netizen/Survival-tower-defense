import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../src/map/index.js';
import { formatMapId } from '../src/map/mapId.js';
import { Grid } from '../src/map/grid.js';
import { MonsterWorld } from '../src/sim/world.js';
import { TowerSystem } from '../src/sim/towers.js';
import { Economy } from '../src/sim/economy.js';
import { ECON } from '../src/config/economy.js';
import { mulberry32 } from '../src/core/rng.js';

// Tháp và tường chiếm khối 2x2 ô; (x,y) = ô trên-trái. Giá giữ nguyên: tháp 60, tường 5 vàng / công trình.
const F = 2;
function setup() {
  const m = generateMap(formatMapId({ theme: 'FOREST', edition: 2026, seed: 104729 })), grid = new Grid(m), rng = mulberry32(1), economy = new Economy({ ...ECON, startGold: 100000 });
  const world = new MonsterWorld(grid, { onKill() {} }, rng), ts = new TowerSystem({ grid, world, economy, gates: [m.gates[0]], rng });
  return { m, grid, ts, economy, p: { x: m.playerStart.x + 0.5, y: m.playerStart.y + 0.5, r: 0.3, dead: false, takeDamage: () => false } };
}
const spot = (c, kind) => { const ps = c.m.playerStart; for (let r = 3; r < 20; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = ps.x + dx, y = ps.y + dy; if (c.ts.checkPlacement(x, y, [c.p], { kind }).ok) return { x, y }; } };

test('cấu hình: tháp và tường 2x2; giá tháp 60, tường 5', () => { assert.deepEqual(ECON.footprint, { tower: 2, wall: 2 }); assert.equal(ECON.buildCost, 60); assert.equal(ECON.wallCost, 5); });
test('tháp chiếm đủ 4 ô: chặn lưới, towerAt đúng ở cả 4 ô, bán thì trả lại cả 4 ô', () => {
  const c = setup(), { x, y } = spot(c, 'tower'), g0 = c.economy.gold; const r = c.ts.build(x, y, [c.p]); assert.ok(r.ok); assert.equal(c.economy.gold, g0 - 60);
  for (let j = 0; j < F; j++) for (let i = 0; i < F; i++) { assert.equal(c.grid.isWalkable(x + i, y + j), false); assert.equal(c.ts.towerAt(x + i, y + j), c.ts.towers[0]); }
  assert.equal(c.ts.towerAt(x + F, y), null); assert.ok(c.ts.sell(c.ts.towers[0]).ok);
  for (let j = 0; j < F; j++) for (let i = 0; i < F; i++) assert.equal(c.grid.isWalkable(x + i, y + j), true);
});
test('chồng một phần lên công trình khác bị từ chối; đặt sát cạnh thì được', () => {
  const c = setup(), { x, y } = spot(c, 'tower'); assert.ok(c.ts.build(x, y, [c.p]).ok);
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [-1, -1]]) assert.equal(c.ts.checkPlacement(x + dx, y + dy, [c.p], { kind: 'tower' }).reason, 'occupied');
  assert.equal(c.ts.checkPlacement(x, y, [c.p], { kind: 'wall' }).reason, 'occupied');
  const side = [[F, 0], [-F, 0], [0, F], [0, -F]].find(([dx, dy]) => c.ts.checkPlacement(x + dx, y + dy, [c.p], { kind: 'tower' }).ok); assert.ok(side, 'có ít nhất một vị trí sát cạnh xây được');
});
test('tường 2x2: chặn 4 ô, 5 vàng, bán hoàn vàng và mở lại 4 ô; ra ngoài bản đồ một phần bị từ chối', () => {
  const c = setup(), { x, y } = spot(c, 'wall'), g0 = c.economy.gold; assert.ok(c.ts.buildWall(x, y, [c.p]).ok); assert.equal(c.economy.gold, g0 - 5);
  for (let j = 0; j < F; j++) for (let i = 0; i < F; i++) { assert.equal(c.grid.isWalkable(x + i, y + j), false); assert.ok(c.ts.wallAt(x + i, y + j)); }
  assert.ok(c.ts.sellWall(c.ts.walls[0]).ok); for (let j = 0; j < F; j++) for (let i = 0; i < F; i++) assert.equal(c.grid.isWalkable(x + i, y + j), true);
  assert.equal(c.ts.checkPlacement(c.m.width - 1, 5, [c.p], { kind: 'tower' }).reason, 'bounds'); assert.equal(c.ts.checkPlacement(5, c.m.height - 1, [c.p], { kind: 'wall' }).reason, 'bounds');
});
test('không xây khối 2x2 đè lên nhân vật (chỉ cần chạm 1 ô)', () => {
  const c = setup(), ps = c.m.playerStart; assert.equal(c.ts.checkPlacement(ps.x - 1, ps.y - 1, [c.p], { kind: 'tower' }).reason, 'player');
});
