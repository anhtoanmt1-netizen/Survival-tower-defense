// BỘ GHÉP PIXEL: dựng nền từ lớp địa hình logic. Chạy trong trình duyệt (bake từng mảng 8x8 ô) và trong Node (xem trước/kiểm thử).
// Nền = trộn các texture liền mạch theo "bản đồ lớp" bị méo bằng nhiễu → biên cỏ/đất/cát/nước bất quy tắc, mềm, không có đường vuông.
// Sau đó: mảng đất/cát (decor layer 7), vách (layer 6), bọt sóng ven bờ. Phần vật thể lớn (cây/đá/bụi) do renderer/preview vẽ riêng.
import { makeNoise } from '../../core/rng.js';
import { C, F } from './classes.js';
import { cliffSprite } from './autoterrain.js';
import { BY_ID } from './registryIndex.js';
import { gradeBuffer } from '../../render/mapGrade.js';
const FILL = ['fill_grass', 'fill_flower', 'fill_dirt', 'fill_sand', 'fill_shallow', 'fill_deep', 'fill_pave'], NC = 7;
// co ảnh bằng lấy trung bình vùng (có tính alpha) để không răng cưa
export function scaleImage(src, dw, dh) {
  const out = new Uint8ClampedArray(dw * dh * 4), sx = src.w / dw, sy = src.h / dh;
  for (let y = 0; y < dh; y++) { const y0 = y * sy, y1 = Math.min(src.h, (y + 1) * sy); for (let x = 0; x < dw; x++) { const x0 = x * sx, x1 = Math.min(src.w, (x + 1) * sx); let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = Math.floor(y0); yy < Math.ceil(y1); yy++) for (let xx = Math.floor(x0); xx < Math.ceil(x1); xx++) { const w = (Math.min(xx + 1, x1) - Math.max(xx, x0)) * (Math.min(yy + 1, y1) - Math.max(yy, y0)); if (w <= 0) continue; const o = (yy * src.w + xx) * 4, al = src.data[o + 3] * w; r += src.data[o] * al; g += src.data[o + 1] * al; b += src.data[o + 2] * al; a += al; n += w; }
    const o = (y * dw + x) * 4; if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; } out[o + 3] = n ? a / n : 0; } }
  return { w: dw, h: dh, data: out };
}
export function flipH(im) { const o = new Uint8ClampedArray(im.data.length); for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const a = (y * im.w + x) * 4, b = (y * im.w + (im.w - 1 - x)) * 4; o[b] = im.data[a]; o[b + 1] = im.data[a + 1]; o[b + 2] = im.data[a + 2]; o[b + 3] = im.data[a + 3]; } return { w: im.w, h: im.h, data: o }; }
export function blit(dst, dw, dh, im, dx, dy, mul = 1) { // src-over lên nền đục/bán trong suốt
  for (let y = 0; y < im.h; y++) { const py = dy + y; if (py < 0 || py >= dh) continue; for (let x = 0; x < im.w; x++) { const px = dx + x; if (px < 0 || px >= dw) continue; const s = (y * im.w + x) * 4, a = (im.data[s + 3] / 255) * mul; if (a <= 0) continue; const d = (py * dw + px) * 4, ia = 1 - a;
    dst[d] = im.data[s] * a + dst[d] * ia; dst[d + 1] = im.data[s + 1] * a + dst[d + 1] * ia; dst[d + 2] = im.data[s + 2] * a + dst[d + 2] * ia; dst[d + 3] = Math.min(255, a * 255 + dst[d + 3] * ia); } }
}
export class Composer {
  // store.get(id) -> {w,h,data} (RGBA 8-bit); S = số pixel mỗi ô
  // opts.sprites=false: chỉ ghép nền (bản xem trước nhỏ ở menu không cần sprite vách/mảng đất)
  constructor(store, map, S = 48, opts = {}) {
    this.store = store; this.map = map; this.S = S; this.sprites = opts.sprites !== false; this.step = Math.max(1, Math.round(S / 12)); this.cache = new Map(); this.fills = FILL.map((id) => store.get(id)); this.k = 48 / S;
    const seed = map.seed || 1; this.nW1 = makeNoise((seed ^ 0x1234567) >>> 0); this.nW2 = makeNoise((seed ^ 0x7654321) >>> 0); this.nF = makeNoise((seed ^ 0x2468ace) >>> 0);
  }
  sprite(id, w, h, flip) { const key = `${id}|${w}|${h}|${flip ? 1 : 0}`; let s = this.cache.get(key); if (!s) { s = scaleImage(this.store.get(id), w, h); if (flip) s = flipH(s); this.cache.set(key, s); } return s; }
  // Sprite đặt theo vùng "usable" (không tính viền mờ): rộng = wCells ô, đáy căn theo yBottom (px)
  place(buf, bw, bh, id, flip, cxPx, bottomPx, wCells) {
    const a = BY_ID[id], uw = a.usable[2] - a.usable[0], k = (wCells * this.S) / uw, w = Math.max(2, Math.round(a.size[0] * k)), h = Math.max(2, Math.round(a.size[1] * k)), s = this.sprite(id, w, h, flip);
    const ucx = ((a.usable[0] + a.usable[2]) / 2) * k, ub = a.usable[3] * k, ucxF = flip ? w - ucx : ucx;
    blit(buf, bw, bh, s, Math.round(cxPx - ucxF), Math.round(bottomPx - ub));
  }
  compose(cx, cy, CH = 8, grade = null) {
    const { map, S } = this, STEP = this.step, W = map.width, H = map.height, size = CH * S, px0 = cx * size, py0 = cy * size, buf = new Uint8ClampedArray(size * size * 4), n = size / STEP + 3, A = 0.62 * S, cls = map.cls;
    const wgt = new Float32Array(n * n * NC), msk = new Uint8Array(n * n);
    for (let gy = 0; gy < n; gy++) for (let gx = 0; gx < n; gx++) { // lưới mẫu thưa: lớp của từng điểm sau khi méo toạ độ bằng nhiễu
      const wx = px0 + (gx - 1) * STEP, wy = py0 + (gy - 1) * STEP, f = 1 / (S * 0.95), g = 1 / (S * 0.33);
      const ox = (this.nW1(wx * f, wy * f) - 0.5) * 2 * A + (this.nW2(wx * g + 5, wy * g) - 0.5) * 0.55 * S, oy = (this.nW2(wx * f + 9, wy * f + 3) - 0.5) * 2 * A + (this.nW1(wx * g, wy * g + 7) - 0.5) * 0.55 * S;
      const o = gy * n + gx, R = 0.4 * S; let bits = 0; // 5 điểm (giữa + 4 hướng) → trọng số lớp = tỉ lệ điểm thuộc lớp đó: bo tròn góc ô, biên mượt
      for (let t = 0; t < 5; t++) { const tx = t === 1 ? R : t === 2 ? -R : 0, ty = t === 3 ? R : t === 4 ? -R : 0, ix = Math.min(W - 1, Math.max(0, Math.floor((wx + ox + tx) / S))), iy = Math.min(H - 1, Math.max(0, Math.floor((wy + oy + ty) / S))), c = cls[iy * W + ix]; wgt[o * NC + c] += t === 0 ? 0.36 : 0.16; bits |= 1 << c; }
      let sum = 0; for (let c = 0; c < NC; c++) if (bits & (1 << c)) { const w = wgt[o * NC + c]; wgt[o * NC + c] = w * w * (3 - 2 * w); sum += wgt[o * NC + c]; } // làm sắc biên: nước/cát không loang
      for (let c = 0; c < NC; c++) if (bits & (1 << c)) wgt[o * NC + c] /= sum;
      msk[o] = bits;
    }
    const tex = this.fills, tw = 128;
    for (let j = 0; j < size; j++) { const gy = Math.floor(j / STEP), fy = (j - gy * STEP) / STEP; for (let i = 0; i < size; i++) {
      const gx = Math.floor(i / STEP), fx = (i - gx * STEP) / STEP, o00 = gy * n + gx, o10 = o00 + 1, o01 = o00 + n, o11 = o01 + 1, m = msk[o00] | msk[o10] | msk[o01] | msk[o11];
      let r = 0, g = 0, b = 0, ww = 0, wsum = 0; const X = (px0 + i) * this.k, Y = (py0 + j) * this.k;
      for (let c = 0; c < NC; c++) { if (!(m & (1 << c))) continue; const w = (wgt[o00 * NC + c] * (1 - fx) + wgt[o10 * NC + c] * fx) * (1 - fy) + (wgt[o01 * NC + c] * (1 - fx) + wgt[o11 * NC + c] * fx) * fy; if (w < 0.003) continue;
        const t = tex[c], ti = ((((Y + c * 41) | 0) & 127) * tw + (((X + c * 67) | 0) & 127)) * 4; r += t.data[ti] * w; g += t.data[ti + 1] * w; b += t.data[ti + 2] * w; wsum += w; if (c === C.SHALLOW || c === C.DEEP) ww += w; }
      if (wsum > 0) { r /= wsum; g /= wsum; b /= wsum; ww /= wsum; }
      if (ww > 0.12 && ww < 0.88) { const band = 1 - Math.abs(ww - 0.5) / 0.38, br = this.nF((px0 + i) / (S * 0.22), (py0 + j) / (S * 0.22)); if (br > 0.3) { const a = band * band * 0.5 * Math.min(1, (br - 0.3) * 3); r += (240 - r) * a; g += (250 - g) * a; b += (252 - b) * a; } }
      const d = (j * size + i) * 4; buf[d] = r; buf[d + 1] = g; buf[d + 2] = b; buf[d + 3] = 255; } }
    // mảng đất/cát nhỏ (decor layer 7)
    if (this.sprites) for (const dc of map.decor || []) { const x = dc.x * S, y = dc.y * S, ww = dc.s * 1.6; if (x + ww * S < px0 || x - ww * S > px0 + size || y + ww * S < py0 || y - ww * S > py0 + size) continue; this.place(buf, size, size, dc.id, false, x - px0, y - py0 + 0.5 * ww * S * 0.62, ww); }
    // vách (layer 6): duyệt theo hàng để chồng lớp đúng thứ tự
    if (this.sprites) for (let y = Math.max(0, cy * CH - 1); y <= Math.min(H - 1, cy * CH + CH); y++) for (let x = Math.max(0, cx * CH - 1); x <= Math.min(W - 1, cx * CH + CH); x++) if (map.feat[y * W + x] === F.CLIFF) {
      const s = cliffSprite(map, x, y); this.place(buf, size, size, s.id, s.flipX, (x + 0.5) * S - px0, (y + 1) * S + 0.2 * S - py0, 1.75); }
    gradeBuffer(buf, grade); // chỉnh màu cảnh quan (độ sáng/tương phản/bão hòa), bỏ qua nếu mặc định
    return { w: size, h: size, data: buf };
  }
}
