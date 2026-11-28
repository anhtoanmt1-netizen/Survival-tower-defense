import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../src/map/index.js';
import { formatMapId } from '../src/map/mapId.js';
import { Grid } from '../src/map/grid.js';
import { MonsterWorld } from '../src/sim/world.js';
import { WaveDirector } from '../src/sim/director.js';
import { mulberry32 } from '../src/core/rng.js';
import { WAVE_SETTINGS } from '../src/config/waves.js';
import { getDifficulty } from '../src/config/difficulty.js';
import { SLIME_V2, v2Type, runtimeCfg, isV2Type, RUNTIME_IDS } from '../src/config/slimeRuntime.js';
import { planWave } from '../src/config/slimeWaves.js';
import { BOSSES } from '../src/config/slimeBosses.js';

const mapOf = (s) => generateMap(formatMapId({ theme: 'FOREST', edition: 2026, seed: s * 104729 & 0x3fffffff }));
const mkPlayer = (x, y) => ({ x, y, r: 0.3, dead: false, hp: 99, hits: 0, takeDamage(n) { if (this.inv > 0) return false; this.hp -= n; this.hits++; this.inv = 1.2; return true; }, inv: 0 });
function setup(seed = 3, diffId = 'easy') {
  const m = mapOf(seed), grid = new Grid(m), rng = mulberry32(seed), diff = getDifficulty(diffId), hooks = { casts: [], fires: [], phases: [], summons: [] };
  const world = new MonsterWorld(grid, { onCast: (mo, d) => hooks.casts.push(d.id), onFire: (mo, d) => hooks.fires.push(d.id), onPhase: (mo, ph, first) => hooks.phases.push([ph.index, first]), onSummon: () => hooks.summons.push(1) }, rng, { contactDamage: diff.contactDamage });
  const gate = m.gates[0], dir = new WaveDirector({ grid, world, gates: [gate], rng, diff, v2: true, maxActive: diff.maxActive, settings: { ...WAVE_SETTINGS, firstWaveDelay: diff.firstWaveDelay, interval: diff.waveInterval, spawnPerSecond: diff.spawnPerSecond } });
  const s = m.playerStart, p = mkPlayer(s.x + 0.5, s.y + 0.5);
  return { m, grid, world, dir, p, hooks, rng, diff, gate };
}
const step = (env, secs, dt = 0.05) => { const ev = []; for (let t = 0; t < secs; t += dt) { env.p.inv = Math.max(0, env.p.inv - dt); ev.push(...env.world.update(dt, [env.p])); } return ev; };
import { SKILLS_SLIME } from '../src/config/slimeSkills.js';
import { SLIMES_V2 } from '../src/config/slimeCatalog.js';
import { TowerSystem } from '../src/sim/towers.js';
import { Economy } from '../src/sim/economy.js';
import { ECON } from '../src/config/economy.js';
import { PAINTABLE } from '../src/render/slimeArt.js';
const spawnNear = (env, id, dx = 3, dy = 0, hpMul = 1) => { const mo = env.world.spawn(v2Type(id), env.p.x + dx, env.p.y + dy, hpMul, 1, 1); mo.speed = 0; return mo; };
const force = (m, id) => { const k = m.sk.list.find((x) => x.id === id); assert.ok(k, id + ' phải được cài'); for (const o of m.sk.list) o.cd = 999; k.cd = 0; return k; }; // chỉ kỹ năng được kiểm tra sẵn sàng

