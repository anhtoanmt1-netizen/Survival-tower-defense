import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../src/map/index.js';
import { GRASS_CHUNK, GrassPlanner } from '../src/map/grassPlan.js';
import { DashSkill, moveWithCollision } from '../src/sim/dash.js';
import { DASH, dashCooldown, dashDistance } from '../src/config/skills.js';
import { subSteps, nextSpeed, MAX_STEP, GAME_SPEEDS } from '../src/sim/gameSpeed.js';
import { PERF_MODES, PERF_PROFILES, PerfGovernor, recommendMode, getProfile, DEFAULT_PERF_MODE } from '../src/config/performance.js';
import { Economy, MAX_GOLD } from '../src/sim/economy.js';
import { parseGold } from '../src/ui/coinDialog.js';
import { GROUPS, SFX_GROUP, groupSetting } from '../src/systems/Audio.js';
import { DEFAULTS, migrate } from '../src/config/settings.js';
import { patternFor, vibrate, resetHapticsForTest } from '../src/platform/haptics.js';
import { canRegister } from '../src/platform/pwa.js';
import { SKILLS } from '../src/config/skills.js';

test('Dash: hồi chiêu gốc 60s, nâng cấp có giới hạn cứng', () => {
  const d = new DashSkill(); assert.equal(d.cooldown, 60); assert.ok(d.start(1, 0)); assert.equal(d.cd, 60); assert.equal(d.can(), false);
  while (!d.maxed) assert.ok(d.upgrade()); assert.equal(d.upgrade(), false);
  assert.ok(dashCooldown(99) >= DASH.minCooldown); assert.ok(dashDistance(99) <= DASH.maxDistance); assert.equal(d.upgradeCost(), Infinity);
});
test('Dash: chỉ lướt khi hết hồi, hướng 0 bị từ chối, kết thúc gọi callback, hồi chiêu chạy theo thời gian game', () => {
  const d = new DashSkill(); assert.equal(d.start(0, 0), false); assert.ok(d.start(0, 3)); assert.equal(d.dy, 1);
  let ended = 0; d.update(DASH.duration + 0.01, () => ended++); assert.equal(ended, 1); assert.equal(d.active, false);
  d.update(59, () => {}); assert.equal(d.can(), false); d.update(1.1, () => {}); assert.ok(d.can());
});
test('Dash: không xuyên tường mỏng dù bước dt lớn', () => {
  const wall = (x) => x >= 5 && x < 5.2, hit = (x, y) => wall(x);
  const r = moveWithCollision(hit, 4, 0, 3, 0); assert.ok(r.x < 5 && r.blocked);
  const s = moveWithCollision(hit, 4, 0, 0.5, 1); assert.ok(s.y > 0.9); // trượt dọc vật cản
});
test('Tốc độ game: bước con ≤ 0.05s và tổng thời gian chính xác (không tích lũy lệch)', () => {
  assert.deepEqual(GAME_SPEEDS, [1, 2, 3]); assert.equal(nextSpeed(3), 1); assert.equal(nextSpeed(1), 2);
  for (const sp of GAME_SPEEDS) for (const real of [0.016, 0.033, 0.05]) { const sim = real * sp, n = subSteps(sim), h = sim / n; assert.ok(h <= MAX_STEP + 1e-9); assert.ok(Math.abs(h * n - sim) < 1e-12); }
});
test('Hiệu năng: 3 chế độ, mặc định Cân bằng, gợi ý theo máy, profile lạ rơi về mặc định', () => {
  assert.deepEqual(PERF_MODES, ['saver', 'balanced', 'high']); assert.equal(DEFAULT_PERF_MODE, 'balanced'); assert.equal(getProfile('xyz').id, 'balanced');
  assert.ok(PERF_MODES.every((m) => PERF_PROFILES[m].name && PERF_PROFILES[m].icon && PERF_PROFILES[m].blurb));
  assert.ok(PERF_MODES.includes(recommendMode({ cores: 2, memGb: 2, mobile: true }))); assert.ok(PERF_MODES.includes(recommendMode({ cores: 16, memGb: 16, mobile: false })));
  assert.ok(PERF_PROFILES.saver.fxMaxLive < PERF_PROFILES.high.fxMaxLive);
});
test('PerfGovernor: giảm bậc khi FPS thấp kéo dài, tự hồi khi ổn, bỏ qua khung bất thường', () => {
  const g = new PerfGovernor(); for (let i = 0; i < 400; i++) g.update(1 / 20, 60); assert.ok(g.step >= 1);
  const hi = g.step; g.update(5, 60); assert.equal(g.step, hi); for (let i = 0; i < 2000; i++) g.update(1 / 60, 60); assert.equal(g.step, 0);
});
test('Cỏ: kế hoạch tất định, không nằm trên ô cấm, không gần cổng quái / điểm xuất phát', () => {
  const m = generateMap('FOREST-2026-A8F72K'), a = new GrassPlanner(m), b = new GrassPlanner(m); let n = 0;
  for (let cy = 0; cy < Math.min(4, a.chunksY); cy++) for (let cx = 0; cx < Math.min(4, a.chunksX); cx++) {
    const L = a.chunk(cx, cy); assert.deepEqual(L, b.chunk(cx, cy)); n += L.length;
    for (const t of L) { assert.ok(a.ok(t.x, t.y)); assert.ok(t.v >= 0 && t.v < 9); assert.ok(t.rank >= 0 && t.rank < 1); }
  }
  assert.ok(n > 0); assert.ok(GRASS_CHUNK > 0);
});
test('Nhập xu: kiểm tra đầu vào chặt, giới hạn, không đổi thống kê kinh tế', () => {
  assert.equal(parseGold('').ok, false); assert.equal(parseGold('abc').ok, false); assert.equal(parseGold('-5').ok, false); assert.equal(parseGold('1e9').ok, false);
  assert.equal(parseGold('99999999999999999999').ok, false); assert.equal(parseGold(String(MAX_GOLD + 1)).ok, false);
  assert.deepEqual(parseGold('1.234'), { ok: true, value: 1234 }); assert.equal(parseGold(' 0 ').value, 0);
  const e = new Economy({ startGold: 10 }), before = { earned: e.earned, spent: e.spent }; e.set(500); assert.equal(e.gold, 500); e.set(NaN); assert.equal(e.gold, 500); e.set(-9); assert.equal(e.gold, 0); e.set(1e12); assert.equal(e.gold, MAX_GOLD);
  assert.equal(e.earned, before.earned); assert.equal(e.spent, before.spent);
});
test('Âm thanh: 4 nhóm độc lập, nhóm tắt có âm lượng hiệu lực 0 và nhóm khác không bị ảnh hưởng', () => {
  assert.deepEqual(GROUPS, ['ambient', 'tower', 'monster', 'character']); const a = { ...DEFAULTS.audio, tower: false };
  assert.equal(groupSetting(a, 'tower').on, false); assert.equal(groupSetting(a, 'monster').on, true); assert.equal(groupSetting(a, 'ambient').vol, DEFAULTS.audio.musicVol);
  assert.ok(Object.values(SFX_GROUP).every((g) => GROUPS.includes(g))); assert.equal(SFX_GROUP.footstep, 'character');
});
test('Cài đặt: di trú từ sfx/sfxVol cũ sang 3 nhóm mới, giữ nhạc', () => {
  const r = migrate({ audio: { music: false, musicVol: 0.3, sfx: false, sfxVol: 0.4 } });
  assert.equal(r.audio.music, false); assert.equal(r.audio.musicVol, 0.3); for (const k of ['tower', 'monster', 'character']) { assert.equal(r.audio[k], false); assert.equal(r.audio[k + 'Vol'], 0.4); }
  assert.equal('sfx' in r.audio, false); assert.equal(migrate(null), null);
});
test('Rung: mẫu theo sát thương, an toàn khi không hỗ trợ, tôn trọng công tắc', () => {
  assert.deepEqual(patternFor(1, false), [35]); assert.ok(patternFor(3, false).length > 1); assert.ok(patternFor(1, true).length > 1);
  resetHapticsForTest(); assert.equal(vibrate([30], 1000), false); // Node: không có navigator.vibrate → false, không ném lỗi
});
test('PWA: chỉ đăng ký service worker ngoài APK', () => {
  assert.equal(canRegister({ serviceWorker: {} }, false), true); assert.equal(canRegister({ serviceWorker: {} }, true), false); assert.equal(canRegister({}, false), false); assert.equal(canRegister(null, false), false);
});
test('Multiplayer: Dash không nằm trong SKILLS (checksum giao thức không đổi)', () => {
  assert.ok(!Object.keys(SKILLS).some((k) => /dash/i.test(k)));
});
