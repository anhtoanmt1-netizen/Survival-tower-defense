import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap, newRandomMapId, parseMapId } from '../src/map/index.js';
import { formatMapId, seedToCode } from '../src/map/mapId.js';
import { validateMap } from '../src/map/validate.js';
import { Grid } from '../src/map/grid.js';
import { findPath } from '../src/core/pathfinding.js';
import { T, isBlocking } from '../src/map/tiles.js';

test('tạo bản đồ 100x100 = 10.000 ô', () => {
  const m = generateMap('FOREST-2026-A8F72K');
  assert.equal(m.width, 100); assert.equal(m.height, 100); assert.equal(m.tiles.length, 10000);
});
test('cùng Map ID => cùng bản đồ; ID khác => khác', () => {
  const a = generateMap('FOREST-2026-A8F72K'), b = generateMap('forest-2026-a8f72k'), c = generateMap('FOREST-2026-A8F72M');
  assert.deepEqual(Buffer.from(a.tiles), Buffer.from(b.tiles));
  assert.notDeepEqual(Buffer.from(a.tiles), Buffer.from(c.tiles));
});
test('ID round-trip & từ chối ID sai', () => {
  const id = newRandomMapId(); const p = parseMapId(id); assert.ok(p.ok); assert.equal(p.id, id);
  assert.equal(seedToCode(0), '000000');
  for (const bad of ['', 'abc', 'FOREST-2026-A8F7', 'LAVA-2026-A8F72K', 'FOREST-1999-A8F72K', 'FOREST-2026-A8F72U', 'FOREST-2026-A8F72K-9999'])
    assert.equal(parseMapId(bad).ok, false, bad);
});
test('300 seed: bản đồ hợp lệ, không vùng bị cô lập, 8 cổng đều nối với trung tâm', () => {
  let worst = { narrow: 0, blocked: 0 };
  for (let s = 1; s <= 300; s++) {
    const id = formatMapId({ theme: 'FOREST', edition: 2026, seed: s * 2654435 & 0x3fffffff });
    const m = generateMap(id); const v = validateMap(m);
    assert.ok(v.ok, id + ' ' + v.errors.join(';'));
    worst.narrow = Math.max(worst.narrow, v.stats.narrowRatio); worst.blocked = Math.max(worst.blocked, v.stats.blockedRatio);
  }
  console.log('  worst narrow', worst.narrow.toFixed(3), 'worst blocked', worst.blocked.toFixed(3));
});
test('kích thước cấu hình được: 150x150 và 200x200', () => {
  for (const size of [150, 200]) {
    const id = newRandomMapId('FOREST', size); const m = generateMap(id);
    assert.equal(m.width, size); assert.equal(m.tiles.length, size * size); assert.ok(id.endsWith('-' + size));
    assert.deepEqual(Buffer.from(m.tiles), Buffer.from(generateMap(id).tiles));
  }
});
test('thống kê địa hình hợp lý (có cây, đá, sông, không quá dày)', () => {
  const sum = { tree: 0, rock: 0, river: 0 }; const n = 40;
  for (let s = 1; s <= n; s++) { const st = generateMap(formatMapId({ theme: 'FOREST', edition: 2026, seed: s * 7919 })).stats; sum.tree += st.tree; sum.rock += st.rock; sum.river += st.river; }
  const avg = Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, v / n])); console.log('  avg', avg);
  assert.ok(avg.tree > 0.1 && avg.tree < 0.3); assert.ok(avg.rock > 0.01 && avg.rock < 0.1); assert.ok(avg.river > 0.01 && avg.river < 0.12);
});
test('A*: tìm được đường từ tâm tới 8 cổng, không đi qua vật cản, không cắt góc', () => {
  const m = generateMap('FOREST-2026-A8F72K'); const g = new Grid(m);
  for (const gate of m.gates) {
    const p = findPath(g, m.playerStart.x, m.playerStart.y, gate.x, gate.y); assert.ok(p && p.length > 0, gate.name);
    let px = m.playerStart.x, py = m.playerStart.y;
    for (const n of p) {
      assert.ok(!isBlocking(g.tile(n.x, n.y)));
      if (n.x !== px && n.y !== py) { assert.ok(g.isWalkable(n.x, py) && g.isWalkable(px, n.y)); }
      px = n.x; py = n.y;
    }
  }
  g.extra.fill(1); g.extra[m.playerStart.y * 100 + m.playerStart.x] = 0;
  assert.equal(findPath(g, m.playerStart.x, m.playerStart.y, m.gates[0].x, m.gates[0].y), null);
});