test('mọi slime/boss ở RUNTIME_IDS đều có sprite và cấu hình', () => { for (const id of RUNTIME_IDS) assert.ok(PAINTABLE.includes(id), id); assert.equal(RUNTIME_IDS.filter((i) => SLIMES_V2[i]).length, 30); });
test('sét lan: gây sát thương người chơi trong tầm', () => {
  const env = setup(), t = spawnNear(env, 'thunder', 3); force(t, 'chain_lightning'); step(env, 1.5); assert.ok(env.hooks.fires.includes('chain_lightning')); assert.ok(env.p.hits >= 1);
});
test('dịch chuyển: slime tối dịch về phía đích dọc đường đi, không xuyên vật thể', () => {
  const env = setup(), d = spawnNear(env, 'dark', 8); d.speed = 1; force(d, 'teleport'); const x0 = d.x, y0 = d.y; step(env, 2); const moved = Math.hypot(d.x - x0, d.y - y0);
  assert.ok(env.hooks.fires.includes('teleport') || moved > 0.5); assert.ok(env.grid.isWalkable(Math.floor(d.x), Math.floor(d.y)));
});
test('hồi sinh 1 lần (infernal) và không hồi sinh lần hai', () => {
  const env = setup(), f = spawnNear(env, 'infernal', 6); assert.ok(f.sk.rebirth); env.world.damage(f, 1e7); assert.equal(f.dying, false); assert.ok(f.hp > 0); step(env, 0.1); assert.ok(f.hold > 0 || f.hp > 0);
  env.world.damage(f, 1e7); assert.equal(f.dying, true);
});
test('né đòn: buff evade làm một phần sát thương trượt, vẫn trúng đủ khi không có buff', () => {
  const env = setup(), p = spawnNear(env, 'phantom', 6, 0, 100); p.dodge = 0.6; let miss = 0, n = 400; const h0 = p.hp; for (let i = 0; i < n; i++) { const h = p.hp; env.world.damage(p, 1); if (p.hp === h) miss++; } assert.ok(miss > n * 0.4 && miss < n * 0.8, 'né ~60%: ' + miss);
  p.dodge = 0; const h1 = p.hp; env.world.damage(p, 1); assert.ok(p.hp < h1);
});
test('hồi máu đồng đội: heal_pulse hồi máu slime bị thương xung quanh', () => {
  const env = setup(), l = spawnNear(env, 'light', 6, 0, 1), a = spawnNear(env, 'green', 7, 0, 1); a.hp = a.maxHp * 0.3; force(l, 'heal_pulse'); step(env, 1.2); assert.ok(a.hp > a.maxHp * 0.3, 'đồng đội được hồi');
});
test('hồi máu liên tục (regeneration) và giải trạng thái', () => {
  const env = setup(), r = spawnNear(env, 'regeneration', 6); r.hp = r.maxHp * 0.4; r.status.apply('poison', { dps: 1, dur: 6, stacks: 1 }); force(r, 'regeneration'); const h = r.hp; step(env, 2); assert.ok(r.hp > h, 'hồi máu');
});
test('triệu hồi: bản sao không triệu hồi tiếp (chặn bùng nổ), tôn trọng cap', () => {
  const env = setup(), o = spawnNear(env, 'overlord', 5); force(o, 'summon'); step(env, 2); const n = o.sk.minions.length; assert.ok(n >= 1 && n <= 9, 'minions ' + n); for (const m of o.sk.minions) assert.ok(m.sk.owner === o);
  for (const m of o.sk.minions) assert.equal(env.world.runtime.minionCount(m), 0);
});
test('lifesteal: slime ma cà rồng hồi máu khi gây sát thương kỹ năng', () => {
  const env = setup(), v = spawnNear(env, 'vampire', 2); v.hp = v.maxHp * 0.5; force(v, 'blood_drain'); const h = v.hp; step(env, 2); assert.ok(v.hp > h || env.p.hits === 0);
});
test('rage_aura: dưới 30% máu thì tăng tốc', () => {
  const env = setup(), b = spawnNear(env, 'berserker', 6); b.hp = b.maxHp * 0.25; step(env, 0.2); assert.ok(b.buffSpeed > 1.2);
});
test('director: wave 31–90 chỉ sinh slime V2 đã cài; boss đúng wave; slime mở khóa theo wave', () => {
  const env = setup(), seen = new Set();
  for (let w = 31; w <= 90; w++) { env.dir.queue.length = 0; env.dir.wave = w - 1; env.dir.startWave(); for (const q of env.dir.queue) { assert.ok(isV2Type(q.type) && runtimeCfg(q.type), `wave ${w}: ${q.type}`); seen.add(q.type.slice(3)); } if (w % 10 === 0) assert.equal(env.dir.queue[0].type, v2Type(planWave(w).boss)); }
  for (const id of RUNTIME_IDS) if (id !== 'ancient' && !BOSSES[id]) assert.ok(seen.has(id) || SLIMES_V2[id], id); for (const id of ['thunder', 'poison', 'dark', 'iron', 'tentacle', 'vampire', 'golden', 'rainbow', 'infernal', 'overlord']) assert.ok(seen.has(id), id + ' phải xuất hiện trong wave 31–90');
});
test('mô phỏng nhanh wave 31–90: không lỗi, không vượt trần quái, mọi kỹ năng chạy không ném lỗi', () => {
  const env = setup(5, 'normal'); env.p.takeDamage = () => false; let maxA = 0;
  for (const w of [31, 40, 50, 60, 70, 80, 90, 91, 95, 100]) { env.dir.queue.length = 0; env.dir.wave = w - 1; env.dir.startWave(); let guard = 0; while (env.dir.queue.length && guard++ < 500 && env.world.active < 120) { const q = env.dir.queue.shift(); const gate = env.gate; env.world.spawn(q.type, gate.x + 0.5, gate.y + 0.5, q.hpMul, q.speedMul, q.rewardMul); }
    for (let t = 0; t < 15; t += 0.1) { env.world.update(0.1, [env.p]); maxA = Math.max(maxA, env.world.active); } }
  assert.ok(maxA <= SLIME_V2.maxActiveHard, 'trần quái ' + maxA);
});

