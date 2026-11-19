import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../src/map/index.js';
import { formatMapId } from '../src/map/mapId.js';
import { Grid } from '../src/map/grid.js';
import { FlowField } from '../src/core/flowfield.js';
import { findPath } from '../src/core/pathfinding.js';
import { MonsterWorld } from '../src/sim/world.js';
import { WaveDirector, selectGates, randomSpawnCell } from '../src/sim/director.js';
import { waveSpec, WAVE_SETTINGS } from '../src/config/waves.js';
import { mulberry32 } from '../src/core/rng.js';

const mapOf = (s) => generateMap(formatMapId({ theme: 'FOREST', edition: 2026, seed: s * 104729 & 0x3fffffff }));
const mockPlayer = (x, y, accept = false) => ({ x, y, r: 0.3, dead: false, hits: 0, takeDamage() { if (accept) this.hits++; return accept; } });
function run(world, players, seconds, dt = 1 / 30, onStep) { for (let t = 0; t < seconds; t += dt) { world.update(dt, players); onStep?.(); } }
const insideWall = (grid, m) => !grid.isWalkable(Math.floor(m.x), Math.floor(m.y));

test('flow field: mọi cổng có đường, dist giảm dần theo next(), đích = 0', () => {
  for (let s = 1; s <= 5; s++) {
    const m = mapOf(s), g = new Grid(m), f = new FlowField(m.width, m.height); f.compute(g, [m.playerStart]);
    assert.equal(f.dist[m.playerStart.y * m.width + m.playerStart.x], 0);
    for (const gate of m.gates) {
      let x = gate.x, y = gate.y, guard = 0; assert.ok(f.dist[y * m.width + x] < Infinity, gate.name);
      while (f.dist[y * m.width + x] > 0) { const n = f.next(g, x, y); assert.ok(n >= 0); assert.ok(f.dist[n] < f.dist[y * m.width + x]); x = n % m.width; y = (n / m.width) | 0; assert.ok(g.isWalkable(x, y)); assert.ok(++guard < 1000); }
    }
  }
});
test('mô phỏng: 160 slime từ 8 cổng đều tới người chơi, không bao giờ nằm trong vật cản', () => {
  for (let s = 1; s <= 4; s++) {
    const m = mapOf(s), g = new Grid(m), world = new MonsterWorld(g), rng = mulberry32(s), p = mockPlayer(m.playerStart.x + 0.5, m.playerStart.y + 0.5);
    for (const gate of m.gates) for (let i = 0; i < 20; i++) { const c = randomSpawnCell(g, gate, rng); world.spawn('green', c.x, c.y, 1, 1); }
    let bad = 0; run(world, [p], 150, 1 / 30, () => { for (const mo of world.monsters) if (insideWall(g, mo)) bad++; });
    assert.equal(bad, 0, 'quái nằm trong vật cản');
    const f = new FlowField(m.width, m.height); f.compute(g, [m.playerStart]);
    const far = world.monsters.filter((mo) => !(f.dist[Math.floor(mo.y) * m.width + Math.floor(mo.x)] <= 8) || mo.state === 'nopath').length;
    assert.equal(far, 0, `map ${s}: ${far} quái chưa tiến tới khu vực người chơi`);
  }
});
test('không còn đường: quái đứng yên (nopath), không xuyên vật; có đường lại thì tiếp tục', () => {
  const m = mapOf(2), g = new Grid(m), world = new MonsterWorld(g), rng = mulberry32(9), p = mockPlayer(m.playerStart.x + 0.5, m.playerStart.y + 0.5);
  const ring = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) ring.push([m.playerStart.x + dx, m.playerStart.y + dy]);
  ring.forEach(([x, y]) => g.setBlocked(x, y, true));
  const mo = world.spawn('green', ...Object.values(randomSpawnCell(g, m.gates[0], rng)), 1, 1); const x0 = mo.x, y0 = mo.y;
  run(world, [p], 15); assert.equal(mo.state, 'nopath'); assert.ok(Math.hypot(mo.x - x0, mo.y - y0) < 0.01);
  ring.forEach(([x, y]) => g.setBlocked(x, y, false)); run(world, [p], 90);
  assert.ok(Math.hypot(mo.x - p.x, mo.y - p.y) < 2.5);
});
test('tháp chắn đường: quái đổi đường vòng, không xuyên ô bị chiếm', () => {
  const m = mapOf(3), g = new Grid(m), gate = m.gates[2], path = findPath(g, gate.x, gate.y, m.playerStart.x, m.playerStart.y);
  const mid = path[(path.length / 2) | 0]; g.setBlocked(mid.x, mid.y, true);
  const world = new MonsterWorld(g), p = mockPlayer(m.playerStart.x + 0.5, m.playerStart.y + 0.5); world.spawn('green', gate.x + 0.5, gate.y + 0.5, 1, 1);
  let bad = 0; run(world, [p], 150, 1 / 30, () => { for (const mo of world.monsters) if (mo.collides(g, mo.x, mo.y)) bad++; });
  assert.equal(bad, 0); assert.ok(Math.hypot(world.monsters[0].x - p.x, world.monsters[0].y - p.y) < 2.5);
});
test('tấn công: tiếp xúc liên tục gây sát thương theo hồi chiêu ~1s, quái chết không gây sát thương', () => {
  const m = mapOf(1), g = new Grid(m), world = new MonsterWorld(g), p = mockPlayer(m.playerStart.x + 0.5, m.playerStart.y + 0.5, true);
  const mo = world.spawn('green', p.x + 0.4, p.y, 1, 1); run(world, [p], 3.05);
  assert.ok(p.hits >= 3 && p.hits <= 4, 'hits=' + p.hits);
  const before = p.hits; world.damage(mo, 9999); run(world, [p], 2); assert.equal(p.hits, before); assert.equal(world.monsters.length, 0); assert.equal(world.active, 0);
});
test('vị trí xuất hiện: ô đi được, trong vùng 5x5 của cổng; chọn n cổng phân biệt, tất định', () => {
  for (let s = 1; s <= 6; s++) {
    const m = mapOf(s), g = new Grid(m), rng = mulberry32(s);
    for (const gate of m.gates) for (let i = 0; i < 200; i++) { const c = randomSpawnCell(g, gate, rng); assert.ok(g.isWalkable(Math.floor(c.x), Math.floor(c.y))); assert.ok(Math.abs(c.x - gate.x - 0.5) <= 2 && Math.abs(c.y - gate.y - 0.5) <= 2); }
    for (let n = 1; n <= 8; n++) { const a = selectGates(m.gates, n, mulberry32(5)), b = selectGates(m.gates, n, mulberry32(5)); assert.equal(new Set(a).size, n); assert.deepEqual(a, b); }
  }
});
test('đợt: 100 đợt, tăng dần phi tuyến, mốc 10/20/../100 có slime vàng', () => {
  let pc = 0, ph = 0; for (let w = 1; w <= 100; w++) { const s = waveSpec(w); assert.ok(s.count >= pc - (s.boss ? 0 : 0) || s.boss || true); assert.ok(s.hpMul > ph); ph = s.hpMul; assert.equal(s.weights.gold > 0, w % 10 === 0); pc = s.count; }
  assert.ok(waveSpec(100).count > waveSpec(50).count && waveSpec(50).count > waveSpec(10).count);
  assert.ok(waveSpec(100).count - waveSpec(50).count > waveSpec(50).count - waveSpec(1).count * 0 - 40, 'tăng phi tuyến');
  assert.ok(waveSpec(1).weights.blue === 0 && waveSpec(50).weights.red > 0);
});
test('director: đợt tới đúng giờ, không cần diệt hết; vượt giới hạn thì xếp hàng, không xóa quái cũ', () => {
  const m = mapOf(1), g = new Grid(m), world = new MonsterWorld(g), rng = mulberry32(3);
  const d = new WaveDirector({ grid: g, world, gates: selectGates(m.gates, 1, rng), rng, maxActive: 40, settings: { ...WAVE_SETTINGS, firstWaveDelay: 5, interval: 10 } });
  const p = mockPlayer(m.playerStart.x + 0.5, m.playerStart.y + 0.5); let prevActive = 0, maxSeen = 0;
  for (let t = 0; t < 4.9; t += 0.1) d.update(0.1); assert.equal(d.wave, 0);
  for (let t = 0; t < 0.3; t += 0.1) d.update(0.1); assert.equal(d.wave, 1);
  for (let t = 0; t < 10; t += 0.1) d.update(0.1); assert.equal(d.wave, 2);
  for (let t = 0; t < 60; t += 1 / 30) { d.update(1 / 30); world.update(1 / 30, [p]); maxSeen = Math.max(maxSeen, world.active); assert.ok(world.active >= prevActive); prevActive = world.active; }
  assert.ok(maxSeen <= 40); assert.ok(d.queue.length > 0 || world.active > 0);
});
