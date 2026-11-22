import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap, newRandomMapId, parseMapId } from '../src/map/index.js';
import { formatMapId } from '../src/map/mapId.js';
import { validateMap } from '../src/map/validate.js';
import { Grid } from '../src/map/grid.js';
import { findPath } from '../src/core/pathfinding.js';
import { EDITIONS, CURRENT_EDITION } from '../src/map/generators/index.js';
import { isBlocking } from '../src/map/tiles.js';

test('edition 2028 là mặc định cho bản đồ mới; 2026 và 2027 vẫn tái tạo được', () => {
  assert.equal(CURRENT_EDITION, 2028); assert.ok(EDITIONS[2026] && EDITIONS[2027]); assert.ok(newRandomMapId().includes('-2028-'));
  assert.ok(generateMap('FOREST-2026-A8F72K').tiles.length === 10000);
});
test('2027: cùng Map ID => cùng bản đồ; ID khác => khác', () => {
  const a = generateMap('FOREST-2027-A8F72K'), b = generateMap('forest-2027-a8f72k'), c = generateMap('FOREST-2027-A8F72M');
  assert.deepEqual(Buffer.from(a.tiles), Buffer.from(b.tiles)); assert.notDeepEqual(Buffer.from(a.tiles), Buffer.from(c.tiles));
});
test('2027: 300 seed đều hợp lệ (không vùng cô lập, 8 cổng nối trung tâm, lối >= 2 ô)', () => {
  const w = { narrow: 0, blocked: 0 };
  for (let s = 1; s <= 300; s++) {
    const id = formatMapId({ theme: 'FOREST', edition: 2027, seed: (s * 2654435) & 0x3fffffff }), v = validateMap(generateMap(id));
    assert.ok(v.ok, id + ' ' + v.errors.join(';')); w.narrow = Math.max(w.narrow, v.stats.narrowRatio); w.blocked = Math.max(w.blocked, v.stats.blockedRatio);
  }
  console.log('  2027 worst narrow', w.narrow.toFixed(3), 'worst blocked', w.blocked.toFixed(3));
});
test('2027: kích thước 40 / 150 / 200 hợp lệ và tái tạo đúng', () => {
  for (const size of [40, 150, 200]) {
    const id = formatMapId({ theme: 'FOREST', edition: 2027, seed: 4242 + size, size }), m = generateMap(id);
    assert.equal(m.tiles.length, size * size); assert.deepEqual(Buffer.from(m.tiles), Buffer.from(generateMap(id).tiles));
  }
});
test('2027: có bố cục ra dáng — có sông, cây, đá, đường đất; cây không chiếm quá nửa', () => {
  const sum = { tree: 0, rock: 0, river: 0, dirt: 0 }, n = 40;
  for (let s = 1; s <= n; s++) { const st = generateMap(formatMapId({ theme: 'FOREST', edition: 2027, seed: s * 7919 })).stats; for (const k of Object.keys(sum)) sum[k] += st[k] / n; }
  console.log('  2027 avg', sum);
  assert.ok(sum.tree > 0.1 && sum.tree < 0.35); assert.ok(sum.rock > 0.005 && sum.rock < 0.08); assert.ok(sum.river > 0.02 && sum.river < 0.12); assert.ok(sum.dirt > 0.05);
});
test('2027: từ trung tâm tới cả 8 cổng đều có đường A*, đường không quanh co quá mức', () => {
  for (const seed of [11, 222, 3333]) {
    const m = generateMap(formatMapId({ theme: 'FOREST', edition: 2027, seed })), g = new Grid(m);
    for (const gate of m.gates) {
      const p = findPath(g, m.playerStart.x, m.playerStart.y, gate.x, gate.y); assert.ok(p && p.length > 0, gate.name);
      const straight = Math.max(Math.abs(gate.x - m.playerStart.x), Math.abs(gate.y - m.playerStart.y)); assert.ok(p.length < straight * 1.8, `${gate.name} đường dài ${p.length} / thẳng ${straight}`);
      for (const n of p) assert.ok(!isBlocking(g.tile(n.x, n.y)));
    }
  }
});
test('2027: quanh quảng trường trung tâm và các cổng luôn trống', () => {
  const m = generateMap('FOREST-2027-ZZZ999'), g = new Grid(m);
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) assert.ok(g.isWalkable(m.playerStart.x + dx, m.playerStart.y + dy));
  for (const gate of m.gates) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) assert.ok(g.isWalkable(gate.x + dx, gate.y + dy), gate.name);
});
