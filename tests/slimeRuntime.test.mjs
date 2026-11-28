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
const spawnNear = (env, id, dx = 3, dy = 0, hpMul = 1) => { const mo = env.world.spawn(v2Type(id), env.p.x + dx, env.p.y + dy, hpMul, 1, 1); mo.speed = 0; return mo; }; // speed 0: đứng yên để kiểm tra kỹ năng

test('cầu nối: mọi RUNTIME_IDS có cấu hình hợp lệ; quái cũ không bị ảnh hưởng', () => {
  for (const id of RUNTIME_IDS) { const c = runtimeCfg(v2Type(id)); assert.ok(c && c.hp > 0 && c.v2, id); assert.equal(c.boss, !!BOSSES[id]); }
  assert.equal(runtimeCfg('green'), null); assert.equal(isV2Type('green'), false);
  const env = setup(); const old = env.world.spawn('green', env.p.x + 5, env.p.y, 1, 1); assert.equal(old.v2, false); assert.equal(old.status, null); assert.equal(env.world.runtime, undefined);
});
test('director V2: wave 1–30 chỉ sinh slime V2 đã cài; boss đứng đầu hàng đợi ở wave 10/20/30; SLIME_V2.maxWave thấp hơn thì wave sau đó về slime cũ', () => {
  const env = setup(), types = new Set();
  for (let w = 1; w <= 30; w++) { env.dir.queue.length = 0; env.dir.wave = w - 1; env.dir.startWave(); assert.ok(env.dir.queue.length > 0); for (const q of env.dir.queue) { assert.ok(isV2Type(q.type) && runtimeCfg(q.type), `wave ${w}: ${q.type}`); types.add(q.type); }
    if (w % 10 === 0) assert.equal(env.dir.queue[0].type, v2Type(planWave(w).boss), 'boss wave ' + w); else assert.ok(!env.dir.queue.some((q) => runtimeCfg(q.type).boss)); assert.equal(env.dir.currentSpec.boss, w % 10 === 0); }
  for (const id of ['green', 'blue', 'red', 'yellow', 'fire', 'ice', 'earth', 'stone_armor', 'thorn', 'ancient_king', 'frost_emperor', 'inferno_titan']) assert.ok(types.has(v2Type(id)), id + ' phải xuất hiện trong 30 wave đầu');
  const keep = SLIME_V2.maxWave; SLIME_V2.maxWave = 30; try { env.dir.queue.length = 0; env.dir.wave = 30; env.dir.startWave(); assert.ok(env.dir.queue.every((q) => !isV2Type(q.type)), 'wave 31 dùng hệ cũ khi maxWave=30'); } finally { SLIME_V2.maxWave = keep; }
});
test('director: mặc định (v2 tắt) giữ nguyên hành vi cũ', () => {
  const env = setup(); const d = new WaveDirector({ grid: env.grid, world: env.world, gates: [env.gate], rng: mulberry32(1) }); d.wave = 9; d.startWave(); assert.ok(d.queue.every((q) => !isV2Type(q.type))); assert.equal(d.specFor(10).plan, undefined);
});
test('giáp giảm sát thương; khiên hấp thụ trước máu; làm chậm đi qua StatusSet', () => {
  const env = setup(), st = spawnNear(env, 'stone_armor'), gr = spawnNear(env, 'green'); const hp0 = st.hp, a = st.armor; env.world.damage(st, 100); assert.ok(Math.abs(hp0 - st.hp - 100 * (1 - a)) < 1e-6);
  gr.status.apply('shield', { hp: 15, dur: 5 }); const h0 = gr.hp; env.world.damage(gr, 10); assert.equal(gr.hp, h0); env.world.damage(gr, 10); assert.ok(gr.hp < h0 && gr.hp > h0 - 10);
  const bl = spawnNear(env, 'blue'); env.world.applySlow(bl, 0.4, 2); env.world.update(0.05, [env.p]); assert.ok(Math.abs(bl.slow - 0.6) < 1e-9);
});
test('miễn nhiễm: slime lửa không bị cháy; slime xanh lá bị cháy và chịu sát thương theo thời gian', () => {
  const env = setup(), f = spawnNear(env, 'fire'), g = spawnNear(env, 'green', 4, 0, 50); env.world.ignite(f, { burnDps: 5, burnDur: 3 }); env.world.ignite(g, { burnDps: 5, burnDur: 3 });
  const gh = g.hp; env.p.x = 0.5; env.p.y = 0.5; step(env, 2); assert.equal(f.status.has('burn'), false); assert.ok(g.hp < gh, 'cháy gây sát thương'); assert.ok(g.burnT >= 0);
});
test('slime đỏ: Cuồng nộ khi người chơi lại gần → tăng tốc và to hơn, rồi hết hạn', () => {
  const env = setup(), r = spawnNear(env, 'red', 3); r.speed = 1; r.sk.list[0].cd = 0; const base = r.buffSpeed; let sawCast = false; step(env, 0.6); sawCast = env.hooks.casts.includes('berserk') || r.sk.buffs.length > 0;
  step(env, 0.6); assert.ok(r.buffSpeed > base, 'tăng tốc'); assert.ok(r.scale > r.cfg.scale, 'to hơn'); assert.ok(sawCast); r.sk.buffs.forEach((b) => (b.t = 0.05)); step(env, 0.2); assert.equal(r.buffSpeed, 1);
});
test('slime lửa: bắn cầu lửa vào người chơi (có đạn, trúng gây mất tim, phát sự kiện hit); đạn bị chắn bởi vật cản', () => {
  const env = setup(), f = spawnNear(env, 'fire', 3); const ev = step(env, 8); assert.ok(env.hooks.fires.includes('fireball'), 'đã bắn'); assert.ok(env.p.hits >= 1, 'trúng người chơi'); assert.ok(ev.some((e) => e.type === 'hit' && e.skill));
  const env2 = setup(); const f2 = spawnNear(env2, 'fire', 3); f2.sk.list.find((k) => k.id === 'fireball').cd = 0; let wx = -1, wy = -1; for (let y = 0; y < env2.grid.height && wx < 0; y++) for (let x = 0; x < env2.grid.width; x++) if (!env2.grid.isWalkable(x, y)) { wx = x; wy = y; break; } assert.ok(wx >= 0);
  env2.world.runtime.projs.push({ x: wx + 0.5, y: wy + 0.5, vx: 0, vy: 0, life: 5, r: 0.28, owner: f2, def: null, splash: 0 }); env2.world.update(0.05, [env2.p]); assert.equal(env2.world.runtime.projs.length, 0, 'đạn chạm vật cản thì biến mất');
});
test('ring/zone: Băng nổ có thời gian niệm (telegraph) trước khi gây sát thương; người chơi chạy khỏi vòng thì không bị trúng', () => {
  const env = setup(), ic = spawnNear(env, 'ice', 1.2); const k = ic.sk.list.find((x) => x.id === 'ice_nova'); k.cd = 0; ic.sk.list.find((x) => x.id === 'ice_shard').cd = 99;
  step(env, 0.1); assert.ok(env.hooks.casts.includes('ice_nova')); assert.equal(env.p.hits, 0, 'chưa nổ trong lúc niệm'); assert.ok(ic.hold > 0, 'đứng yên khi niệm');
  env.p.x += 9; env.p.y += 0; step(env, 1.2); assert.ok(env.hooks.fires.includes('ice_nova')); assert.equal(env.p.hits, 0, 'đã chạy xa thì không trúng');
  const env2 = setup(), i2 = spawnNear(env2, 'ice', 1.2); i2.sk.list.find((x) => x.id === 'ice_nova').cd = 0; i2.sk.list.find((x) => x.id === 'ice_shard').cd = 99; step(env2, 1.5); assert.ok(env2.p.hits >= 1, 'đứng yên thì bị trúng');
});
test('đóng băng/choáng chặn niệm kỹ năng', () => {
  const env = setup(), f = spawnNear(env, 'fire', 3); f.status.apply('stun', { dur: 2 }); step(env, 1.5); assert.deepEqual(env.hooks.casts, []); assert.equal(env.p.hits, 0);
});
test('boss: vào đúng 3 pha theo ngưỡng máu, mỗi pha mở thêm kỹ năng; pha cuối thay đổi thân (giáp/to hơn)', () => {
  for (const id of ['ancient_king', 'frost_emperor', 'inferno_titan']) {
    const env = setup(), b = spawnNear(env, id, 6); assert.deepEqual(env.hooks.phases, [[1, true]]); const n1 = b.sk.list.length; assert.ok(n1 >= 1, id);
    b.hp = b.maxHp * 0.6; env.world.update(0.05, [env.p]); assert.equal(b.sk.phase, 1); assert.ok(b.sk.list.length >= n1); b.hp = b.maxHp * 0.2; const armor0 = b.armor, scale0 = b.scale; env.world.update(0.05, [env.p]); assert.equal(b.sk.phase, 2);
    assert.ok(b.armor !== armor0 || b.scale > scale0 || b.buffSpeed > 1, id + ' pha cuối phải đổi thân'); assert.deepEqual(env.hooks.phases.map((x) => x[0]), [1, 2, 3]);
    b.hp = b.maxHp * 0.01; env.world.update(0.05, [env.p]); assert.equal(b.sk.phase, 2, 'không lùi pha');
  }
});
test('boss triệu hồi đội hộ tống có trần số lượng và không vượt trần cứng; quái con yếu hơn boss rất nhiều', () => {
  const env = setup(), b = spawnNear(env, 'ancient_king', 6, 0, 1.75); const k = b.sk.list.find((x) => x.id === 'summon'); assert.ok(k); k.cd = 0; step(env, 3); const c = env.world.runtime.minionCount(b); assert.ok(c >= 1 && c <= 6, 'minions ' + c);
  for (let i = 0; i < 40; i++) { k.cd = 0; k.state = 'ready'; b.sk.casting = null; step(env, 0.1); } assert.ok(env.world.runtime.minionCount(b) <= 6); assert.ok(env.world.active <= SLIME_V2.maxActiveHard);
  const minion = env.world.monsters.find((o) => o.sk?.owner === b); assert.ok(minion.maxHp < b.maxHp / 10); assert.equal(minion.noSplit, true);
});
test('ancient_king pha 2: Hấp thụ slime con để hồi máu và to ra', () => {
  const env = setup(), b = spawnNear(env, 'ancient_king', 6); b.hp = b.maxHp * 0.5; env.world.update(0.05, [env.p]); assert.equal(b.sk.phase, 1);
  for (let i = 0; i < 3; i++) spawnNear(env, 'green', 6.5 + i * 0.1); b.hp = b.maxHp * 0.5; const k = b.sk.list.find((x) => x.id === 'absorb'); assert.ok(k); k.cd = 0; const act0 = env.world.active, hp0 = b.hp, sc0 = b.scale; step(env, 3);
  assert.ok(b.hp > hp0 && b.scale > sc0, 'hồi máu + to ra'); assert.ok(env.world.active < act0, 'nuốt bớt quái nhỏ');
});
test('slime thường có Phân thân: tách thành con nhỏ đúng một lần ở ngưỡng máu', () => {
  const env = setup(), g = spawnNear(env, 'green', 8, 0, 5); g.sk.list.push({ id: 'split', def: { id: 'split', castTime: 0, cooldown: 0, effect: { type: 'spawnSplit', parts: 3, childHpPct: 0.3, childScale: 0.6, hpThreshold: [0.5] } }, cd: 0, cooldown: 0, state: 'ready', t: 0, target: null });
  g.hp = g.maxHp * 0.4; const n0 = env.world.active; env.world.update(0.05, [env.p]); assert.equal(env.world.active, n0 + 3); const kid = env.world.monsters.find((o) => o.sk?.owner === g); assert.ok(kid.scale < g.cfg.scale); env.world.update(0.05, [env.p]); assert.equal(env.world.active, n0 + 3, 'chỉ tách một lần');
});
test('mô phỏng đầy đủ wave 1–30 bằng hệ V2: không lỗi, quái đồng thời ≤ trần, không quái nào nằm trong vật cản, kỹ năng thực sự được dùng', () => {
  const env = setup(5), { dir, world, grid } = env; let bad = 0, maxActive = 0, t = 0; env.p.takeDamage = () => false; // người chơi bất tử để chạy hết 30 wave
  while (dir.wave < 30 && t < 1500) { t += 0.1; dir.update(0.1); world.update(0.1, [env.p]); maxActive = Math.max(maxActive, world.active); for (const mo of world.monsters) if (!grid.isWalkable(Math.floor(mo.x), Math.floor(mo.y)) && !mo.dying) bad++; for (const mo of world.monsters) if (!mo.dying && mo.hp > 0 && (t % 3 < 0.1) && !mo.cfg.boss) mo.hp = Math.max(1, mo.hp - 4); }
  assert.ok(dir.wave >= 30, 'wave ' + dir.wave); assert.ok(maxActive <= SLIME_V2.maxActiveHard); assert.equal(bad, 0); assert.ok(env.hooks.casts.length > 0, 'có kỹ năng được niệm'); assert.ok(env.hooks.phases.length >= 1);
});
