import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../src/map/index.js';
import { formatMapId } from '../src/map/mapId.js';
import { Grid } from '../src/map/grid.js';
import { FlowField } from '../src/core/flowfield.js';
import { MonsterWorld } from '../src/sim/world.js';
import { TowerSystem, MSG } from '../src/sim/towers.js';
import { Economy } from '../src/sim/economy.js';
import { computeStats, pendingPicks, TOWER_TYPES } from '../src/config/towers.js';
import { ECON, upgradeCost } from '../src/config/economy.js';
import { T } from '../src/map/tiles.js';
import { mulberry32 } from '../src/core/rng.js';

const mapOf = (s) => generateMap(formatMapId({ theme: 'FOREST', edition: 2026, seed: s * 104729 & 0x3fffffff }));
const player = (m) => ({ x: m.playerStart.x + 0.5, y: m.playerStart.y + 0.5, r: 0.3, dead: false, takeDamage: () => false });
function setup(s = 1, gateIdx = [0], rngSeed = 1) {
  const m = mapOf(s), grid = new Grid(m), rng = mulberry32(rngSeed), economy = new Economy();
  const world = new MonsterWorld(grid, { onKill: (mo) => economy.add(mo.cfg.reward) }, rng);
  const ts = new TowerSystem({ grid, world, economy, gates: gateIdx.map((i) => m.gates[i]), rng });
  return { m, grid, world, economy, ts, p: player(m), rng };
}
// ô xây hợp lệ gần người chơi
function freeCell(c, dx0 = 3, dy0 = 0) { for (let r = 0; r < 20; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = c.m.playerStart.x + dx0 + dx, y = c.m.playerStart.y + dy0 + dy; if (c.ts.checkPlacement(x, y, [c.p], { ignoreGold: true }).ok) return { x, y }; } }
const advance = (c, sec, dt = 1 / 30) => { for (let t = 0; t < sec; t += dt) { c.world.update(dt, [c.p]); c.ts.update(dt); c.economy.update(dt, c.ts.towers.length, c.ts.buildCost()); } };