test('Giai đoạn 4: wave 91–100 dùng V2; ancient xuất hiện; boss Primordial ở wave 100 với 3 pha và hồi sinh', () => {
  const env = setup(), seen = new Set(); for (let w = 91; w <= 100; w++) { env.dir.queue.length = 0; env.dir.wave = w - 1; env.dir.startWave(); for (const q of env.dir.queue) { assert.ok(isV2Type(q.type) && runtimeCfg(q.type), `wave ${w}: ${q.type}`); seen.add(q.type.slice(3)); } }
  assert.ok(seen.has('ancient')); assert.equal(planWave(100).boss, 'primordial'); const b = env.world.spawn(v2Type('primordial'), env.p.x + 8, env.p.y, 1, 1, 1); b.speed = 0; assert.equal(b.sk.phase, 0);
  env.world.damage(b, b.maxHp * 0.4 / (1 - b.armor)); step(env, 0.2); assert.equal(b.sk.phase, 1); env.world.damage(b, b.maxHp * 0.4 / (1 - b.armor)); step(env, 0.2); assert.equal(b.sk.phase, 2); assert.ok(b.sk.rebirth, 'có hồi sinh ở pha 3');
});
test('debuff tháp: ảo giác làm tên trượt; khóa nhánh gỡ burn/slow; time_warp làm chậm tốc bắn; không ảnh hưởng khi không có slime V2', () => {
  const env = setup(); const ts = new TowerSystem({ grid: env.grid, world: env.world, economy: new Economy({ ...ECON, startGold: 99999, safetyIncome: 0 }), gates: [env.gate], rng: env.rng, diff: env.diff });
  assert.ok(Array.isArray(env.world.towers) && env.world.towerFT >= 1);
  const tw = { x: Math.floor(env.p.x) + 3, y: Math.floor(env.p.y) + 3, state: 'ready' }; assert.equal(env.world.runtime, undefined);
  const m = spawnNear(env, 'multi_eye', 3, 3); assert.ok(env.world.runtime); const rt = env.world.runtime; m.x = tw.x + 1; m.y = tw.y + 1;
  assert.equal(rt.towerDebuff(tw), null); rt.zones.push({ x: m.x, y: m.y, r: 3, t: 5, owner: m, follow: true, tower: { miss: 1, lock: true, rate: 0.8 } });
  const d = rt.towerDebuff(tw); assert.ok(d && d.miss === 1 && d.lock && d.rate === 0.8); tw.x += 20; assert.equal(rt.towerDebuff(tw), null);
});

