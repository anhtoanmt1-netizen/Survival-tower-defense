import test from 'node:test';
import assert from 'node:assert/strict';
import { SLIMES_V2, SLIME_IDS, GROUPS, CORE_DESIGNS, MOTION_STYLES, VFX_GROUPS, animSetOf, missingSkills, idsOfGroup } from '../src/config/slimeCatalog.js';
import { BOSSES, BOSS_IDS, bossMissingSkills, bossAtWave } from '../src/config/slimeBosses.js';
import { SKILLS_SLIME, MAIN_SKILL_IDS, EFFECT_TYPES } from '../src/config/slimeSkills.js';
import { STATUS_IDS } from '../src/config/slimeStatus.js';
import { StatusSet } from '../src/sim/status.js';
import { planWave, planAll, eliteCap, CHAPTERS, SPECIAL_WAVES, unlockWave, TOTAL_WAVES } from '../src/config/slimeWaves.js';
import { configChecksum } from '../src/net/protocol.js';
import { SLIMES } from '../src/config/slimes.js';

// ---------- danh mục ----------
test('danh mục: đúng 30 slime, 6 nhóm, ID duy nhất, mọi kỹ năng tham chiếu đều tồn tại', () => {
  assert.equal(SLIME_IDS.length, 30);
  assert.deepEqual(['normal', 'elemental', 'armored', 'mutant', 'elite', 'legendary'].map((g) => idsOfGroup(g).length), [4, 7, 4, 5, 5, 5]);
  assert.deepEqual(missingSkills(), []);
  assert.deepEqual(SLIME_IDS.map((id) => SLIMES_V2[id].num), Array.from({ length: 30 }, (_, i) => i + 1));
});
test('danh mục: mỗi slime có silhouette riêng, motion riêng, bảng màu riêng, lõi + hạt + VFX hợp lệ (không chỉ đổi màu)', () => {
  const sil = new Set(), mot = new Set(), main = new Set();
  for (const id of SLIME_IDS) {
    const s = SLIMES_V2[id];
    assert.ok(s.body.silhouette && s.body.material && s.body.surface, id); assert.ok(s.core.shape && s.core.note, id); assert.ok(CORE_DESIGNS[s.core.design], id); assert.equal(s.core.design, GROUPS[s.group].core, id);
    assert.ok(s.particles.length >= 1, id); assert.ok(VFX_GROUPS[s.vfx], id); assert.ok(MOTION_STYLES[s.motion.style], id); assert.ok(s.motion.hit && s.motion.death, id);
    assert.match(s.palette.main, /^#[0-9a-f]{6}$/i); assert.ok(s.palette.sub.length === 2 && s.palette.core && s.palette.glow, id);
    sil.add(s.body.silhouette); mot.add(s.motion.style); main.add(s.palette.main);
  }
  assert.equal(sil.size, 30, 'silhouette trùng'); assert.equal(mot.size, 30, 'phong cách chuyển động trùng'); assert.equal(main.size, 30, 'màu chủ đạo trùng');
});
test('danh mục: elite/legendary lớn hơn slime thường; nhóm có kỹ năng thì có bộ hoạt ảnh skill 4 pha', () => {
  const maxNormal = Math.max(...idsOfGroup('normal').map((i) => SLIMES_V2[i].stats.scale)), maxMutant = Math.max(...idsOfGroup('mutant').map((i) => SLIMES_V2[i].stats.scale));
  for (const g of ['elite', 'legendary']) for (const id of idsOfGroup(g)) assert.ok(SLIMES_V2[id].stats.scale > maxNormal && SLIMES_V2[id].stats.scale >= maxMutant, id);
  for (const id of SLIME_IDS) { const a = animSetOf(id); for (const k of ['idle', 'move', 'hit', 'attack', 'death']) assert.ok(a[k], id + ':' + k); if (SLIMES_V2[id].skills.length) assert.deepEqual(Object.keys(a.skill), ['prepare', 'activate', 'sustain', 'end']); }
});
test('danh mục: chỉ số hợp lệ (hp, armor 0..0.6, tốc độ, thưởng)', () => {
  for (const id of SLIME_IDS) { const t = SLIMES_V2[id].stats; assert.ok(t.hp > 0 && t.speed > 0 && t.reward > 0 && t.radius > 0, id); assert.ok(t.armor >= 0 && t.armor <= 0.6, id); }
});
// ---------- kỹ năng ----------
test('kỹ năng: có đủ 18 kỹ năng chính; mỗi kỹ năng có 3 giai đoạn hình ảnh, loại hiệu ứng hợp lệ, thời gian hợp lệ', () => {
  assert.equal(MAIN_SKILL_IDS.length, 18);
  for (const [id, k] of Object.entries(SKILLS_SLIME)) {
    assert.equal(k.id, id); assert.equal(k.vfx.length, 3, id); assert.ok(k.vfx.every((x) => typeof x === 'string' && x.length), id); assert.ok(EFFECT_TYPES.includes(k.effect.type), id + ' ' + k.effect.type);
    assert.ok(k.castTime >= 0 && k.duration >= 0 && k.cooldown >= 0, id); assert.ok(VFX_GROUPS[k.vfxGroup], id + ' vfxGroup'); assert.ok(k.desc, id);
  }
  for (const id of ['split', 'absorb', 'regeneration', 'evolution', 'energy_shield', 'reflect_damage', 'stone_armor', 'fire_burst', 'ice_nova', 'chain_lightning', 'poison_cloud', 'dark_vortex', 'teleport', 'illusion', 'berserk', 'fusion', 'summon', 'rebirth']) assert.ok(SKILLS_SLIME[id]?.main, id);
});
test('kỹ năng: nguyên tố gây đúng hiệu ứng trạng thái đã định nghĩa', () => {
  for (const k of Object.values(SKILLS_SLIME)) if (k.effect.status) assert.ok(STATUS_IDS.includes(k.effect.status), k.id);
});
// ---------- boss ----------
test('boss: đúng 10 boss ở wave 10..100, mỗi boss ≥3 pha liên tục, ≥3 kỹ năng, ≥3 lớp vật liệu, ≥3 bộ phận độc lập, đủ 4 hoạt ảnh', () => {
  assert.equal(BOSS_IDS.length, 10); assert.deepEqual(BOSS_IDS.map((i) => BOSSES[i].wave), [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]); assert.deepEqual(bossMissingSkills(), []);
  const sil = new Set();
  for (const id of BOSS_IDS) {
    const b = BOSSES[id]; sil.add(b.body.silhouette); assert.ok(b.body.layers.length >= 3, id); assert.ok(b.body.parts.length >= 3, id); assert.ok(b.skills.length >= 3, id);
    assert.ok(b.phases.length >= 3, id); assert.equal(b.phases[0].hpTop, 1); assert.equal(b.phases.at(-1).hpBottom, 0);
    b.phases.forEach((p, i) => { if (i) assert.equal(p.hpTop, b.phases[i - 1].hpBottom, id); assert.ok(p.skills.length >= 1, id); });
    for (const k of ['entrance', 'transform', 'attack', 'death']) assert.ok(b.anim[k], id + ':' + k);
    assert.ok(b.stats.scale > 3 && b.stats.scale > Math.max(...Object.values(SLIMES_V2).map((s) => s.stats.scale)), id + ' phải lớn hơn mọi slime thường');
    assert.equal(b.core.design, 'colossal_layered'); assert.ok(b.minions.every((m) => SLIMES_V2[m]), id + ' minions');
  }
  assert.equal(sil.size, 10); assert.equal(bossAtWave(100).id, 'primordial'); assert.equal(bossAtWave(55), null);
  const hps = BOSS_IDS.map((i) => BOSSES[i].stats.hp); assert.deepEqual(hps, hps.slice().sort((a, b) => a - b), 'boss sau mạnh hơn');
});
test('boss 10: đủ 6 kỹ năng yêu cầu và ba pha Primordial/Chaos/Absolute', () => {
  const b = BOSSES.primordial; for (const k of ['primordial_split', 'devour', 'chaos_element', 'void_collapse', 'ultimate_evolution', 'rebirth_core']) assert.ok(b.skills.includes(k), k);
  assert.deepEqual(b.phases.map((p) => p.name), ['Primordial Form', 'Chaos Evolution', 'Absolute Primordial']);
});
// ---------- trạng thái ----------
const dpsEvents = (s, secs, dt = 0.1) => { let dmg = 0; for (let t = 0; t < secs; t += dt) for (const e of s.update(dt)) if (e.type === 'dot') dmg += e.dmg; return dmg; };
test('trạng thái: cháy gây sát thương theo nhịp rồi hết; lấy dps cao nhất', () => {
  const s = new StatusSet({ maxHp: 100 }); s.apply('burn', { dps: 4, dur: 3 }); s.apply('burn', { dps: 10, dur: 2 }); s.apply('burn', { dps: 2, dur: 1 });
  assert.equal(s.get('burn').dps, 10); const d = dpsEvents(s, 4); assert.ok(Math.abs(d - 30) < 1.5, 'tổng ~ 10dps×3s, nhận ' + d); assert.equal(s.has('burn'), false);
});
test('trạng thái: độc cộng dồn tối đa 8 tầng, giảm hồi máu', () => {
  const s = new StatusSet({}); for (let i = 0; i < 12; i++) s.apply('poison', { dps: 2, dur: 5 }); assert.equal(s.get('poison').stacks, 8); assert.equal(s.healMul(), 0.5);
  const d = dpsEvents(s, 1); assert.ok(Math.abs(d - 16) < 1, 'dps 2 × 8 tầng × 1s = 16, nhận ' + d);
});
test('trạng thái: đóng băng/choáng chặn di chuyển và kỹ năng; sau đó miễn khống chế tạm thời', () => {
  const s = new StatusSet({}); s.apply('freeze', { dur: 1 }); assert.equal(s.speedMul(), 0); assert.equal(s.canCast(), false); assert.equal(s.damageTakenMul(), 1.2);
  s.update(1.01); assert.equal(s.canMove(), true); assert.equal(s.apply('stun', { dur: 1 }).reason, 'ccImmune'); s.update(1.6); assert.equal(s.apply('stun', { dur: 1 }).applied, true);
});
test('trạng thái: làm chậm lấy mức mạnh nhất, trần 70%', () => {
  const s = new StatusSet({}); s.apply('slow', { pct: 0.3, dur: 2 }); s.apply('slow', { pct: 0.2, dur: 5 }); assert.equal(s.speedMul(), 0.7); s.apply('slow', { pct: 0.9, dur: 1 }); assert.ok(Math.abs(s.speedMul() - 0.3) < 1e-9);
});
test('tương tác: lửa tan băng (nổ hơi nước); băng dập lửa thành làm chậm; điện làm vỡ băng; điện + chậm = choáng; lửa + độc = nổ hơi độc', () => {
  let s = new StatusSet({}); s.apply('freeze', { dur: 2 }); let r = s.apply('burn', { dps: 10, dur: 3 }); assert.equal(r.reaction, 'melt'); assert.equal(r.dmg, 12); assert.equal(s.has('freeze'), false); assert.equal(s.has('burn'), false);
  s = new StatusSet({}); s.apply('burn', { dps: 5, dur: 3 }); r = s.apply('freeze', { dur: 2 }); assert.equal(r.reaction, 'quench'); assert.equal(s.has('burn'), false); assert.ok(s.speedMul() < 1);
  s = new StatusSet({}); s.apply('freeze', { dur: 2 }); r = s.apply('shock', { dur: 2 }); assert.equal(r.reaction, 'shatter'); assert.equal(s.has('freeze'), false); assert.equal(s.has('stun'), true);
  s = new StatusSet({}); s.apply('slow', { pct: 0.3, dur: 3 }); s.apply('shock', { dur: 2 }); assert.equal(s.has('stun'), true);
  s = new StatusSet({}); s.apply('poison', { dps: 3, dur: 5, stacks: 4 }); r = s.apply('burn', { dps: 5, dur: 3 }); assert.equal(r.reaction, 'fumes'); assert.equal(r.dmg, 4 * 5 * 0.8); assert.equal(s.has('poison'), false); assert.equal(s.has('burn'), true);
});
test('giật điện: đánh dấu, đòn kế tiếp +25% một lần duy nhất', () => {
  const s = new StatusSet({ maxHp: 100 }); s.apply('shock', { dur: 3 }); assert.equal(s.hit(100).through, 125); assert.equal(s.hit(100).through, 100);
});
test('khiên: hấp thụ trước máu, vỡ phát sự kiện, chặn hiệu ứng xấu khi còn khiên', () => {
  const s = new StatusSet({ maxHp: 200 }); s.apply('shield', { hp: 50, dur: 5 }); assert.equal(s.apply('burn', { dps: 5, dur: 3 }).reason, 'shield');
  let h = s.hit(30); assert.deepEqual([h.through, h.absorbed, h.broke], [0, 30, false]); h = s.hit(40); assert.deepEqual([h.through, h.absorbed, h.broke], [20, 20, true]);
  assert.ok(s.update(0.01).some((e) => e.type === 'shieldBreak')); assert.equal(s.apply('burn', { dps: 5, dur: 3 }).applied, true); assert.equal(s.hit(10, { trueDamage: true }).through, 10);
});
test('boss: tenacity giảm thời gian khống chế, immune chặn hoàn toàn, cleanse xóa hiệu ứng xấu', () => {
  const b = new StatusSet({ tenacity: 0.5, immune: ['freeze'] }); assert.equal(b.apply('freeze', { dur: 2 }).reason, 'immune'); b.apply('stun', { dur: 2 }); assert.equal(b.get('stun').t, 1);
  const s = new StatusSet({}); s.apply('burn', { dps: 2, dur: 3 }); s.apply('poison', { dps: 2, dur: 3 }); s.apply('slow', { pct: 0.3, dur: 3 }); assert.deepEqual(s.cleanse().sort(), ['burn', 'poison', 'slow']);
});
// ---------- 100 wave ----------
test('wave: 10 chương × 10 wave, boss đúng wave 10,20,…,100, mỗi chương mở slime mới và có 3 wave đặc biệt', () => {
  assert.equal(CHAPTERS.length, 10); const plans = planAll(); assert.equal(plans.length, TOTAL_WAVES);
  assert.deepEqual(plans.filter((p) => p.boss).map((p) => p.wave), [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]); assert.deepEqual(plans.filter((p) => p.boss).map((p) => p.boss), BOSS_IDS);
  for (const c of CHAPTERS) { assert.ok(c.u.length >= 1, 'chương ' + c.n); assert.equal(c.sp.length, 3); for (const [w] of c.sp) assert.equal(Math.ceil(w / 10), c.n); for (const [, w] of c.u) assert.equal(Math.ceil(w / 10), c.n); }
});
test('wave: mọi 30 slime đều xuất hiện, không slime nào xuất hiện trước wave mở khóa, trọng số cộng lại = 1', () => {
  const seen = new Set();
  for (const p of planAll()) { let sum = 0; for (const [id, v] of Object.entries(p.weights)) { assert.ok(SLIMES_V2[id], id); assert.ok(v >= 0); assert.ok(unlockWave(id) <= p.wave, `${id} xuất hiện ở wave ${p.wave} trước khi mở khóa (${unlockWave(id)})`); if (v > 0) seen.add(id); sum += v; } assert.ok(Math.abs(sum - 1) < 1e-9, 'wave ' + p.wave); }
  assert.equal(seen.size, 30);
});
test('wave: slime mới mở khóa đúng chương theo bản yêu cầu và đúng thứ tự nhóm', () => {
  const at = (id) => Math.ceil(unlockWave(id) / 10);
  assert.deepEqual(['green', 'blue', 'red', 'yellow'].map(at), [1, 1, 1, 1]); assert.deepEqual(['fire', 'ice'].map(at), [2, 2]); assert.deepEqual(['earth', 'stone_armor', 'thorn'].map(at), [3, 3, 3]);
  assert.deepEqual(['thunder', 'poison', 'split', 'spike_mutant'].map(at), [4, 4, 4, 4]); assert.deepEqual(['dark', 'phantom', 'tentacle', 'multi_eye'].map(at), [5, 5, 5, 5]);
  assert.deepEqual(['crystal', 'iron', 'regeneration', 'berserker'].map(at), [6, 6, 6, 6]); assert.deepEqual(['golden', 'celestial', 'overlord'].map(at), [8, 8, 8]); assert.deepEqual(['rainbow', 'infernal'].map(at), [9, 9]); assert.equal(at('ancient'), 10);
});
test('wave: wave đặc biệt có focus hợp lệ (đã mở khóa), thực sự thay đổi cách phối; wave boss có đội hộ tống', () => {
  for (const c of CHAPTERS) for (const [w, id] of c.sp) { const sp = SPECIAL_WAVES[id]; assert.ok(sp, id); const p = planWave(w), normal = Object.entries(p.weights).sort((a, b) => b[1] - a[1]);
    assert.equal(p.special, id); assert.ok(sp.focus.some((f) => unlockWave(f) <= w), id + ' không có focus nào mở khóa'); const share = sp.focus.reduce((a, f) => a + (p.weights[f] ?? 0), 0); assert.ok(share >= 0.5, `${id}: focus chỉ chiếm ${share.toFixed(2)}`); assert.ok(normal.length >= 1); }
  for (const p of planAll().filter((x) => x.boss)) { assert.ok(p.escort.length >= 1, 'boss ' + p.boss); assert.ok(p.escort.reduce((a, id) => a + (p.weights[id] ?? 0), 0) >= 0.6); }
});
test('wave: cách phối thay đổi giữa các chương (không chỉ cộng HP): top-3 slime khác nhau, tinh anh+huyền thoại không vượt trần theo chương', () => {
  const top = (w) => Object.entries(planWave(w).weights).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join(',');
  const sets = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95].map(top); assert.equal(new Set(sets).size, sets.length, sets.join(' | '));
  for (const p of planAll()) { const s = Object.entries(p.weights).filter(([id]) => ['elite', 'legendary'].includes(SLIMES_V2[id].group)).reduce((a, [, v]) => a + v, 0); if (!p.special && !p.boss) assert.ok(s <= eliteCap(p.chapter) + 1e-9, `wave ${p.wave}: ${s}`); }
});
test('wave: planWave tất định và từ chối wave sai', () => { assert.deepEqual(planWave(37), planWave(37)); assert.throws(() => planWave(0)); assert.throws(() => planWave(101)); assert.equal(planWave(1).weights.green, 1); });
// ---------- không đụng gameplay/multiplayer cũ ----------
test('tương thích: config slime cũ không đổi (configChecksum multiplayer giữ nguyên)', () => {
  assert.deepEqual(Object.keys(SLIMES), ['green', 'blue', 'purple', 'red', 'gold']); assert.equal(SLIMES.green.hp, 20); assert.equal(typeof configChecksum(), 'string');
});
