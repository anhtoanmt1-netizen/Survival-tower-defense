// AUTOTERRAIN: chọn sprite theo hàng xóm. Vách: mặt trước / đầu trái / đầu phải / đảo / thác, và biến thể "ven nước" khi phía nam là nước.
// Chỉ lật ngang khi registry cho phép (flipX) – vách có nhóm 'Cliff_Top_Right' lật thành đầu trái; không xoay vách.
import { F, C, isWaterC } from './classes.js';
import { BY_ID } from './registryIndex.js';
const h3 = (x, y, s = 0) => { let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(s + 1, 83492791)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0; };
const pick = (a, h) => a[h % a.length];
const LAND = { front: ['cliff_top_front_a', 'cliff_top_front_b', 'cliff_top_front_c', 'cliff_top_front_d'], end: ['cliff_corner_right_a', 'cliff_corner_right_b'], island: ['cliff_island_arch'] };
const WATER = { front: ['cliff_water_front_a', 'cliff_water_front_b'], left: ['cliff_water_left_end_a', 'cliff_water_left_end_b'], right: ['cliff_water_right_end_a', 'cliff_water_right_end_b'], island: ['cliff_water_front_b'] };
// Mặt dưới (phía nam) của ô vách là nước?
export function southIsWater(map, x, y) { const { width: W, height: H, cls } = map; return y + 1 < H && isWaterC(cls[(y + 1) * W + x]); }
export function cliffSprite(map, x, y) {
  const { width: W, feat, fvar } = map, i = y * W + x, has = (xx) => xx >= 0 && xx < W && feat[y * W + xx] === F.CLIFF, L = has(x - 1), R = has(x + 1), water = southIsWater(map, x, y), h = h3(x, y);
  if (fvar[i] === 2) return { id: 'cliff_waterfall', flipX: false, kind: 'falls' };
  if (!L && !R) return water ? { id: pick(WATER.island, h), flipX: (h & 8) > 0, kind: 'island' } : { id: LAND.island[0], flipX: (h & 8) > 0, kind: 'island' };
  if (L && R) return { id: pick(water ? WATER.front : LAND.front, h), flipX: (h & 16) > 0, kind: 'front' };
  if (!L && R) return water ? { id: pick(WATER.left, h), flipX: false, kind: 'left' } : { id: pick(LAND.end, h), flipX: true, kind: 'left' };   // đầu TRÁI = lật ngang đầu phải
  return water ? { id: pick(WATER.right, h), flipX: false, kind: 'right' } : { id: pick(LAND.end, h), flipX: false, kind: 'right' };
}
const ROCKS = { big: ['rock_mound_large', 'rock_large_tip', 'rock_cluster_wide'], med: ['rock_cluster_plants', 'cliff_island_mound'] };
export const rockSprite = (map, x, y) => ({ id: pick(map.fvar[y * map.width + x] === 0 ? ROCKS.big : ROCKS.med, h3(x, y, 3)), flipX: (h3(x, y, 5) & 1) === 1 });
// Loài cây theo VÙNG (nhiễu tần thấp) và nhóm loài của chủ đề: rừng thông, sồi, vườn táo, hoa anh đào...
export function treeSpecies(map, x, y, zoneNoise, zones, allZones) {
  const names = zones || ['oak'], t = zoneNoise(x * 0.045 + 3, y * 0.045 + 3), zi = Math.min(names.length - 1, Math.floor(Math.max(0, Math.min(0.999, (t - 0.25) / 0.5)) * names.length)), z = allZones.find((q) => q.name === names[zi]) || allZones[0];
  return z.species[h3(x, y, 7) % z.species.length];
}
// Kiểm tra quy tắc kết nối của sprite vách với ô hàng xóm: chân vách (S) khớp với đất/nước, mặt trên (N) là đất.
export function checkCliffRules(map) {
  const { width: W, height: H, feat, cls } = map, bad = []; const st = {};
  for (let y = 1; y < H - 1; y++) for (let x = 0; x < W; x++) if (feat[y * W + x] === F.CLIFF) {
    const s = cliffSprite(map, x, y), a = BY_ID[s.id], south = southIsWater(map, x, y) ? 'water' : 'ground', northOk = !isWaterC(cls[(y - 1) * W + x]);
    st[s.kind] = (st[s.kind] || 0) + 1;
    const sOk = a.edges.S.split('|').includes(south) || (south === 'ground' && a.edges.S === 'ground') || (south === 'water' && a.edges.S === 'water');
    if (!sOk || !northOk) bad.push({ x, y, id: s.id, south, northOk });
    if (s.flipX && !a.flipX) bad.push({ x, y, id: s.id, reason: 'lật không được phép' });
  }
  return { bad, kinds: st };
}
