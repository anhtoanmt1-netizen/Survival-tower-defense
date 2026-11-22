// Xem trước bản đồ bằng bộ ghép THẬT (cùng mã với game):  node tools/preview_map.mjs <MAP-ID> [out.png] [pixel/ô, mặc định 20]
import fs from 'node:fs'; import path from 'node:path';
import { generateMap } from '../src/map/index.js'; import { decodePng, encodePng } from '../src/map/terrain/png.js';
import { Composer, blit, scaleImage } from '../src/map/terrain/compose.js'; import { ASSETS, BY_ID } from '../src/map/terrain/registryIndex.js';
import { F } from '../src/map/terrain/classes.js'; import { rockSprite, treeSpecies } from '../src/map/terrain/autoterrain.js'; import { TERRAIN_THEMES } from '../src/map/terrain/themes.js'; import { TREE_ZONES } from '../src/config/art.js'; import { makeNoise } from '../src/core/rng.js';
export function nodeStore(root = 'public/assets') { const c = new Map(), src = Object.fromEntries(ASSETS.map((a) => [a.id, a.src])); for (let i = 0; i < 9; i++) src['tree_' + i] = `trees/tree_${i}.png`;
  return { get(id) { let v = c.get(id); if (!v) { if (!src[id]) throw new Error('thiếu asset ' + id); v = decodePng(fs.readFileSync(path.join(root, src[id]))); c.set(id, v); } return v; } }; }
export function renderFull(map, S = 20, CH = 8) { // toàn bản đồ = nền + vật thể (cây/đá/bụi) xếp theo y
  const store = nodeStore(), cp = new Composer(store, map, S), W = map.width * S, H = map.height * S, out = new Uint8ClampedArray(W * H * 4);
  for (let cy = 0; cy * CH < map.height; cy++) for (let cx = 0; cx * CH < map.width; cx++) { const ch = cp.compose(cx, cy, CH); for (let y = 0; y < ch.h; y++) { const dy = cy * CH * S + y; if (dy >= H) break; const w = Math.min(ch.w, W - cx * CH * S); out.set(ch.data.subarray(y * ch.w * 4, (y * ch.w + w) * 4), (dy * W + cx * CH * S) * 4); } }
  const zone = makeNoise((map.seed ^ 0x51ed270b) >>> 0), th = TERRAIN_THEMES[map.terrain?.themeCode], objs = [];
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) { const f = map.feat[y * map.width + x]; if (f === F.TREE) objs.push([y, 't', x]); else if (f === F.ROCK) objs.push([y, 'r', x]); else if (f === F.BUSH) objs.push([y, 'b', x]); }
  objs.sort((a, b) => a[0] - b[0]);
  for (const [y, k, x] of objs) { let id, flip = false, wc; if (k === 't') { id = 'tree_' + treeSpecies(map, x, y, zone, th?.zones, TREE_ZONES); wc = 1.65; } else if (k === 'r') { const r = rockSprite(map, x, y); id = r.id; flip = r.flipX; wc = 1.45; } else { id = 'bush_cluster'; wc = 1.0; }
    const im = store.get(id), isT = k === 't', w = Math.round(wc * S * (isT ? 1 : 1)), h = Math.round(im.h * w / im.w), s = cp.sprite(id, w, h, flip); blit(out, W, H, s, Math.round((x + 0.5) * S - w / 2), Math.round((y + 0.95) * S - h)); }
  return { W, H, data: out };
}
if (process.argv[1]?.endsWith('preview_map.mjs')) { const id = process.argv[2], S = +process.argv[4] || 20; const map = generateMap(id), r = renderFull(map, S); fs.writeFileSync(process.argv[3] || '/tmp/preview.png', encodePng(r.W, r.H, r.data)); console.log(id, r.W + 'x' + r.H, JSON.stringify(map.terrain.qa.metrics)); }