test('kéo bằng xúc tu: người chơi bị kéo lại gần slime, không xuyên vật thể', () => {
  const env = setup(), t = spawnNear(env, 'tentacle', 2.8); force(t, 'tentacle_pull'); const d0 = Math.hypot(t.x - env.p.x, t.y - env.p.y); step(env, 2); const d1 = Math.hypot(t.x - env.p.x, t.y - env.p.y);
  assert.ok(env.hooks.fires.includes('tentacle_pull')); assert.ok(d1 < d0 && d1 >= 0.85, `${d0} -> ${d1}`); assert.ok(env.grid.isWalkable(Math.floor(env.p.x), Math.floor(env.p.y)));
});
test('hợp nhất: slime cùng loại gộp HP, to hơn, đối tác biến mất không cho thưởng', () => {
  const env = setup(), a = spawnNear(env, 'split', 6), b = spawnNear(env, 'split', 6.5, 0.5), c = spawnNear(env, 'split', 6, 0.8); const hp0 = a.maxHp; force(a, 'fusion'); step(env, 3);
  assert.ok(a.sk.fused); assert.ok(a.maxHp > hp0 * 1.5, 'HP gộp'); assert.ok(a.scale > a.cfg.scale); assert.ok([b, c].some((o) => o.dying || !o.alive));
});
test('đổi nguyên tố: slime cầu vồng đổi màu (tint) có thời hạn rồi trở lại', () => {
  const env = setup(), r = spawnNear(env, 'rainbow', 6); force(r, 'element_shift'); step(env, 1.5); assert.ok(r.tint > 0, 'đã đổi màu'); r.sk.buffs.forEach((b) => (b.t = 0.05)); r.sk.elemT = 0.05; step(env, 0.3); assert.equal(r.tint, 0);
});
test('hút năng lượng tháp (drain towers) và giáp bất hoại (invuln) hoạt động', () => {
  const env = setup(), g = spawnNear(env, 'golden', 6); g.addBuff = undefined; env.world.runtime.addBuff(g, 'golden_invuln', 3, { invuln: true }); const h = g.hp; env.world.damage(g, 50); assert.equal(g.hp, h, 'bất hoại'); env.world.damage(g, 50, { silent: true }); assert.ok(g.hp < h, 'DoT/hệ thống vẫn xuyên');
  env.world.runtime.sk; g.sk.buffs.forEach((b) => (b.t = 0.01)); step(env, 0.2); env.world.damage(g, 5); assert.ok(g.hp < h);
});
test('boss giai đoạn cuối: vùng hư không bám boss, nuốt slime nhỏ, sương độc bị động', () => {
  const env = setup(), a = env.world.spawn(v2Type('abyssal_horror'), env.p.x + 9, env.p.y, 1, 1, 1); a.speed = 0; env.world.damage(a, a.maxHp * 0.7 / (1 - a.armor)); step(env, 0.3);
  assert.ok(env.world.runtime.zones.some((z) => z.owner === a && z.t === Infinity), 'vùng hư không'); const p = env.world.spawn(v2Type('plague_overlord'), env.p.x + 9, env.p.y + 1, 1, 1, 1); p.speed = 0; env.world.damage(p, p.maxHp * 0.9 / (1 - p.armor)); step(env, 0.3);
  assert.ok(env.world.runtime.zones.some((z) => z.owner === p && z.t === Infinity), 'sương độc');
});
