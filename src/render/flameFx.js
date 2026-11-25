// LỬA ĐUỐC chuyển động: 6 khung vẽ bằng canvas (ngọn lửa hình giọt nước, lắc lư + lưỡi lửa phụ), hai bảng màu: cam (đuốc thường) và xanh (đuốc LV15).
// Khung có phần gốc rộng - đỉnh nhọn, vẽ gradient 3 lớp (viền - thân - lõi sáng) nên hòa với ngọn lửa gốc trong Tower.png thay vì đè lên.
import { make } from './textures.js';
const W = 20, H = 30, N = 6;
const PAL = { o: ['rgba(255,90,20,0)', 'rgba(255,120,30,.85)', 'rgba(255,196,70,.95)', 'rgba(255,248,200,1)'], b: ['rgba(40,90,255,0)', 'rgba(70,140,255,.85)', 'rgba(130,200,255,.95)', 'rgba(235,250,255,1)'] };
function tongue(c, cx, base, h, w, sway, p) {
  const g = c.createLinearGradient(0, base, 0, base - h); g.addColorStop(0, p[1]); g.addColorStop(0.55, p[2]); g.addColorStop(1, p[0]); c.fillStyle = g;
  c.beginPath(); c.moveTo(cx - w, base); c.bezierCurveTo(cx - w * 1.1, base - h * 0.45, cx + sway * 0.5 - w * 0.3, base - h * 0.7, cx + sway, base - h);
  c.bezierCurveTo(cx + sway * 0.5 + w * 0.3, base - h * 0.65, cx + w * 1.1, base - h * 0.4, cx + w, base); c.closePath(); c.fill();
}
export function createFlameTextures(scene) {
  for (const [id, p] of Object.entries(PAL)) for (let i = 0; i < N; i++) make(scene, `flame_${id}_${i}`, W, H, (c) => {
    c.imageSmoothingEnabled = true; const a = (i / N) * Math.PI * 2, sw = Math.sin(a) * 2.2, base = H - 2, cx = W / 2;
    tongue(c, cx, base, 22 + Math.sin(a * 2) * 2.5, 6.2, sw, p);                              // thân chính
    tongue(c, cx - 3.2, base, 12 + Math.cos(a + 1) * 2.5, 3.4, -sw * 0.9 - 1, p);              // lưỡi phụ trái
    tongue(c, cx + 3.2, base, 13 + Math.sin(a + 2) * 2.5, 3.4, sw * 0.8 + 1, p);               // lưỡi phụ phải
    const g = c.createRadialGradient(cx, base - 5, 0, cx, base - 5, 7); g.addColorStop(0, p[3]); g.addColorStop(1, p[0]); c.fillStyle = g; c.beginPath(); c.ellipse(cx, base - 5, 4, 7, 0, 0, 6.2832); c.fill(); // lõi sáng
  });
  for (const id of Object.keys(PAL)) if (!scene.anims.exists('flame_' + id)) scene.anims.create({ key: 'flame_' + id, frames: Array.from({ length: N }, (_, i) => ({ key: `flame_${id}_${i}` })), frameRate: 11, repeat: -1 });
}
export const FLAME_SIZE = [W, H];
