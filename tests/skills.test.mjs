import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../src/map/index.js';
import { formatMapId } from '../src/map/mapId.js';
import { Grid } from '../src/map/grid.js';
import { SkillSet } from '../src/sim/skills.js';
import { Player } from '../src/entities/Player.js';
import { MonsterWorld } from '../src/sim/world.js';
import { SKILLS, SPEED_UPGRADE, speedUpgradeCost } from '../src/config/skills.js';
import { waveSpec } from '../src/config/waves.js';
import { T, isBlocking } from '../src/map/tiles.js';

const any = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k in t ? t[k] : any()), apply: () => any(), set: (t, k, v) => { t[k] = v; return true; } });
const mapOf = (s) => generateMap(formatMapId({ theme: 'FOREST', edition: 2026, seed: s * 104729 & 0x3fffffff }));
const mk = (s = 1) => { const m = mapOf(s), grid = new Grid(m); return { m, grid, p: new Player(any(), grid, m.playerStart.x + 0.5, m.playerStart.y + 0.5, { name: 'T', shirt: '#d94f4f' }) }; };
const tick = (p, sec, vec, dt = 1 / 30) => { for (let t = 0; t < sec; t += dt) p.update(dt, vec); };

test('hai kỹ năng: Bất tử 5s/hồi 5 phút, Xuyên vật thể 5s/hồi 3 phút; không dùng được khi đang hồi', () => {
  assert.equal(SKILLS.invincible.duration, 5); assert.equal(SKILLS.invincible.cooldown, 300); assert.equal(SKILLS.phase.duration, 5); assert.equal(SKILLS.phase.cooldown, 180);
  const s = new SkillSet(); assert.ok(s.use('invincible')); assert.equal(s.use('invincible'), false);
  for (let t = 0; t < 4.9; t += 0.1) s.update(0.1); assert.ok(s.isActive('invincible'));
  for (let t = 0; t < 0.2; t += 0.1) s.update(0.1); assert.ok(!s.isActive('invincible')); assert.ok(s.remainingCd('invincible') > 290);
  assert.equal(s.can('invincible'), false); for (let t = 0; t < 295; t += 1) s.update(1); assert.ok(s.can('invincible'));
  assert.ok(s.use('phase')); for (let t = 0; t < 179; t += 1) s.update(1); assert.equal(s.can('phase'), false); s.update(1.5); assert.ok(s.can('phase'));
  assert.ok(s.can('phase') && s.can('invincible'), 'hai kỹ năng độc lập');
});
test('Bất tử: không nhận sát thương trong 5s, hết hiệu lực thì nhận lại', () => {
  const { p } = mk(); assert.ok(p.useSkill('invincible'));
  assert.equal(p.takeDamage(1), false); assert.equal(p.hp, 3); tick(p, 4.8); assert.equal(p.takeDamage(1), false); tick(p, 0.4);
  assert.equal(p.takeDamage(1), true); assert.equal(p.hp, 2);
});
test('Xuyên vật thể: đi xuyên cây/đá/sông/tháp nhưng không ra ngoài bản đồ; hết hạn không bị kẹt trong vật cản', () => {
  for (let s = 1; s <= 6; s++) {
    const { m, grid, p } = mk(s); // tìm hàng có vật cản phía phải
    let sx = -1, sy = -1; for (let y = 10; y < 90 && sx < 0; y++) for (let x = 10; x < 80; x++) { if (grid.isWalkable(x, y) && [1, 2, 3].some((d) => isBlocking(grid.tile(x + d, y)))) { sx = x; sy = y; break; } }
    p.x = sx + 0.5; p.y = sy + 0.5; assert.ok(p.useSkill('phase')); let inside = false;
    for (let t = 0; t < 1.5; t += 1 / 30) { p.update(1 / 30, { x: 1, y: 0 }); if (!grid.isWalkable(Math.floor(p.x), Math.floor(p.y))) inside = true; }
    assert.ok(inside, 'map ' + s + ': phải đi vào được ô vật cản');
    tick(p, 4, { x: 1, y: 0 }); // chạy tiếp tới biên
    assert.ok(p.x <= m.width - p.r + 1e-6 && p.x >= p.r, 'không ra ngoài bản đồ'); assert.ok(!p.skills.isActive('phase'));
    assert.equal(p.collides(p.x, p.y), false, 'sau khi hết hạn phải ở vị trí hợp lệ'); assert.ok(grid.isWalkable(Math.floor(p.x), Math.floor(p.y)));
  }
});
test('Xuyên vật thể hết hạn khi đang đứng giữa vật cản/tháp: được đưa về ô đi được gần nhất', () => {
  const { grid, p, m } = mk(2); const c = { x: m.playerStart.x + 4, y: m.playerStart.y };
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) grid.setBlocked(c.x + dx, c.y + dy, true); // cụm tháp 3x3
  p.x = c.x + 0.5; p.y = c.y + 0.5; p.skills.use('phase'); let ended = false; p.onPhaseEnd = () => { ended = true; };
  tick(p, 5.2, null); assert.ok(ended); assert.equal(p.collides(p.x, p.y), false); assert.ok(grid.isWalkable(Math.floor(p.x), Math.floor(p.y)));
  assert.ok(Math.hypot(p.x - c.x, p.y - c.y) < 4, 'chỉ dịch chuyển tới ô hợp lệ gần nhất');
});
test('khi nhân vật đang trong vật cản, quái vẫn có đích hợp lệ (ô đi được gần nhất) thay vì mất đường', () => {
  const { grid, p, m } = mk(3); let tx = -1, ty = -1; for (let i = 0; i < m.tiles.length; i++) if (m.tiles[i] === T.TREE) { const x = i % m.width, y = (i / m.width) | 0; if (Math.abs(x - 50) < 25 && Math.abs(y - 50) < 25) { tx = x; ty = y; break; } }
  p.x = tx + 0.5; p.y = ty + 0.5; const w = new MonsterWorld(grid); w.spawn('green', m.gates[0].x + 0.5, m.gates[0].y + 0.5, 1, 1);
  for (let t = 0; t < 2; t += 1 / 30) w.update(1 / 30, [p]); assert.notEqual(w.monsters[0].state, 'nopath');
});
test('nâng tốc độ chạy: tăng theo cấp, giá tăng dần, có cấp tối đa', () => {
  const { p } = mk(); const v0 = p.moveSpeed(); p.speedLevel = 3; assert.ok(Math.abs(p.moveSpeed() - v0 * (1 + 3 * SPEED_UPGRADE.perLevel)) < 1e-9);
  for (let l = 1; l < SPEED_UPGRADE.maxLevel; l++) assert.ok(speedUpgradeCost(l) > speedUpgradeCost(l - 1)); assert.equal(speedUpgradeCost(0), 40);
});
test('phần thưởng vàng tăng theo độ khó; slime mang phần thưởng đã nhân hệ số đợt', () => {
  assert.ok(waveSpec(50).rewardMul > waveSpec(1).rewardMul && waveSpec(100).rewardMul > waveSpec(50).rewardMul);
  const { grid } = mk(); const w = new MonsterWorld(grid), m = w.spawn('green', 10.5, 10.5, 1, 1, waveSpec(50).rewardMul); assert.equal(m.reward, Math.round(8 * waveSpec(50).rewardMul)); assert.equal(w.spawn('gold', 10.5, 10.5, 1, 1).reward, 25);
});
