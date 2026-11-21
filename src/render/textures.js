// Tiện ích vẽ texture bằng canvas (dùng cho sprite pixel art vẽ bằng code: nông dân, slime, hiệu ứng).
export function make(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h); const c = tex.getContext(); c.imageSmoothingEnabled = false;
  draw(c); tex.refresh();
}
export const rect = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
export function disc(c, col, cx, cy, rad) { c.fillStyle = col; for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad) c.fillRect(cx + x, cy + y, 1, 1); }
