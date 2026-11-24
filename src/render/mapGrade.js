// Chỉnh màu CẢNH QUAN (độ sáng / tương phản / bão hòa) ở mức pixel — không dùng CSS filter hay shader để giữ pixel art nguyên vẹn.
// Áp dụng cho nền (Composer) và texture cây/đá/bụi/cỏ; KHÔNG áp cho UI, chữ, icon, nhân vật, quái, tháp, hiệu ứng.
import { VISUAL } from '../config/visual.js';
export const GRADE_DEFAULT = Object.freeze({ brightness: VISUAL.grade.brightness.def, contrast: VISUAL.grade.contrast.def, saturation: VISUAL.grade.saturation.def });
export const isIdentity = (g) => !g || (Math.abs(g.brightness) < 1e-3 && Math.abs(g.contrast - 1) < 1e-3 && Math.abs(g.saturation - 1) < 1e-3);
export const clampGrade = (g) => { const V = VISUAL.grade, c = (v, r) => Math.max(r.min, Math.min(r.max, Number.isFinite(+v) ? +v : r.def)); return { brightness: c(g?.brightness, V.brightness), contrast: c(g?.contrast, V.contrast), saturation: c(g?.saturation, V.saturation) }; };
// Biến đổi tại chỗ một buffer RGBA 8-bit. Alpha giữ nguyên. Thứ tự: bão hòa → tương phản → độ sáng.
export function gradeBuffer(d, g) {
  if (isIdentity(g)) return d; const b = g.brightness * 255, c = g.contrast, s = g.saturation;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] === 0) continue; let r = d[i], gg = d[i + 1], bl = d[i + 2]; const l = 0.299 * r + 0.587 * gg + 0.114 * bl;
    r = l + (r - l) * s; gg = l + (gg - l) * s; bl = l + (bl - l) * s; d[i] = (r - 128) * c + 128 + b; d[i + 1] = (gg - 128) * c + 128 + b; d[i + 2] = (bl - 128) * c + 128 + b; }
  return d;
}
// Quản lý bản texture đã chỉnh màu của Phaser: key gốc -> 'g:'+key (canvas). Gọi update khi đổi cài đặt; gỡ về texture gốc khi về mặc định.
export class TextureGrader {
  constructor(scene) { this.scene = scene; this.made = new Set(); }
  keyOf(id, g) { return isIdentity(g) ? id : 'g:' + id; }
  update(ids, g) {
    if (isIdentity(g)) { for (const k of this.made) this.scene.textures.remove(k); this.made.clear(); return; }
    for (const id of ids) { const key = 'g:' + id; if (this.made.has(key)) this.scene.textures.remove(key); const src = this.scene.textures.get(id).getSourceImage(), cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
      const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(src, 0, 0); const im = ctx.getImageData(0, 0, cv.width, cv.height); gradeBuffer(im.data, g); ctx.putImageData(im, 0, 0); this.scene.textures.addCanvas(key, cv).setFilter(this.scene.textures.get(id).source[0].scaleMode); this.made.add(key); }
  }
}