test('chỉ số: tăng theo cấp; mốc nhánh LV3,5,7,9,12; hiệu ứng từng nhánh', () => {
  const a = computeStats('archer', 1, []), b = computeStats('archer', 10, []);
  assert.ok(b.damage > a.damage && b.range > a.range && b.fireRate > a.fireRate);
  const ms = TOWER_TYPES.archer.milestones; assert.deepEqual(ms.slice(0, 5), [3, 5, 7, 9, 12]);
  assert.equal(pendingPicks('archer', 2, []), 0); assert.equal(pendingPicks('archer', 3, []), 1); assert.equal(pendingPicks('archer', 5, ['frost']), 1);
  assert.equal(computeStats('archer', 3, ['volley']).arrows, 2); assert.equal(computeStats('archer', 9, ['volley', 'volley', 'volley', 'volley']).arrows, 2);
  assert.equal(computeStats('archer', 15, ['volley', 'volley', 'volley', 'volley', 'volley']).arrows, 3);
  const f = computeStats('archer', 3, ['frost']); assert.equal(f.slowPct, 0.25); assert.equal(f.kind, 'ice');
  assert.ok(computeStats('archer', 5, ['frost', 'frost']).slowDur > f.slowDur);
  const bn = computeStats('archer', 3, ['burn']); assert.equal(bn.burnDps, 4); assert.equal(bn.kind, 'fire');
  assert.ok(computeStats('archer', 9, ['burn', 'burn', 'burn', 'burn']).spreadChance > 0);
  assert.ok(computeStats('archer', 5, ['volley', 'volley']).fireRate > computeStats('archer', 5, []).fireRate);
});
test('kinh tế: 120 vàng xây được 2 tháp, giá CỐ ĐỊNH 60 (không tăng theo số tháp); nâng cấp 45/70; bán hoàn 60% tổng đầu tư', () => {
  const c = setup(); const a = freeCell(c); const r = c.ts.build(a.x, a.y, [c.p]); assert.ok(r.ok); assert.equal(c.economy.gold, 60);
  assert.equal(c.ts.buildCost(), 60); const b = freeCell(c, -3, 0); const r2 = c.ts.build(b.x, b.y, [c.p]); assert.ok(r2.ok); assert.equal(c.economy.gold, 0, 'tháp thứ 2 vẫn 60'); assert.equal(c.ts.buildCost(), 60);
  const b3 = freeCell(c, 0, 4); const r3 = c.ts.build(b3.x, b3.y, [c.p]); assert.equal(r3.ok, false); assert.equal(r3.reason, 'gold'); c.ts.sell(r2.tower); c.economy.gold = 60;
  assert.equal(upgradeCost(1), 45); assert.equal(upgradeCost(2), 70); assert.ok(upgradeCost(3) > 70 && upgradeCost(4) > upgradeCost(3));
  const t = r.tower; advance(c, 2.1); assert.equal(t.state, 'ready'); c.economy.add(100);
  assert.ok(c.ts.upgrade(t).ok); assert.equal(c.economy.gold, 60 + 100 - 45); assert.equal(t.invested, 105);
  const s = c.ts.sell(t); assert.equal(s.refund, 63); assert.equal(c.economy.gold, 60 + 100 - 45 + 63); assert.ok(c.grid.isWalkable(t.x, t.y)); assert.equal(c.ts.towers.length, 0);
});
test('điều kiện xây: cây/đá/sông/bụi, ngoài bản đồ, ô có tháp, ô có nhân vật; chống xây trùng', () => {
  const c = setup(2), { grid, m } = c; const find = (tt) => { for (let i = 0; i < m.tiles.length; i++) if (m.tiles[i] === tt) return { x: i % m.width, y: (i / m.width) | 0 }; };
  for (const [tt, reason] of [[T.TREE, 'terrain'], [T.ROCK, 'terrain'], [T.RIVER, 'terrain'], [T.BUSH, 'terrain']]) { const q = find(tt); assert.equal(c.ts.checkPlacement(q.x, q.y, [c.p]).reason, reason); }
  assert.equal(c.ts.checkPlacement(-1, 5, [c.p]).reason, 'bounds'); assert.equal(c.ts.checkPlacement(5, m.height, [c.p]).reason, 'bounds');
  assert.equal(c.ts.checkPlacement(m.playerStart.x, m.playerStart.y, [c.p]).reason, 'player');
  const a = freeCell(c); assert.ok(c.ts.build(a.x, a.y, [c.p]).ok); c.economy.add(500);
  const again = c.ts.build(a.x, a.y, [c.p]); assert.equal(again.reason, 'occupied'); assert.equal(c.ts.towers.length, 1); assert.equal(c.economy.gold, 60 + 500);
  assert.equal(grid.extra.reduce((s, v) => s + v, 0), 4); // tháp chiếm khối 2x2 = 4 ô
});
test('xây bị từ chối nếu chặn hết đường: đúng thông báo, không trừ vàng, không đổi bản đồ', () => {
  const c = setup(3), { m, grid } = c, s = m.playerStart; c.economy.add(1000);
  const ring = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) ring.push([s.x + dx, s.y + dy]);
  ring.slice(0, 7).forEach(([x, y]) => grid.setBlocked(x, y, true)); // chừa 1 ô cuối
  const last = ring[7], extraBefore = grid.extra.slice(), ver = grid.version, gold = c.economy.gold;
  const r = c.ts.build(last[0], last[1], [c.p]);
  assert.equal(r.ok, false); assert.equal(r.reason, 'blocked'); assert.equal(r.message, 'KHÔNG THỂ XÂY THÁP - ĐƯỜNG DI CHUYỂN CỦA QUÁI VẬT BỊ CHẶN.');
  assert.equal(c.economy.gold, gold); assert.deepEqual(grid.extra, extraBefore); assert.equal(grid.version, ver); assert.equal(c.ts.towers.length, 0);
});
test('kiểm tra đủ MỌI cổng đang hoạt động: một cổng bị cô lập thì từ chối', () => {
  const m = mapOf(4), gB = m.gates[4]; let cell = null;
  for (const gates of [[0], [0, 4]]) {
    const grid = new Grid(m), eco = new Economy(), world = new MonsterWorld(grid), ts = new TowerSystem({ grid, world, economy: eco, gates: gates.map((i) => m.gates[i]) }); eco.add(1000);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === 3) grid.setBlocked(gB.x + dx, gB.y + dy, true); // cô lập cổng 4
    const p = player(m), c = { m, p, ts, grid, economy: eco }; const a = cell || (cell = freeCell(c, 2, 0)), r = ts.checkPlacement(a.x, a.y, [p]);
    if (gates.length === 1) assert.ok(r.ok, 'chỉ cổng 0 hoạt động => xây được'); else assert.equal(r.reason, 'blocked');
  }
});
test('xây ngẫu nhiên nhiều tháp: sau mỗi lần xây vẫn còn đường từ cổng tới người chơi (kiểm chứng độc lập)', () => {
  for (let s = 1; s <= 3; s++) {
    const c = setup(s, [0, 3, 6]), rng = mulberry32(s); c.economy.add(100000); let built = 0;
    for (let i = 0; i < 400; i++) {
      const x = c.m.playerStart.x + Math.floor(rng() * 21) - 10, y = c.m.playerStart.y + Math.floor(rng() * 21) - 10;
      if (c.ts.build(x, y, [c.p]).ok) built++;
      const f = new FlowField(c.m.width, c.m.height); f.compute(c.grid, [c.m.playerStart]);
      for (const g of c.ts.gates) assert.ok([...Array(25).keys()].some((k) => { const gx = g.x + (k % 5) - 2, gy = g.y + ((k / 5) | 0) - 2; return c.grid.isWalkable(gx, gy) && f.dist[gy * c.m.width + gx] < Infinity; }));
    }
    assert.ok(built > 20, 'built=' + built);
  }
});
test('tháp: đang xây chưa bắn và đã chặn ô; xong thì tự bắn, diệt slime trong tầm, cộng vàng đúng; ngoài tầm không bắn', () => {
  const c = setup(1); const a = freeCell(c); const r = c.ts.build(a.x, a.y, [c.p]), t = r.tower;
  assert.ok(!c.grid.isWalkable(a.x, a.y)); const gold0 = c.economy.gold;
  const out = c.world.spawn('green', a.x + 0.5 + t.stats.range + 3, a.y + 0.5, 1, 0); out.speed = 0; // ngoài tầm
  const inn = c.world.spawn('green', a.x + 0.5 + 2, a.y + 0.5, 1, 0); inn.speed = 0;
  advance(c, 1.5); assert.equal(t.state, 'building'); assert.ok(inn.hp === inn.maxHp, 'chưa bắn khi đang xây');
  advance(c, 6); assert.equal(t.state, 'ready'); assert.ok(inn.dying || !inn.alive || inn.hp < inn.maxHp); assert.equal(c.economy.gold, gold0 + 8); assert.equal(out.hp, out.maxHp);
  assert.equal(c.ts.projectiles.length, 0); assert.ok(t.kills === 1);
});
test('nhánh liên hoàn: bắn đúng số mũi tên mỗi loạt; chí mạng nhân sát thương', () => {
  const c = setup(1); c.economy.add(2000); const a = freeCell(c), t = c.ts.build(a.x, a.y, [c.p]).tower; advance(c, 2.1);
  c.ts.upgrade(t); c.ts.upgrade(t); assert.equal(t.pending, 1); assert.equal(c.ts.upgrade(t).reason, 'pick', 'phải chọn nhánh trước khi nâng tiếp');
  assert.ok(c.ts.pickBranch(t, 'volley').ok); assert.equal(t.stats.arrows, 2); assert.equal(c.ts.pickBranch(t, 'frost').reason, 'nopick');
  const m1 = c.world.spawn('green', a.x + 3.5, a.y + 0.5, 100, 0); m1.speed = 0; t.stats.critChance = 0; let shot = 0; c.ts.hooks.onShoot = () => shot++;
  c.ts.update(0.01); assert.equal(c.ts.projectiles.length, 2);
  const pr = c.ts.projectiles[0]; assert.ok(Math.abs(pr.dmg - t.stats.damage) < 1e-9);
  t.stats.critChance = 1; t.cd = 0; c.ts.projectiles.length = 0; c.ts.update(0.01); assert.ok(Math.abs(c.ts.projectiles[0].dmg - t.stats.damage * t.stats.critMult) < 1e-9);
});
test('nhánh băng: làm chậm mục tiêu và lan sang quái ở gần; hết hạn thì hồi tốc độ', () => {
  const c = setup(1); c.economy.add(2000); const a = freeCell(c), t = c.ts.build(a.x, a.y, [c.p]).tower; advance(c, 2.1);
  c.ts.upgrade(t); c.ts.upgrade(t); c.ts.pickBranch(t, 'frost'); for (let i = 0; i < 2; i++) { c.ts.upgrade(t); } // LV4,5
  c.ts.pickBranch(t, 'frost'); c.ts.upgrade(t); c.ts.upgrade(t); c.ts.upgrade(t); c.ts.pickBranch(t, 'frost'); // tier3: radius 1
  assert.ok(t.stats.slowRadius >= 1);
  const m1 = c.world.spawn('purple', a.x + 3, a.y + 0.5, 50, 0), m2 = c.world.spawn('purple', a.x + 3.6, a.y + 0.5, 50, 0), far = c.world.spawn('purple', a.x + 3, a.y - 2.9, 50, 0);
  for (const m of [m1, m2, far]) m.speed = 0.5;
  advance(c, 1.2); assert.ok(m1.slowT > 0 && m1.slow < 1); assert.ok(m2.slowT > 0, 'băng lan'); assert.ok(far.slowT === 0 || Math.hypot(far.x - m1.x, far.y - m1.y) <= t.stats.slowRadius);
  c.ts.towers.length = 0; c.grid.setBlocked(a.x, a.y, false); advance(c, 12); assert.equal(m1.slowT, 0); assert.equal(m1.slow, 1);
});
test('nhánh thiêu đốt: sát thương theo thời gian; chết khi đang cháy lan lửa sang quái gần', () => {
  const c = setup(1, [0], 7); c.economy.add(2000); const a = freeCell(c), t = c.ts.build(a.x, a.y, [c.p]).tower; advance(c, 2.1);
  c.ts.upgrade(t); c.ts.upgrade(t); c.ts.pickBranch(t, 'burn'); assert.equal(t.stats.burnDps, 4);
  const m1 = c.world.spawn('green', a.x + 3, a.y + 0.5, 100, 0); m1.speed = 0; c.ts.update(2); c.ts.update(0.01); // đã bắn
  advance(c, 1); assert.ok(m1.burnT > 0 && m1.hp < m1.maxHp - t.stats.damage + 0.001, 'cháy gây thêm sát thương');
  // lan lửa
  const w = c.world; w.rng = () => 0; const v = w.spawn('green', 20.5, 20.5, 1, 0), n1 = w.spawn('green', 21.5, 20.5, 5, 0), n2 = w.spawn('green', 30.5, 30.5, 5, 0);
  for (const mo of [v, n1, n2]) mo.speed = 0; w.ignite(v, { burnDps: 4, burnDur: 3, spreadChance: 1, spreadRadius: 1.8 }); w.damage(v, 9999);
  assert.ok(n1.burnT > 0, 'lan sang slime ở gần'); assert.equal(n2.burnT, 0, 'không lan quá bán kính');
});
test('đặt lại nhánh tốn phí; không đủ vàng thì không đặt lại', () => {
  const c = setup(1); c.economy.add(300); const a = freeCell(c), t = c.ts.build(a.x, a.y, [c.p]).tower; advance(c, 2.1); c.ts.upgrade(t); c.ts.upgrade(t); c.ts.pickBranch(t, 'burn');
  const g = c.economy.gold; assert.ok(c.ts.resetPicks(t).ok); assert.equal(c.economy.gold, g - ECON.resetBranchCost); assert.equal(t.pending, 1); assert.equal(t.stats.burnDps, 0);
  c.ts.pickBranch(t, 'frost'); c.economy.gold = 5; assert.equal(c.ts.resetPicks(t).ok, false); assert.deepEqual(t.picks, ['frost']);
});
test('chống kẹt: hết tháp và hết vàng vẫn có vàng để xây lại 1 tháp', () => {
  const c = setup(1); c.economy.gold = 0; let t = 0; while (c.economy.gold < c.ts.buildCost() && t < 120) { c.economy.update(0.5, 0, c.ts.buildCost()); t += 0.5; }
  assert.ok(c.economy.gold >= c.ts.buildCost()); c.economy.gold = 10; c.economy.update(100, 1, 60); assert.equal(c.economy.gold, 10, 'có tháp thì không có trợ cấp');
});
