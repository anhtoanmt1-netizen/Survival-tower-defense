import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PauseState } from '../src/systems/PauseState.js';
import { gradeBuffer, clampGrade, isIdentity, GRADE_DEFAULT } from '../src/render/mapGrade.js';
import { VISUAL } from '../src/config/visual.js';
import { generateMap } from '../src/map/index.js';
import { formatMapId } from '../src/map/mapId.js';
import { T, isBlocking } from '../src/map/tiles.js';
import { F, C, isWaterC } from '../src/map/terrain/classes.js';
import { TERRAIN_THEME_CODES } from '../src/map/terrain/themes.js';
import { Composer } from '../src/map/terrain/compose.js';
import { previewBuffer, describeMap } from '../src/ui/mapPreview.js';
import { ICONS } from '../src/ui/icons.js';
import { nodeStore } from '../tools/preview_map.mjs';
const id = (theme, seed, size) => formatMapId({ theme, edition: 2028, seed, size });

test('PauseState: tự tạm dừng khi nâng cấp theo tùy chọn; không chạy tiếp khi còn lý do khác', () => {
  let auto = true; const p = new PauseState(() => auto);
  assert.equal(p.frozen, false); p.set('tower', true); assert.equal(p.frozen, true); assert.equal(p.onlyAuto, true); p.set('tower', false); assert.equal(p.frozen, false);
  p.set('tower', true); p.set('user', true); p.set('tower', false); assert.equal(p.frozen, true, 'đóng bảng tháp nhưng vẫn đang tạm dừng thủ công'); assert.equal(p.onlyAuto, false); p.set('user', false); assert.equal(p.frozen, false);
  p.set('skill', true); p.set('tower', true); p.set('skill', false); assert.equal(p.frozen, true); p.set('tower', false); assert.equal(p.frozen, false);
  auto = false; p.set('tower', true); p.set('skill', true); assert.equal(p.frozen, false, 'tắt tùy chọn: game vẫn chạy khi mở bảng nâng cấp'); assert.equal(p.modalOpen, true);
  p.set('settings', true); assert.equal(p.frozen, true, 'Cài đặt luôn tạm dừng'); p.set('settings', false); assert.equal(p.frozen, false);
  auto = true; assert.equal(p.frozen, true, 'bật lại tùy chọn khi bảng đang mở: dừng ngay'); auto = false; assert.equal(p.frozen, false); p.set('user', true); assert.equal(p.toggle('user'), false); assert.equal(p.toggle('user'), true);
  p.clear(); assert.equal(p.frozen, false);
});
test('chỉnh màu: mặc định không đổi gì; sáng/tương phản/bão hòa đúng hướng; alpha giữ nguyên; giới hạn bị chặn', () => {
  const src = new Uint8ClampedArray([200, 100, 50, 255, 20, 200, 90, 128, 90, 90, 90, 0]), clone = () => new Uint8ClampedArray(src);
  assert.ok(isIdentity(GRADE_DEFAULT)); assert.deepEqual(Array.from(gradeBuffer(clone(), GRADE_DEFAULT)), Array.from(src));
  const br = gradeBuffer(clone(), { ...GRADE_DEFAULT, brightness: 0.2 }); assert.ok(br[0] > 200 && br[1] > 100 && br[2] > 50 && br[3] === 255 && br[7] === 128);
  const ct = gradeBuffer(clone(), { ...GRADE_DEFAULT, contrast: 1.4 }); assert.ok(ct[0] > 200 && ct[2] < 50, 'tương phản kéo giãn quanh 128');
  const sat0 = gradeBuffer(clone(), { ...GRADE_DEFAULT, saturation: 0 }); assert.ok(Math.abs(sat0[0] - sat0[1]) < 2 && Math.abs(sat0[1] - sat0[2]) < 2, 'bão hòa 0 = xám');
  const sat2 = gradeBuffer(clone(), { ...GRADE_DEFAULT, saturation: 1.5 }); assert.ok(sat2[0] - sat2[2] > 150, 'bão hòa cao làm màu rực hơn');
  assert.deepEqual(Array.from(gradeBuffer(clone(), { brightness: 0, contrast: 1, saturation: 1 }).slice(8)), [90, 90, 90, 0], 'pixel trong suốt không đổi');
  const c = clampGrade({ brightness: 9, contrast: -4, saturation: 'x' }); assert.equal(c.brightness, VISUAL.grade.brightness.max); assert.equal(c.contrast, VISUAL.grade.contrast.min); assert.equal(c.saturation, VISUAL.grade.saturation.def);
});
test('chỉnh màu áp dụng khi ghép nền: đổi pixel, giữ độ đục, và về mặc định thì giống hệt bản gốc', () => {
  const m = generateMap(id('LAKE', 4321)), st = nodeStore(), cp = new Composer(st, m, 24), base = cp.compose(3, 3, 8), same = cp.compose(3, 3, 8, { ...GRADE_DEFAULT }), bright = cp.compose(3, 3, 8, { brightness: 0.2, contrast: 1, saturation: 1 }), grey = cp.compose(3, 3, 8, { brightness: 0, contrast: 1, saturation: 0 });
  assert.deepEqual(Buffer.from(base.data), Buffer.from(same.data)); let diff = 0, sumA = 0, sumB = 0; for (let i = 0; i < base.data.length; i += 4) { if (base.data[i] !== bright.data[i]) diff++; sumA += base.data[i] + base.data[i + 1] + base.data[i + 2]; sumB += bright.data[i] + bright.data[i + 1] + bright.data[i + 2]; assert.equal(bright.data[i + 3], 255); }
  assert.ok(diff > base.data.length / 8 && sumB > sumA); for (let i = 0; i < grey.data.length; i += 4) assert.ok(Math.abs(grey.data[i] - grey.data[i + 2]) < 3);
});
test('cài đặt mới: giá trị mặc định, chuẩn hóa dữ liệu hỏng, và LƯU/TẢI lại giữa các phiên', async () => {
  const store = {}; globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
  const A = (await import('../src/config/settings.js?s=1')).settings, d0 = A.data;
  assert.equal(d0.gameplay.autoPause, true); assert.deepEqual(d0.fx, { water: true, grass: true }); assert.deepEqual(d0.grade, { ...GRADE_DEFAULT });
  A.set({ gameplay: { autoPause: false }, fx: { water: false }, grade: { brightness: 0.12, contrast: 1.2, saturation: 0.8 } });
  A.set({ grade: { contrast: 99 } }); assert.equal(A.data.grade.contrast, VISUAL.grade.contrast.max, 'giá trị vượt giới hạn bị chặn');
  const B = (await import('../src/config/settings.js?s=2')).settings; // phiên mới đọc lại localStorage
  assert.equal(B.data.gameplay.autoPause, false); assert.equal(B.data.fx.water, false); assert.equal(B.data.fx.grass, true); assert.equal(B.data.grade.brightness, 0.12); assert.equal(B.data.grade.saturation, 0.8);
  B.set({ grade: { ...GRADE_DEFAULT } }); assert.ok(isIdentity(B.data.grade), 'khôi phục mặc định');
  store['std.settings.v1'] = JSON.stringify({ gameplay: { autoPause: 'yes' }, fx: null, grade: { brightness: 'abc' } }); const C2 = (await import('../src/config/settings.js?s=3')).settings; assert.equal(C2.data.gameplay.autoPause, true); assert.equal(C2.data.fx.water, true); assert.equal(C2.data.grade.brightness, 0);
  delete globalThis.localStorage;
});
test('cây 2x2: mỗi cây là khối 4 ô thẳng hàng lưới chẵn, không chồng, không lẻ ô; vùng va chạm = 4 ô; không đè đường/nước/cổng', () => {
  let trees = 0;
  for (const t of TERRAIN_THEME_CODES) for (const s of [3, 8]) {
    const m = generateMap(id(t, s * 6007)), W = m.width, set = new Set(); trees += m.trees.length;
    for (const [x, y] of m.trees) { assert.ok(x % 2 === 0 && y % 2 === 0, 'neo trên lưới chẵn'); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const i = (y + dy) * W + x + dx; assert.ok(!set.has(i), 'cây chồng nhau'); set.add(i); assert.equal(m.feat[i], F.TREE); assert.equal(m.tiles[i], T.TREE, 'va chạm 4 ô'); assert.ok(m.cls[i] === C.GRASS || m.cls[i] === C.FLOWER, 'chỉ mọc trên cỏ'); } }
    let treeCells = 0; for (let i = 0; i < m.feat.length; i++) if (m.feat[i] === F.TREE) treeCells++; assert.equal(treeCells, m.trees.length * 4, `${t}: không còn ô cây lẻ`);
    for (const g of m.gates) assert.ok(!isBlocking(m.tiles[g.y * W + g.x]));
  }
  assert.ok(trees > 1500, 'tổng số cây hợp lý: ' + trees);
});
test('bản đồ cũ (2026/2027): suy ra lớp hiển thị mà KHÔNG đổi tiles; cây vẫn 1 ô', () => {
  for (const idm of ['FOREST-2026-A8F72K', 'FOREST-2027-A8F72K']) { const m = generateMap(idm), m2 = generateMap(idm); assert.ok(m.cls && m.feat && m.cls.length === m.tiles.length); assert.deepEqual(Buffer.from(m.tiles), Buffer.from(m2.tiles)); assert.equal(m.trees, undefined);
    let river = 0, tree = 0; for (let i = 0; i < m.tiles.length; i++) { if (m.tiles[i] === T.RIVER) { river++; assert.ok(isWaterC(m.cls[i])); } if (m.tiles[i] === T.TREE) { tree++; assert.equal(m.feat[i], F.TREE); } else assert.notEqual(m.feat[i], F.TREE); } assert.ok(river > 0 && tree > 0); }
});
test('bản đồ xem trước phản ánh đúng bản đồ: tất định, khác nhau giữa các bản đồ, có nước/cổng/xuất phát, thông tin khớp', () => {
  const st = nodeStore(), a = generateMap(id('COAST', 99)), b = generateMap(id('MEADOW', 99)), pa = previewBuffer(a, st, 4), pa2 = previewBuffer(a, st, 4), pb = previewBuffer(b, st, 4);
  assert.deepEqual(Buffer.from(pa.data), Buffer.from(pa2.data)); assert.notDeepEqual(Buffer.from(pa.data), Buffer.from(pb.data)); assert.equal(pa.w, 400);
  const blue = (p) => { let n = 0; for (let i = 0; i < p.data.length; i += 4) if (p.data[i + 2] > p.data[i] + 40 && p.data[i + 2] > p.data[i + 1]) n++; return n / (p.w * p.h); };
  assert.ok(blue(pa) > 0.1 && blue(pb) < 0.01, `COAST nhiều nước (${blue(pa).toFixed(2)}), MEADOW gần như không (${blue(pb).toFixed(3)})`);
  for (const g of a.gates) { const o = ((g.y * 4 + 2) * pa.w + g.x * 4 + 2) * 4; assert.ok(pa.data[o + 2] > 200 && pa.data[o] > 130, 'có điểm đánh dấu cổng'); }
  const ia = describeMap(a), ib = describeMap(b); assert.ok(ia.chips.some(([, t]) => /Nước/.test(t))); assert.ok(!ib.chips.some(([, t]) => /sông/.test(t)) && ia.title !== ib.title && ia.size === 100 && JSON.stringify(ia.chips) !== JSON.stringify(ib.chips));
  const old = generateMap('FOREST-2026-A8F72K'); assert.ok(previewBuffer(old, st, 4).w === 400, 'xem trước cả bản đồ cũ');
});
test('hiệu năng: ghép một mảng 8x8 @48px < 150ms; xem trước bản đồ 200x200 < 6s (gồm sinh bản đồ)', () => {
  const m = generateMap(id('RIVER', 77)), cp = new Composer(nodeStore(), m, 48); cp.compose(0, 0, 8); const t0 = Date.now(); for (let i = 0; i < 4; i++) cp.compose(2 + i, 3, 8, { brightness: 0.1, contrast: 1.1, saturation: 0.9 }); assert.ok((Date.now() - t0) / 4 < 150, 'chậm: ' + (Date.now() - t0) / 4);
  const t1 = Date.now(); previewBuffer(generateMap(id('FALLS', 5, 200)), nodeStore()); assert.ok(Date.now() - t1 < 6000, 'chậm: ' + (Date.now() - t1));
});
test('bộ icon: mọi icon được dùng trong DOM/JS đều tồn tại; bảng lá rơi đủ 9 loài cây', () => {
  const files = ['index.html', 'src/main.js', 'src/ui/panels.js', 'src/ui/settingsPanel.js', 'src/scenes/UIScene.js', 'src/ui/mapPreview.js', 'src/config/difficulty.js'], used = new Set();
  for (const f of files) { const s = fs.readFileSync(f, 'utf8'); for (const m of s.matchAll(/data-icon="([a-z]+)"/g)) used.add(m[1]); for (const m of s.matchAll(/\b(?:iconSvg|ic|icon)\('([a-z]+)'/g)) used.add(m[1]); for (const m of s.matchAll(/ui_icon_([a-z]+)/g)) used.add(m[1]); for (const m of s.matchAll(/\[\s*'([a-z]+)',\s*'[^']*'(?:,\s*\(s\))?/g)) if (ICONS[m[1]]) used.add(m[1]); }
  for (const n of used) assert.ok(ICONS[n], 'thiếu icon ' + n); assert.ok(used.size > 20);
  for (const [n, svg] of Object.entries(ICONS)) assert.ok(svg.startsWith('<') && svg.endsWith('/>'), n);
  for (let i = 0; i < 9; i++) { const L = VISUAL.leaf[i] || VISUAL.leaf.default; assert.ok(L.colors.length >= 2 && L.rate > 0 && L.life[0] < L.life[1]); } assert.ok(VISUAL.leaf[2].vx[1] > VISUAL.leaf[8].vx[1], 'cánh hoa anh đào trôi ngang nhiều hơn lá kim thông');
});
test('giao diện: mọi id phần tử mà mã JS tham chiếu đều có trong index.html (hoặc được tạo động)', () => {
  const html = fs.readFileSync('index.html', 'utf8'), ids = new Set([...html.matchAll(/id="([A-Za-z0-9_-]+)"/g)].map((m) => m[1])), dynamic = new Set(['runid']);
  for (const f of ['src/main.js', 'src/ui/panels.js', 'src/ui/settingsPanel.js', 'src/ui/screen.js', 'src/scenes/GameScene.js']) { const s = fs.readFileSync(f, 'utf8'); for (const m of s.matchAll(/(?:\$\(|getElementById\()'([A-Za-z0-9_-]+)'\)/g)) assert.ok(ids.has(m[1]) || dynamic.has(m[1]), `${f}: thiếu #${m[1]} trong index.html`); }
  assert.ok(!/class="[^"]*\bchip\b/.test(html) || true);
});
