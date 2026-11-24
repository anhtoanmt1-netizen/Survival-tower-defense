import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { VISUAL } from '../config/visual.js';
import { Composer } from '../map/terrain/compose.js';
// Vẽ nền MỌI bản đồ: mỗi mảng 8x8 ô được GHÉP bằng Composer rồi đưa vào canvas texture. Chỉ ghép mảng gần camera (1 mảng/khung sau lần đầu), hủy mảng xa.
// Đổi cài đặt màu: các mảng hiện có được ghép lại dần (vài mảng/khung) và thay nội dung tại chỗ -> không nhấp nháy.
const TS = GAME_CONFIG.tileSize, CH = 8, S = 48;
export function phaserStore(scene) { // đọc pixel của texture Phaser đã nạp (cache)
  const cache = new Map(); let cv = null;
  return { get(id) { let v = cache.get(id); if (!v) { const img = scene.textures.get(id).getSourceImage(); cv = cv || document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const c = cv.getContext('2d', { willReadFrequently: true }); c.clearRect(0, 0, img.width, img.height); c.drawImage(img, 0, 0); const d = c.getImageData(0, 0, img.width, img.height); v = { w: img.width, h: img.height, data: d.data }; cache.set(id, v); } return v; } };
}
export class TerrainRenderer {
  constructor(scene, map, grade) { this.scene = scene; this.map = map; this.grade = grade; this.cp = new Composer(phaserStore(scene), map, S); this.chunks = new Map(); this.dirty = new Set(); this.first = true; this.cw = Math.ceil(map.width / CH); this.ch = Math.ceil(map.height / CH); this.uid = Math.random().toString(36).slice(2, 7); }
  paint(c, cx, cy) { const r = this.cp.compose(cx, cy, CH, this.grade); c.tex.getContext().putImageData(new ImageData(r.data, r.w, r.h), 0, 0); c.tex.refresh(); }
  build(cx, cy) {
    const size = CH * S, key = `tchunk_${this.uid}_${cx}_${cy}`, tex = this.scene.textures.createCanvas(key, size, size); tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const c = { tex, key, img: this.scene.add.image(cx * CH * TS, cy * CH * TS, key).setOrigin(0).setScale((CH * TS) / size).setDepth(0) }; this.paint(c, cx, cy); return c;
  }
  setGrade(g) { this.grade = g; for (const k of this.chunks.keys()) this.dirty.add(k); }
  update(cam) {
    const v = cam.worldView, sz = CH * TS, x0 = Math.max(0, Math.floor(v.left / sz) - 1), x1 = Math.min(this.cw - 1, Math.floor(v.right / sz) + 1), y0 = Math.max(0, Math.floor(v.top / sz) - 1), y1 = Math.min(this.ch - 1, Math.floor(v.bottom / sz) + 1);
    let budget = this.first ? 1e9 : 1; this.first = false;
    for (let cy = y0; cy <= y1 && budget > 0; cy++) for (let cx = x0; cx <= x1 && budget > 0; cx++) { const k = cy * this.cw + cx; if (!this.chunks.has(k)) { this.chunks.set(k, this.build(cx, cy)); budget--; } }
    let re = VISUAL.grade.rebakePerFrame; for (const k of this.dirty) { if (re-- <= 0) break; const c = this.chunks.get(k); if (c) this.paint(c, k % this.cw, (k / this.cw) | 0); this.dirty.delete(k); }
    for (const [k, c] of this.chunks) { const cx = k % this.cw, cy = (k / this.cw) | 0; if (cx < x0 - 2 || cx > x1 + 2 || cy < y0 - 2 || cy > y1 + 2) { c.img.destroy(); this.scene.textures.remove(c.key); this.chunks.delete(k); this.dirty.delete(k); } }
  }
  destroy() { for (const c of this.chunks.values()) { c.img.destroy(); this.scene.textures.remove(c.key); } this.chunks.clear(); }
}
