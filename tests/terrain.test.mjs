import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateMap, newRandomMapId, parseMapId } from '../src/map/index.js';
import { formatMapId } from '../src/map/mapId.js';
import { validateMap } from '../src/map/validate.js';
import { validateTerrain } from '../src/map/terrain/qa.js';
import { checkCliffRules, cliffSprite } from '../src/map/terrain/autoterrain.js';
import { TERRAIN_THEMES, TERRAIN_THEME_CODES } from '../src/map/terrain/themes.js';
import { ASSETS, BY_ID, edgeMatches } from '../src/map/terrain/registryIndex.js';
import { C, F, isWaterC } from '../src/map/terrain/classes.js';
import { Composer } from '../src/map/terrain/compose.js';
import { nodeStore } from '../tools/preview_map.mjs';
import { decodePng } from '../src/map/terrain/png.js';
const id = (theme, seed, size) => formatMapId({ theme, edition: 2028, seed, size });
const same = (a, b) => Buffer.compare(Buffer.from(a.buffer, a.byteOffset, a.byteLength), Buffer.from(b.buffer, b.byteOffset, b.byteLength)) === 0;

test('Asset Registry: đủ 51 sprite + 7 texture nền, ID duy nhất, đủ metadata, file tồn tại và đúng kích thước', () => {
  assert.equal(ASSETS.length, 58); assert.equal(new Set(ASSETS.map((a) => a.id)).size, 58);
  assert.deepEqual([...new Set(ASSETS.filter((a) => a.index >= 0).map((a) => a.index))].sort((a, b) => a - b), Array.from({ length: 51 }, (_, i) => i), 'không bỏ sót asset nào trên sheet');
  for (const a of ASSETS) {
    for (const k of ['id', 'name', 'group', 'sub', 'kind', 'layer', 'weight', 'size', 'bbox', 'usable', 'edges', 'src']) assert.ok(a[k] !== undefined, `${a.id} thiếu ${k}`);
    assert.ok(/^[A-E]_/.test(a.group) && a.layer >= 1 && a.layer <= 9 && a.weight > 0, a.id); for (const s of ['N', 'S', 'E', 'W']) assert.ok(a.edges[s], `${a.id} thiếu cạnh ${s}`);
    const f = 'public/assets/' + a.src; assert.ok(fs.existsSync(f), f); const im = decodePng(fs.readFileSync(f)); assert.deepEqual([im.w, im.h], a.size, a.id);
    assert.ok(a.usable[0] >= 0 && a.usable[2] <= a.size[0] && a.usable[3] <= a.size[1], a.id + ' usable');
  }
  const groups = new Set(ASSETS.map((a) => a.group)); for (const g of ['A_GRASS', 'B_DIRT', 'C_WATER', 'D_ROCK_CLIFF', 'E_DECOR']) assert.ok(groups.has(g), g);
  for (const sub of ['Grass_Base', 'Grass_Detail', 'Grass_To_Sand', 'Dirt_Path', 'Water_Deep', 'Water_Shallow', 'Water_Shore_Sand', 'Water_Falls', 'Cliff_Top', 'Cliff_Water_Edge', 'Cliff_Island', 'Rock_Cluster', 'Grass_Bushes']) assert.ok(ASSETS.some((a) => a.sub === sub), 'thiếu phân loại ' + sub);
  assert.ok(edgeMatches('grass|sand', 'sand') && !edgeMatches('grass', 'water') && edgeMatches('any', 'water'));
});
test('chỉ cho lật các asset đối xứng (vách nước không lật; không có vách nào được xoay)', () => {
  for (const a of ASSETS.filter((x) => x.group === 'D_ROCK_CLIFF' || x.sub === 'Water_Falls')) assert.equal(a.rotate, false, a.id + ' không được xoay');
  for (const a of ASSETS.filter((x) => x.sub === 'Cliff_Water_Edge' && /_(left|right)_end/.test(x.id))) assert.equal(a.flipX, false, a.id);
});
test('7 chủ đề đăng ký đủ; cùng Map ID ⇒ cùng bản đồ bit-by-bit; ID khác ⇒ khác', () => {
  assert.deepEqual(TERRAIN_THEME_CODES.length, 7);
  for (const t of TERRAIN_THEME_CODES) { const a = generateMap(id(t, 424242)), b = generateMap(id(t, 424242)), c = generateMap(id(t, 424243));
    for (const k of ['tiles', 'cls', 'feat', 'fvar']) assert.ok(same(a[k], b[k]), `${t}.${k}`); assert.ok(!same(a.cls, c.cls) || !same(a.feat, c.feat), t + ' khác seed phải khác bản đồ'); assert.equal(JSON.stringify(a.decor), JSON.stringify(b.decor)); }
});
test('mỗi chủ đề × nhiều seed: hợp lệ về khả năng chơi + chất lượng địa hình (QA), tự sửa/sinh lại nếu lỗi', () => {
  let retried = 0, total = 0;
  for (const t of TERRAIN_THEME_CODES) for (let s = 1; s <= 8; s++) {
    const m = generateMap(id(t, s * 104729)), v = validateMap(m), q = validateTerrain(m); total++; if (m.terrain.meta.attempt > 0) retried++;
    assert.ok(v.ok, `${t}#${s} ${v.errors}`); assert.ok(q.ok, `${t}#${s} ${q.errors}`); const r = checkCliffRules(m); assert.equal(r.bad.length, 0, `${t}#${s} vách sai quy tắc: ${JSON.stringify(r.bad[0])}`);
    for (const g of m.gates) assert.ok(!isWaterC(m.cls[g.y * m.width + g.x]) && m.feat[g.y * m.width + g.x] === F.NONE, 'cổng bị chặn');
  }
  console.log(`  ${total - retried}/${total} bản đồ đạt ngay lần sinh đầu`); assert.ok(retried / total < 0.25, 'tỉ lệ phải sinh lại quá cao');
});
test('các chủ đề có BỐ CỤC khác nhau thật (không chỉ khác tên)', () => {
  const agg = {}; for (const t of TERRAIN_THEME_CODES) { const a = { water: 0, cliff: 0, tree: 0, rivers: 0, lakes: 0, plateaus: 0, falls: 0 }, n = 6; for (let s = 1; s <= n; s++) { const m = generateMap(id(t, s * 7907)), q = m.terrain.qa.metrics, mt = m.terrain.meta; a.water += q.waterRatio / n; a.cliff += q.cliffCells / n; a.rivers += mt.rivers.length / n; a.lakes += mt.lakes.length / n; a.plateaus += mt.plateaus.length / n; a.falls += mt.falls.length / n; } agg[t] = a; }
  console.log('  ', JSON.stringify(Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, { water: +v.water.toFixed(3), cliff: Math.round(v.cliff), rivers: +v.rivers.toFixed(1), lakes: +v.lakes.toFixed(1) }]))));
  assert.ok(agg.MEADOW.water < 0.03 && agg.MEADOW.rivers === 0, 'MEADOW gần như không nước'); assert.ok(agg.RIVER.rivers >= 1 && agg.RIVER.water > 0.03, 'RIVER có sông'); assert.ok(agg.LAKE.lakes >= 1 && agg.LAKE.water > 0.04, 'LAKE có hồ lớn');
  assert.ok(agg.HIGHLAND.cliff > agg.MEADOW.cliff * 3 && agg.HIGHLAND.plateaus >= 10, 'HIGHLAND nhiều vách'); assert.ok(agg.COAST.water > 0.12 && agg.FALLS.water > 0.1, 'COAST/FALLS nhiều nước'); assert.ok(agg.FALLS.plateaus >= 6, 'FALLS có cụm đảo đá'); assert.ok(agg.WILD.plateaus >= 1);
});
test('kích thước 100/150/200 chạy cùng hệ thống; bề rộng sông, số vật thể co giãn theo diện tích, không kéo giãn hình', () => {
  const rv = {}, objs = {}, t0 = Date.now();
  for (const size of [100, 150, 200]) { const m = generateMap(id('RIVER', 31337, size)); assert.equal(m.tiles.length, size * size); assert.ok(validateMap(m).ok && validateTerrain(m).ok); rv[size] = m.terrain.meta.rivers[0].width; objs[size] = [...m.feat].filter((f) => f === F.TREE || f === F.ROCK).length / (size * size); }
  console.log('  bề rộng sông', JSON.stringify(rv), 'mật độ vật thể', JSON.stringify(Object.fromEntries(Object.entries(objs).map(([k, v]) => [k, +v.toFixed(3)]))), 'ms', Date.now() - t0);
  assert.ok(rv[150] > rv[100] && rv[200] > rv[150], 'sông rộng hơn khi bản đồ lớn'); for (const s of [150, 200]) assert.ok(Math.abs(objs[s] - objs[100]) < 0.12, 'mật độ giữ tương đối nhất quán');
  const a = generateMap(id('LAKE', 5, 100)), b = generateMap(id('LAKE', 5, 200)); assert.notDeepEqual(Array.from(a.cls.slice(0, 1000)), Array.from(b.cls.slice(0, 1000)));
});
test('bộ ghép: mọi pixel đục, tất định, và KHÔNG có đường nối giữa các mảng (ghép 8x8 = ghép 4x4)', () => {
  const m = generateMap(id('FALLS', 99)), st = nodeStore(), S = 24, a = new Composer(st, m, S), b = new Composer(st, m, S);
  const big = a.compose(3, 3, 8), again = b.compose(3, 3, 8); assert.ok(same(big.data, again.data), 'tất định');
  for (let i = 3; i < big.data.length; i += 4) { if (big.data[i] !== 255) { assert.fail('có pixel trong suốt'); } }
  for (let qy = 0; qy < 2; qy++) for (let qx = 0; qx < 2; qx++) { const sm = b.compose(6 + qx, 6 + qy, 4); for (let y = 0; y < sm.h; y++) for (let x = 0; x < sm.w; x++) { const o = (y * sm.w + x) * 4, O = ((qy * sm.h + y) * big.w + qx * sm.w + x) * 4; if (sm.data[o] !== big.data[O] || sm.data[o + 1] !== big.data[O + 1] || sm.data[o + 2] !== big.data[O + 2]) assert.fail(`khác nhau tại mảng ${qx},${qy} pixel ${x},${y}`); } }
});
test('autoterrain: đầu trái là bản lật của đầu phải (vách đất), vách ven nước chọn biến thể nước, thác chỉ ở vách có nước phía nam', () => {
  let land = 0, water = 0, falls = 0, flipsOk = true;
  for (const t of ['HIGHLAND', 'FALLS', 'RIVER']) for (let s = 1; s <= 4; s++) { const m = generateMap(id(t, s * 313)), W = m.width; for (let y = 1; y < m.height - 1; y++) for (let x = 0; x < W; x++) if (m.feat[y * W + x] === F.CLIFF) { const sp = cliffSprite(m, x, y), a = BY_ID[sp.id], wat = isWaterC(m.cls[(y + 1) * W + x]); if (wat) { water++; assert.ok(/water|waterfall/.test(sp.id), sp.id); } else { land++; assert.ok(!/water/.test(sp.id), sp.id); } if (sp.kind === 'falls') { falls++; assert.ok(wat && m.fvar[y * W + x] === 2); } if (sp.flipX && !a.flipX) flipsOk = false; } }
  assert.ok(land > 50 && water > 5 && flipsOk); console.log(`  vách đất ${land}, ven nước ${water}, thác ${falls}`);
});
test('Map ID: ngẫu nhiên chọn đủ chủ đề mới, giữ kích thước, parse/format hai chiều', () => {
  const seen = new Set(); for (let i = 0; i < 80; i++) { const p = parseMapId(newRandomMapId()); assert.ok(p.ok && p.edition === 2028); seen.add(p.theme); } assert.ok(seen.size >= 6, 'chọn ngẫu nhiên phải đa dạng: ' + [...seen]);
  for (const sz of [100, 150, 200]) { const mid = newRandomMapId('COAST', sz), p = parseMapId(mid); assert.ok(p.ok && p.theme === 'COAST' && p.size === sz, mid); assert.equal(p.id, mid); }
  assert.ok(parseMapId('COAST-2028-ABCDEF-150').ok && !parseMapId('NOPE-2028-ABCDEF').ok);
  for (const t of TERRAIN_THEME_CODES) assert.ok(TERRAIN_THEMES[t].name && TERRAIN_THEMES[t].vi && TERRAIN_THEMES[t].blurb);
});
test('hiệu năng: bản đồ 200x200 sinh < 8 giây', () => { const t0 = Date.now(); generateMap(id('WILD', 2024, 200)); assert.ok(Date.now() - t0 < 8000, 'chậm: ' + (Date.now() - t0)); });
