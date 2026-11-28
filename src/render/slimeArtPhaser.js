// Nối bộ vẽ canvas (slimeArt.js) vào Phaser: mỗi slime V2 một texture `slime_v2_<id>` + anim `slime_v2_<id>:idle|move|die`. Tạo lười khi lần đầu cần.
import { drawSheet, sheetSize, ANIMS, displayScale, ORIGIN_Y } from './slimeArt.js';
const RATES = { idle: [4, -1], move: [10, -1], die: [9, 0] };
export { displayScale, ORIGIN_Y };
export function ensureSlimeV2(scene, id) {
  const key = 'slime_v2_' + id; if (scene.textures.exists(key)) return key;
  const { w, h } = sheetSize(id), tex = scene.textures.createCanvas(key, w, h), c = tex.getContext(); c.imageSmoothingEnabled = true;
  for (const f of drawSheet(c, id)) tex.add(f.key, 0, f.x, f.y, f.w, f.h);
  tex.refresh(); tex.setFilter(1); // LINEAR: sprite vector mượt, không vỡ hạt khi thu nhỏ
  for (const [a, n] of Object.entries(ANIMS)) scene.anims.create({ key: `${key}:${a}`, frames: Array.from({ length: n }, (_, i) => ({ key, frame: `${a}_${i}` })), frameRate: RATES[a][0], repeat: RATES[a][1] });
  return key;
}
