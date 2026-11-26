// NHÂN VẬT CHÍNH: sprite sheet thật từ Main.png (đã tách nền, 12 khung: 3 khung bước x 4 hướng) -> public/assets/player/main_sheet.png (tools/build_new_assets.py).
// Hàng: 0 = xuống, 1 = trái, 2 = phải, 3 = lên. Mỗi hướng 3 khung: [0] bước chân A, [1] đứng yên, [2] bước chân B.
// Chu kỳ chạy: đứng-A-đứng-B (1,0,1,2) nên không giật; mọi khung trong một hàng đã được căn CHUNG một điểm đặt chân (không trôi/nhấp nháy khi đổi khung).
// Màu áo người chơi (cũng là màu trên minimap) = màu KHĂN QUÀNG (các điểm ảnh đỏ được đổi tông, giữ nguyên độ sáng/viền) -> mỗi màu một texture, tạo 1 lần.
import { PLAYER_DISPLAY } from '../config/art.js';
export const DIRS = ['down', 'left', 'right', 'up'];
export const FARMER_ANIMS = { idle: { rate: 3 }, walk: { rate: 8 }, run: { rate: 10 } };
const RUN = [1, 0, 1, 2];
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function rgb2hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, mx ? d / mx : 0, mx]; }
function hsv2rgb(h, s, v) { const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5) * 255, f(3) * 255, f(1) * 255]; }
// Đổi tông các điểm ảnh đỏ bão hòa (khăn quàng) sang màu người chơi. Da, tóc, nâu da thuộc, vàng mũ nằm ngoài dải này nên giữ nguyên.
export function recolorScarf(data, shirt) {
  const [th, ts, tv] = rgb2hsv(...hex(shirt)), sk = Math.min(1.15, Math.max(0.55, ts / 0.72));
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue; const [h, s, v] = rgb2hsv(data[i], data[i + 1], data[i + 2]);
    if ((h <= 13 || h >= 345) && s > 0.55 && v > 0.42) { const o = hsv2rgb(th, Math.min(1, s * sk), Math.min(1, v * (0.55 + 0.6 * tv))); data[i] = o[0]; data[i + 1] = o[1]; data[i + 2] = o[2]; }
  }
}
// Tạo texture + animation cho một màu áo. Trả về key; animation key: `${key}:${idle|walk|run}_${hướng}`; khung: `${hướng}_${0..2}`
export function ensureFarmer(scene, shirt) {
  const key = 'farmer_' + shirt.slice(1); if (scene.textures.exists(key)) return key;
  const hasHair = scene.textures.exists('main_base') && scene.textures.exists('main_hair'), src = scene.textures.get(hasHair ? 'main_base' : 'main_sheet').getSourceImage(), [CW, CH] = PLAYER_DISPLAY.cell;
  const tex = scene.textures.createCanvas(key, src.width, src.height), c = tex.getContext(); c.drawImage(src, 0, 0);
  const img = c.getImageData(0, 0, src.width, src.height); recolorScarf(img.data, shirt); c.putImageData(img, 0, 0); tex.refresh();
  tex.setFilter(0); // 0 = Phaser FilterMode.LINEAR: hình hạ mẫu từ ảnh gốc, lọc tuyến tính cho mượt (không răng cưa khi thu nhỏ)
  DIRS.forEach((d, r) => { for (let i = 0; i < 3; i++) tex.add(`${d}_${i}`, 0, i * CW, r * CH, CW, CH); });
  if (hasHair) { const ht = scene.textures.get('main_hair'); ht.setFilter(0); DIRS.forEach((d, r) => { for (let i = 0; i < 3; i++) if (!ht.has(`${d}_${i}`)) ht.add(`${d}_${i}`, 0, i * CW, r * CH, CW, CH); }); }
  const A = (k, frames, rate) => scene.anims.create({ key: `${key}:${k}`, frames: frames.map((i) => ({ key, frame: i })), frameRate: rate, repeat: -1 });
  for (const d of DIRS) { A(`idle_${d}`, [`${d}_1`], 1); A(`walk_${d}`, RUN.map((i) => `${d}_${i}`), FARMER_ANIMS.walk.rate); A(`run_${d}`, RUN.map((i) => `${d}_${i}`), FARMER_ANIMS.run.rate); }
  return key;
}
export const FARMER_ORIGIN_Y = PLAYER_DISPLAY.originY;
// ---- TÓC: lớp phủ riêng (main_hair.png, tách bằng tools/build_hair_assets.py) vẽ chồng lên thân; xoay quanh tâm đầu + lệch ngang nhẹ => tóc lay mà không đổi nét vẽ gốc.
// Hàng 'lên' (nhìn từ sau) không có lớp tóc. Nếu chưa có main_hair thì lớp này tự ẩn (game vẫn chạy với sprite gốc).
export const HAIR = { pivotY: 46, amp: 0.1, offset: 1.6, k: 70, c: 9.5, wind: 0.34, windIdle: 0.2, trail: 0.9 };  // pivotY: px trong ô 136; amp: rad tối đa; offset: px nguồn; k,c: lò xo/giảm chấn
export class FarmerHair {
  constructor(scene, depthOffset = 0.2) { this.ok = scene.textures.exists('main_hair'); this.depthOffset = depthOffset; this.img = this.ok ? scene.add.image(0, 0, 'main_hair', 'down_1').setOrigin(0.5, HAIR.pivotY / PLAYER_DISPLAY.cell[1]) : null; this.hx = 0; this.hv = 0; }
  // Lò xo giảm chấn theo vận tốc (đơn vị ô/giây, vx,vy): tóc lệch NGƯỢC hướng chạy rồi dao động tắt dần khi dừng (quán tính) + gió nhẹ.
  step(dt, vx, vy, t, moving) {
    if (!this.ok || dt <= 0) return; const sub = Math.min(dt, 0.033), n = Math.max(1, Math.ceil(dt / sub)), h = dt / n;
    const tgt = Math.max(-1, Math.min(1, -vx * HAIR.trail / 5)) + Math.sin(t * 1.7 + 0.8) * (moving ? HAIR.wind * 0.35 : HAIR.windIdle) + Math.sin(t * 0.63) * 0.05;
    for (let i = 0; i < n; i++) { this.hv += (HAIR.k * (tgt - this.hx) - HAIR.c * this.hv) * h; this.hx += this.hv * h; }
    this.hx = Math.max(-1.6, Math.min(1.6, this.hx));
  }
  sync(sprite, alpha = 1) { // sprite: thân; khớp khung, vị trí, màu nhấp nháy/đổi màu; xoay quanh tâm đầu
    const im = this.img; if (!im) return; const f = sprite.frame?.name || 'down_1', has = !f.startsWith('up_');
    im.setVisible(sprite.visible && has); if (!has) return; const cellH = PLAYER_DISPLAY.cell[1], sy = sprite.scaleY, sx = sprite.scaleX;
    im.setFrame(f).setScale(sx, sy).setPosition(sprite.x + this.hx * HAIR.offset * sx, sprite.y - (FARMER_ORIGIN_Y * cellH - HAIR.pivotY) * sy).setRotation(-this.hx * HAIR.amp + sprite.rotation).setDepth(sprite.depth + this.depthOffset).setAlpha(alpha * sprite.alpha).setFlipX(sprite.flipX);
    if (sprite.isTinted) { if (sprite.tintFill) im.setTintFill(sprite.tintTopLeft); else im.setTint(sprite.tintTopLeft); } else im.clearTint();
  }
  destroy() { this.img?.destroy(); }
}
// Hướng nhìn từ vector chuyển động; `cur` giữ nguyên khi hai trục gần bằng nhau (chống đổi hướng qua lại khi đi chéo)
export function dirFrom(vx, vy, cur = 'down') {
  const ax = Math.abs(vx), ay = Math.abs(vy); if (ax < 1e-3 && ay < 1e-3) return cur;
  const horiz = cur === 'left' || cur === 'right', favourH = horiz ? ax * 1.2 >= ay : ax > ay * 1.2;
  return favourH ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
}
