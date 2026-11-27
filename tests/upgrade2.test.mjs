import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap, newRandomMapId } from '../src/map/index.js';
import { planLotus, LOTUS_SPRITES, LOTUS_TILES, LOTUS_ASPECT, LOTUS_TS } from '../src/map/lotusPlan.js';
import { isWaterC } from '../src/map/terrain/classes.js';
import { computeActionRow, ROW_COUNT } from '../src/ui/actionRow.js';
import { dashCooldown, DASH } from '../src/config/skills.js';
import { assetManifest, LOTUS_COUNT } from '../src/config/art.js';
import fs from 'node:fs';

const waterMap = () => { for (let i = 0; i < 40; i++) { const m = generateMap(newRandomMapId('LAKE', 100)); if (planLotus(m).length > 5) return m; } throw new Error('không tìm được map nhiều nước'); };
test('Hoa sen: chỉ mọc trên nước, cách bờ ≥1 ô, không chồng nhau, tránh cổng/điểm xuất phát, tất định', () => {
  const m = waterMap(), a = planLotus(m), b = planLotus(m); assert.deepEqual(a, b); assert.ok(a.length > 5);
  const water = (x, y) => x >= 0 && y >= 0 && x < m.width && y < m.height && isWaterC(m.cls[y * m.width + x]);
  for (const q of a) {
    assert.ok(q.v >= 0 && q.v < LOTUS_SPRITES); const x = q.x / LOTUS_TS, y = q.y / LOTUS_TS, w = q.w / LOTUS_TS, h = w * LOTUS_ASPECT[q.v];
    for (let ty = Math.floor(y - h / 2) - 1; ty <= Math.floor(y + h / 2) + 1; ty++) for (let tx = Math.floor(x - w / 2) - 1; tx <= Math.floor(x + w / 2) + 1; tx++) assert.ok(water(tx, ty), `ô (${tx},${ty}) không phải nước`);
    for (const g of m.gates || []) assert.ok(Math.hypot(x - g.x - 0.5, y - g.y - 0.5) >= 5); assert.ok(q.rank >= 0 && q.rank < 1);
  }
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { const p = a[i], q = a[j], hp = p.w * LOTUS_ASPECT[p.v], hq = q.w * LOTUS_ASPECT[q.v]; assert.ok(Math.abs(p.x - q.x) >= (p.w + q.w) / 2 || Math.abs(p.y - q.y) >= (hp + hq) / 2, 'hai bông chồng nhau'); }
});
test('Hoa sen: bản đồ không có nước thì không có sen; kích thước hiển thị hợp lý', () => {
  for (let i = 0; i < 30; i++) { const m = generateMap(newRandomMapId('MEADOW', 100)); let w = 0; for (let k = 0; k < m.cls.length; k++) if (isWaterC(m.cls[k])) w++; if (w === 0) assert.equal(planLotus(m).length, 0); }
  assert.equal(LOTUS_TILES.length, LOTUS_SPRITES); assert.equal(LOTUS_ASPECT.length, LOTUS_SPRITES); assert.ok(LOTUS_TILES.every((t) => t >= 1 && t <= 4));
});
test('Hoa sen: tài nguyên đã tách có trong manifest và trên đĩa', () => {
  assert.equal(LOTUS_COUNT, LOTUS_SPRITES); const keys = assetManifest().map((e) => e[0]); for (let i = 0; i < LOTUS_COUNT; i++) { assert.ok(keys.includes(`lotus_${i}`)); assert.ok(fs.existsSync(new URL(`../public/assets/lotus/lotus_${i}.png`, import.meta.url))); }
});
test('Hàng kỹ năng: một hàng ngang bắt đầu từ XÂY sang trái, cách đều, không chồng, nằm trong màn hình ở mọi cỡ', () => {
  for (const [w, h] of [[360, 640], [412, 915], [390, 844], [320, 568], [844, 390], [915, 412], [1280, 720], [600, 400]]) for (const u of [0.8, 1, 1.2]) {
    const ins = { left: 0, right: 0, bottom: 0 }, J = { R: 58 * u, rx: 28 + 58 * u, ry: h - 28 - 58 * u }, r = computeActionRow({ width: w, height: h, u, insets: ins, joyRight: J.rx + J.R * 1.05 + 10, joyTop: J.ry - J.R * 1.05 - 8 });
    assert.equal(r.xs.length, ROW_COUNT); assert.ok(r.bx > r.xs[0] && r.xs.every((x, i) => i === 0 || x < r.xs[i - 1]), 'thứ tự từ phải sang trái');
    const edges = [[r.bx - r.rb, r.bx + r.rb], ...r.xs.map((x) => [x - r.rk, x + r.rk])]; for (let i = 1; i < edges.length; i++) assert.ok(edges[i][1] <= edges[i - 1][0] + 1e-6, `chồng nhau ${w}x${h} u=${u}`);
    const gaps = []; for (let i = 1; i < edges.length; i++) gaps.push(edges[i - 1][0] - edges[i][1]); assert.ok(gaps.every((g) => Math.abs(g - gaps[0]) < 1e-6), 'khoảng cách đều');
    assert.ok(r.left >= 0 && r.bx + r.rb <= w && r.y - r.rb >= 0 && r.y + r.rb <= h, `ngoài màn hình ${w}x${h}`); assert.ok(r.sc >= 0.55 && r.sc <= 1);
    if (!r.lifted) assert.ok(r.left >= J.rx + J.R * 1.05, `đè joystick ${w}x${h}`); else assert.ok(r.y + r.rb <= J.ry - J.R * 1.05 - 8 + 1e-6 || r.sc <= 0.56, `nâng chưa đủ cao ${w}x${h}`);
  }
});
test('Lướt: hồi chiêu giảm đều từ 30s (cấp 1) tới 1s (cấp tối đa)', () => {
  const v = []; for (let l = 0; l <= DASH.maxLevel; l++) v.push(dashCooldown(l)); assert.equal(v[0], 30); assert.equal(v.at(-1), 1); for (let i = 1; i < v.length; i++) assert.ok(v[i] < v[i - 1]); assert.equal(dashCooldown(99), 1);
  const d = v.slice(1).map((x, i) => v[i] - x); assert.ok(Math.max(...d) - Math.min(...d) < 1e-9, 'giảm đều');
});
