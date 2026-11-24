// Xem trước bản đồ bằng bộ ghép THẬT (cùng mã với game):  node tools/preview_map.mjs <MAP-ID> [out.png] [pixel/ô, mặc định 20]
import fs from 'node:fs'; import path from 'node:path';
import { generateMap } from '../src/map/index.js'; import { decodePng, encodePng } from '../src/map/terrain/png.js';
import { Composer, blit, scaleImage } from '../src/map/terrain/compose.js'; import { ASSETS, BY_ID } from '../src/map/terrain/registryIndex.js';
import { F } from '../src/map/terrain/classes.js'; import { VISUAL } from '../src/config/visual.js'; import { rockSprite, treeSpecies } from '../src/map/terrain/autoterrain.js'; import { TERRAIN_THEMES } from '../src/map/terrain/themes.js'; import { TREE_ZONES } from '../src/config/art.js'; import { makeNoise } from '../src/core/rng.js';
export function nodeStore(root = 'public/assets') { const c = new Map(), src = Object.fromEntries(ASSETS.map((a) => [a.id, a.src])); for (let i = 0; i < 9; i++) src['tree_' + i] = `trees/tree_${i}.png`; 
  const shadowTex = () => { const w = 64, h = 32, d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const q = Math.hypot((x - 31.5) / 32, (y - 15.5) / 16), a = q >= 1 ? 0 : q < 0.6 ? 0.9 - (q / 0.6) * 0.45 : 0.45 * (1 - (q - 0.6) / 0.4); const o = (y * w + x) * 4; d[o] = 20; d[o + 1] = 28; d[o + 2] = 16; d[o + 3] = a * 255; } return { w, h, data: d }; };
  return { get(id) { if (id === 'fx_shadow') return shadowTex(); let v = c.get(id); if (!v) { if (!src[id]) throw new Error('thiếu asset ' + id); v = decodePng(fs.readFileSync(path.join(root, src[id]))); c.set(id, v); } return v; } }; }
export function renderFull(map, S = 20, CH = 8) { // toàn bản đồ = nền + vật thể (cây/đá/bụi) xếp theo y
  const store = nodeStore(), cp = new Composer(store, map, S), W = map.width * S, H = map.height * S, out = new Uint8ClampedArray(W * H * 4);
  for (let cy = 0; cy * CH < map.height; cy++) for (let cx = 0; cx * CH < map.width; cx++) { const ch = cp.compose(cx, cy, CH); for (let y = 0; y < ch.h; y++) { const dy = cy * CH * S + y; if (dy >= H) break; const w = Math.min(ch.w, W - cx * CH * S); out.set(ch.data.subarray(y * ch.w * 4, (y * ch.w + w) * 4), (dy * W + cx * CH * S) * 4); } }
  const zone = makeNoise((map.seed ^ 0x51ed270b) >>> 0), th = TERRAIN_THEMES[map.terrain?.themeCode], objs = [], V = VISUAL.tree, k = S / 32; // k: px ảnh / px thế giới
  const shadow = (cx, by, w, h, a) => { const sw = Math.round(w * k), sh = Math.round(h * k); blit(out, W, H, cp.sprite('fx_shadow', sw, sh, false), Math.round(cx - sw / 2), Math.round(by - sh / 2), a / 0.9); };
  if (map.trees) for (const [x, y] of map.trees) objs.push([y + 2, 't2', x]);
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) { const f = map.feat[y * map.width + x]; if (f === F.TREE && !map.trees) objs.push([y, 't', x]); else if (f === F.ROCK) objs.push([y, 'r', x]); else if (f === F.BUSH) objs.push([y, 'b', x]); }
  objs.sort((a, b) => a[0] - b[0]);
  for (const [y, kind, x] of objs) { let id, flip = false, wW, bx = (x + 0.5) * S, by = (y + 0.95) * S;
    if (kind === 't2') { const sp = treeSpecies(map, x, y, zone, th?.zones, TREE_ZONES); id = 'tree_' + sp; wW = V.displayW; bx = (x + 1) * S; by = (y + V.baseOffset / 32) * S; shadow(bx, by - 2 * k, VISUAL.shadow.tree[0], VISUAL.shadow.tree[1], VISUAL.shadow.tree[2]); }
    else if (kind === 't') { id = 'tree_' + treeSpecies(map, x, y, zone, th?.zones, TREE_ZONES); wW = V.legacyW; shadow(bx, by, 40, 14, 0.28); }
    else if (kind === 'r') { const r = rockSprite(map, x, y); id = r.id; flip = r.flipX; wW = 48; shadow(bx, by, 46, 14, 0.26); } else { id = 'bush_cluster'; wW = 32; shadow(bx, by, 30, 10, 0.22); }
    const im = store.get(id), w = Math.round(wW * k), h = Math.round(im.h * w / im.w), s2 = cp.sprite(id, w, h, flip); blit(out, W, H, s2, Math.round(bx - w / 2), Math.round(by - h)); }
  return { W, H, data: out };
}
if (process.argv[1]?.endsWith('preview_map.mjs')) { const id = process.argv[2], S = +process.argv[4] || 20; const map = generateMap(id), r = renderFull(map, S); fs.writeFileSync(process.argv[3] || '/tmp/preview.png', encodePng(r.W, r.H, r.data)); console.log(id, r.W + 'x' + r.H, JSON.stringify(map.terrain.qa.metrics)); }
