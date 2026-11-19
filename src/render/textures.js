// Pixel art vẽ bằng code (không cần file ảnh). Thay bằng sprite sheet thật: chỉ cần giữ nguyên key + kích thước.
import { mulberry32 } from '../core/rng.js';
import { T } from '../map/tiles.js';
const TS = 32;
function make(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h); const c = tex.getContext(); c.imageSmoothingEnabled = false;
  draw(c); tex.refresh();
}
const rect = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
function disc(c, col, cx, cy, rad) { c.fillStyle = col; for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad) c.fillRect(cx + x, cy + y, 1, 1); }

export function createTerrainTextures(scene) {
  const rng = mulberry32(1234);
  const speckle = (c, cols, n) => { for (let i = 0; i < n; i++) rect(c, cols[(rng() * cols.length) | 0], (rng() * 32) | 0, (rng() * 32) | 0, 1, 1); };
  for (let v = 0; v < 4; v++) make(scene, 'grass_' + v, TS, TS, (c) => {
    rect(c, '#4f9a3c', 0, 0, TS, TS); speckle(c, ['#5aa845', '#438a33', '#58a642'], 44);
    for (let k = 0; k < 2; k++) { const x = 3 + ((rng() * 26) | 0), y = 3 + ((rng() * 26) | 0); rect(c, '#6bbd52', x, y, 1, 3); rect(c, '#6bbd52', x + 2, y + 1, 1, 2); }
  });
  for (let v = 0; v < 2; v++) make(scene, 'dirt_' + v, TS, TS, (c) => {
    rect(c, '#8a6a43', 0, 0, TS, TS); speckle(c, ['#9b7a50', '#765a38', '#a08358'], 50);
    for (let k = 0; k < 3; k++) rect(c, '#6b5233', (rng() * 28) | 0, (rng() * 28) | 0, 2, 1);
  });
  for (let v = 0; v < 2; v++) make(scene, 'water_' + v, TS, TS, (c) => {
    rect(c, '#2f7fc1', 0, 0, TS, TS); speckle(c, ['#2a72b0', '#3a8bd0'], 30);
    for (let k = 0; k < 4; k++) rect(c, '#6bb4e8', (rng() * 24) | 0, 3 + k * 8 + v * 2, 6, 1);
  });
  make(scene, 'foam_n', TS, 3, (c) => rect(c, 'rgba(207,233,245,.85)', 0, 0, TS, 2));
  make(scene, 'foam_s', TS, 3, (c) => rect(c, 'rgba(207,233,245,.85)', 0, 1, TS, 2));
  make(scene, 'foam_w', 3, TS, (c) => rect(c, 'rgba(207,233,245,.85)', 0, 0, 2, TS));
  make(scene, 'foam_e', 3, TS, (c) => rect(c, 'rgba(207,233,245,.85)', 1, 0, 2, TS));
  // Vật thể: gốc (neo) ở đáy-giữa, cao hơn 1 ô để thấy mặt trước + phần trên (góc nhìn 3/4)
  for (let v = 0; v < 2; v++) make(scene, 'tree_' + v, 32, 48, (c) => {
    rect(c, 'rgba(0,0,0,.28)', 7, 42, 19, 5);
    rect(c, '#6b4423', 13, 30, 6, 15); rect(c, '#4a2f17', 17, 30, 2, 15);
    disc(c, v ? '#245f2b' : '#2a6e2f', 16, 23, 12 - v);
    disc(c, v ? '#2f8a39' : '#359a3c', 12, 20, 8); disc(c, v ? '#2f8a39' : '#359a3c', 21, 22, 8);
    disc(c, '#4cb84f', 12, 15, 4); rect(c, '#7bd36e', 10, 13, 3, 2); rect(c, '#2a6e2f', 14, 31, 4, 2);
  });
  for (let v = 0; v < 2; v++) make(scene, 'rock_' + v, 32, 28, (c) => {
    rect(c, 'rgba(0,0,0,.28)', 4, 23, 25, 4);
    disc(c, '#6f767d', 16, 15, 10 - v); rect(c, '#5a6066', 6 + v, 16, 20 - 2 * v, 9);
    disc(c, '#a7aeb5', 13, 10, 6); rect(c, '#c7cdd2', 10, 7, 4, 2); rect(c, '#454b50', 8, 24, 16, 1);
  });
  for (let v = 0; v < 2; v++) make(scene, 'bush_' + v, 32, 18, (c) => {
    rect(c, 'rgba(0,0,0,.25)', 5, 14, 22, 3);
    disc(c, '#3f8f39', 10, 11, 6); disc(c, '#3f8f39', 21, 11, 7); disc(c, '#4aa143', 15, 8, 6);
    disc(c, '#62b84f', 13, 6, 3); rect(c, '#d9423a', 8 + v * 8, 10, 2, 2); rect(c, '#d9423a', 20 - v * 3, 8, 2, 2);
  });
}

const vh = (x, y) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
export function bakeGround(scene, map) {
  const CH = 16, { width: W, height: H, tiles } = map;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.RIVER : tiles[y * W + x]);
  for (let cy = 0; cy * CH < H; cy++) for (let cx = 0; cx * CH < W; cx++) {
    const rt = scene.add.renderTexture(cx * CH * TS, cy * CH * TS, CH * TS, CH * TS).setOrigin(0).setDepth(0);
    rt.beginDraw();
    for (let y = cy * CH; y < Math.min(H, (cy + 1) * CH); y++) for (let x = cx * CH; x < Math.min(W, (cx + 1) * CH); x++) {
      const t = tiles[y * W + x], h = vh(x, y), px = (x - cx * CH) * TS, py = (y - cy * CH) * TS;
      rt.batchDraw(t === T.RIVER ? 'water_' + (h % 2) : t === T.DIRT ? 'dirt_' + (h % 2) : 'grass_' + (h % 4), px, py);
      if (t === T.RIVER) {
        if (at(x, y - 1) !== T.RIVER) rt.batchDraw('foam_n', px, py);
        if (at(x, y + 1) !== T.RIVER) rt.batchDraw('foam_s', px, py + TS - 3);
        if (at(x - 1, y) !== T.RIVER) rt.batchDraw('foam_w', px, py);
        if (at(x + 1, y) !== T.RIVER) rt.batchDraw('foam_e', px + TS - 3, py);
      }
    }
    rt.endDraw();
  }
}
// Y-sorting: depth = y đáy của vật thể (tính theo pixel). Người chơi/quái vật dùng cùng quy ước.
export function spawnObjects(scene, map) {
  const { width: W, height: H, tiles } = map;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = tiles[y * W + x]; const name = t === T.TREE ? 'tree_' : t === T.ROCK ? 'rock_' : t === T.BUSH ? 'bush_' : null;
    if (!name) continue;
    const by = y * TS + 30;
    scene.add.image(x * TS + 16, by, name + (vh(x, y) % 2)).setOrigin(0.5, 1).setDepth(by);
  }
}
