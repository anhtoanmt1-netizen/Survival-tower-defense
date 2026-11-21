import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../src/map/index.js';
import { formatMapId } from '../src/map/mapId.js';
import { Grid } from '../src/map/grid.js';
import { MonsterWorld } from '../src/sim/world.js';
import { WaveDirector } from '../src/sim/director.js';
import { TowerSystem } from '../src/sim/towers.js';
import { Economy } from '../src/sim/economy.js';
import { DIFFICULTY_LIST, DIFFICULTIES, NEUTRAL, getDifficulty } from '../src/config/difficulty.js';
import { WAVE_SETTINGS } from '../src/config/waves.js';
import { ECON } from '../src/config/economy.js';
import { computeStats } from '../src/config/towers.js';
import { towerStage, TOWER_STAGE_LEVELS } from '../src/config/art.js';
import { settings, viewPresetOf, VIEW_PRESETS } from '../src/config/settings.js';
import { mulberry32 } from '../src/core/rng.js';

const mk = (diff) => {
  const m = generateMap(formatMapId({ theme: 'FOREST', edition: 2027, seed: 99 })), grid = new Grid(m), rng = mulberry32(5), economy = new Economy({ ...ECON, startGold: diff.startGold });
  const world = new MonsterWorld(grid, {}, rng, { contactDamage: diff.contactDamage }), gates = [m.gates[0]];
  const director = new WaveDirector({ grid, world, gates, rng, diff, maxActive: diff.maxActive, settings: { ...WAVE_SETTINGS, firstWaveDelay: diff.firstWaveDelay, interval: diff.waveInterval, spawnPerSecond: diff.spawnPerSecond } });
  const ts = new TowerSystem({ grid, world, economy, gates, rng, diff });
  return { m, grid, world, director, ts, economy };
};
test('5 cấp độ khó, Dễ = hành vi hiện tại nhưng máu ×1,5', () => {
  assert.deepEqual(DIFFICULTY_LIST.map((d) => d.id), ['easy', 'normal', 'hard', 'veryHard', 'nightmare']);
  const e = DIFFICULTIES.easy; assert.equal(e.hpMul, 1.5);
  for (const k of ['speedMul', 'countMul', 'rewardMul', 'towerDamageMul', 'towerRateMul', 'upgradeMul', 'bossHpMul', 'tierShift']) assert.equal(e[k], k === 'tierShift' ? 0 : 1, k);
  assert.equal(e.buildCost, ECON.buildCost); assert.equal(e.startGold, ECON.startGold); assert.equal(e.waveInterval, WAVE_SETTINGS.interval); assert.equal(getDifficulty('???').id, 'easy');
});
test('độ khó tăng đơn điệu: máu, số lượng, tốc độ, nhịp đợt, hồi chiêu, sát thương chạm', () => {
  const L = DIFFICULTY_LIST;
  for (let i = 1; i < L.length; i++) {
    const a = L[i - 1], b = L[i];
    for (const k of ['hpMul', 'countMul', 'speedMul', 'tierShift', 'spawnPerSecond', 'skillCdMul', 'bossHpMul', 'upgradeMul', 'buildCost', 'contactDamage']) assert.ok(b[k] >= a[k], `${b.id}.${k}`);
    assert.ok(b.waveInterval <= a.waveInterval && b.rewardMul <= a.rewardMul && b.startGold <= a.startGold && b.towerDamageMul <= a.towerDamageMul, b.id);
    assert.ok(b.hpMul > a.hpMul && b.countMul > a.countMul, 'khác biệt rõ rệt ' + b.id);
  }
});
test('giá mua tháp: Dễ/Thường/Khó giữ nguyên 60, chỉ Rất Khó và Ác Mộng tăng; luôn cố định khi xây nhiều tháp', () => {
  for (const id of ['easy', 'normal', 'hard']) assert.equal(DIFFICULTIES[id].buildCost, 60);
  assert.ok(DIFFICULTIES.veryHard.buildCost > 60 && DIFFICULTIES.nightmare.buildCost > DIFFICULTIES.veryHard.buildCost);
  for (const d of DIFFICULTY_LIST) { const c = mk(d); c.economy.gold = 99999; const p = { x: c.m.playerStart.x + 0.5, y: c.m.playerStart.y + 0.5, r: 0.3, dead: false }; let n = 0;
    for (let dx = 6; dx < 20 && n < 5; dx++) { const r = c.ts.build(c.m.playerStart.x + dx, c.m.playerStart.y + 6, [p]); if (r.ok) { n++; assert.equal(c.ts.buildCost(), d.buildCost); } } assert.ok(n >= 3); }
});
test('độ khó áp dụng đồng bộ: máu, số lượng, tốc độ, vàng thưởng của quái trong đợt', () => {
  const easy = mk(DIFFICULTIES.easy), nm = mk(DIFFICULTIES.nightmare);
  easy.director.wave = nm.director.wave = 29; easy.director.startWave(); nm.director.startWave();
  const avg = (q, k) => q.reduce((s, e) => s + e[k], 0) / q.length;
  assert.ok(nm.director.queue.length >= easy.director.queue.length * 2.5, 'số lượng');
  assert.ok(avg(nm.director.queue, 'hpMul') > avg(easy.director.queue, 'hpMul') * 7, 'máu');
  assert.ok(avg(nm.director.queue, 'speedMul') > avg(easy.director.queue, 'speedMul'), 'tốc độ');
  assert.equal(nm.director.queue[0].rewardMul, DIFFICULTIES.nightmare.rewardMul);
  assert.equal(nm.director.specFor(30).count, nm.director.queue.length, 'HUD và đợt thật dùng chung số lượng');
  assert.ok(nm.director.specFor(10).weights.red > 0 && easy.director.specFor(10).weights.red === 0, 'quái mạnh xuất hiện sớm hơn');
});
test('sức mạnh tháp và giá nâng cấp theo độ khó', () => {
  const a = mk(NEUTRAL), b = mk(DIFFICULTIES.nightmare); a.economy.gold = b.economy.gold = 1e6;
  const p = (c) => ({ x: c.m.playerStart.x + 0.5, y: c.m.playerStart.y + 0.5, r: 0.3, dead: false });
  const ta = a.ts.build(a.m.playerStart.x + 6, a.m.playerStart.y + 6, [p(a)]).tower, tb = b.ts.build(b.m.playerStart.x + 6, b.m.playerStart.y + 6, [p(b)]).tower;
  assert.ok(tb.stats.damage < ta.stats.damage); assert.equal(Math.round(b.ts.upgradeInfo(tb).cost), Math.round(a.ts.upgradeInfo(ta).cost * DIFFICULTIES.nightmare.upgradeMul));
  assert.equal(computeStats('archer', 3, [], { damage: 0.5, fireRate: 1 }).damage, computeStats('archer', 3, []).damage * 0.5);
});
test('tiến hóa hình tháp: LV1-4 dùng chung hình đầu, đổi ở LV5/7/9/12/15', () => {
  assert.deepEqual(TOWER_STAGE_LEVELS, [5, 7, 9, 12, 15]);
  const st = Array.from({ length: 15 }, (_, i) => towerStage(i + 1)); assert.deepEqual(st, [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 5]);
  const c = mk(NEUTRAL); c.economy.gold = 1e6; const p = { x: c.m.playerStart.x + 0.5, y: c.m.playerStart.y + 0.5, r: 0.3, dead: false };
  const t = c.ts.build(c.m.playerStart.x + 6, c.m.playerStart.y + 6, [p]).tower; t.state = 'ready'; const evolved = []; c.ts.hooks.onEvolve = (x) => evolved.push(x.level);
  for (let i = 0; i < 14; i++) { while (t.pending > 0) c.ts.pickBranch(t, 'volley'); c.ts.upgrade(t); }
  assert.deepEqual(evolved, [5, 7, 9, 12, 15]); assert.equal(t.stage, 5);
});
test('cài đặt: giá trị hợp lệ được giữ, giá trị sai bị chuẩn hóa; 3 chế độ camera khớp thanh kéo', () => {
  settings.set({ display: { view: 999, orientation: 'sideways', ratio: 'x' }, audio: { musicVol: 5 }, difficulty: 'zzz' });
  const d = settings.data; assert.ok(d.display.view <= 26 && ['portrait', 'landscape', 'auto'].includes(d.display.orientation) && d.audio.musicVol === 1 && d.difficulty === 'easy');
  assert.equal(viewPresetOf(VIEW_PRESETS.near), 'near'); assert.equal(viewPresetOf(VIEW_PRESETS.far), 'far'); assert.equal(viewPresetOf(VIEW_PRESETS.wide), 'wide'); assert.equal(viewPresetOf(11), null);
  assert.equal(VIEW_PRESETS.near, 9, 'Gần = giá trị hiện tại');
});
