// Bố cục RIÊNG cho từng chủ đề: mỗi hàm dựng cấu trúc địa hình lớn khác nhau (không chỉ đổi tên).
import { addRiver, addLake, addCoast, addPlateau, addIsland, rr } from './stages.js';
const away = (c, min, max) => { for (let t = 0; t < 40; t++) { const x = rr(c, 8, c.W - 8), y = rr(c, 8, c.H - 8), d = Math.sqrt((x - c.start.x) ** 2 + (y - c.start.y) ** 2); if (d >= min * c.u && d <= max * c.u) return [x, y]; } return [c.W * 0.25, c.H * 0.25]; };
const pick = (c, a) => a[Math.floor(c.rng() * a.length)];
// một đường sông xuyên bản đồ, không đi qua trung tâm; hướng ngang/dọc ngẫu nhiên, hai đầu lệch nhau
function crossingRiver(c, width, meander, off = 20) {
  const horiz = c.rng() < 0.5, side = c.rng() < 0.5 ? -1 : 1, o = side * rr(c, off * 0.8, off * 1.3) * c.u, j = rr(c, -12, 12) * c.u, m = (c.W >> 1);
  const a = horiz ? [0, m + o - j] : [m + o - j, 0], b = horiz ? [c.W - 1, m + o + j] : [m + o + j, c.H - 1];
  return { line: addRiver(c, { a, b, width, meander }), horiz, side, o };
}
export const LAYOUTS = {
  MEADOW(c) { // đồng cỏ: gần như không nước, 0–1 ao nhỏ, 0–2 gò thấp
    if (c.rng() < 0.6) { const [x, y] = away(c, 22, 42); addLake(c, { x, y, r: rr(c, 4, 6), aspect: 0.75 }); }
    const n = Math.round(rr(c, 0, 2.4)); for (let k = 0; k < n; k++) { const [x, y] = away(c, 22, 40); addPlateau(c, { x, y, rx: rr(c, 8, 13), ry: rr(c, 4, 6) }); }
  },
  RIVER(c) { // thung lũng: sông chính + nhánh phụ + vách dọc theo một bờ
    const r = crossingRiver(c, 5.2, 0.6); c.river = r;
    if (c.rng() < 0.65) { const p = r.line[Math.floor(r.line.length * rr(c, 0.3, 0.7))], dx = r.horiz ? 0 : -r.side, dy = r.horiz ? -r.side : 0, d = rr(c, 20, 28) * c.u; addLake(c, { x: p[0] + dx * d + rr(c, -6, 6), y: p[1] + dy * d + rr(c, -6, 6), r: 2.8, aspect: 0.8 }); const q = c.meta.lakes.at(-1); addRiver(c, { a: [q.x, q.y], b: [p[0], p[1]], width: 2.8, meander: 0.5, kind: 'tributary' }); }
    const n = 1 + Math.floor(c.rng() * 2); for (let k = 0; k < n; k++) { const t = rr(c, 0.2, 0.8), p = r.line[Math.floor(r.line.length * t)], d = (r.side * -1) * rr(c, 16, 24) * c.u; addPlateau(c, { x: r.horiz ? p[0] : p[0] + d, y: r.horiz ? p[1] + d : p[1], rx: rr(c, 12, 18), ry: rr(c, 5, 7) }); }
  },
  HIGHLAND(c) { // cao nguyên: các bậc thềm xen kẽ so le, ao nhỏ
    const rows = 5 + Math.floor(c.rng() * 2);
    for (let k = 0; k < rows; k++) { const y = (12 + (76 * (k + 0.5)) / rows + rr(c, -3, 3)) * c.u, n = 2 + Math.floor(c.rng() * 2); for (let q = 0; q < n; q++) addPlateau(c, { x: rr(c, 10, 90) * c.u, y, rx: rr(c, 13, 24), ry: rr(c, 5, 8), irr: 0.6 }); }
    if (c.rng() < 0.5) { const [x, y] = away(c, 24, 40); addLake(c, { x, y, r: rr(c, 5, 8) }); }
  },
  LAKE(c) { // hồ lớn lệch tâm; vách phía bắc hồ; có đường vòng quanh hồ
    const ang = pick(c, [[1, 0.5], [-1, 0.5], [1, -0.5], [-1, -0.5], [0.4, 1], [-0.4, -1]]), d = rr(c, 16, 24) * c.u, x = c.start.x + ang[0] * d, y = c.start.y + ang[1] * d, r = rr(c, 17, 22);
    addLake(c, { x, y, r, aspect: rr(c, 0.6, 0.78), irr: 0.6 }); const L = c.meta.lakes[0]; c.loop = { x: L.x, y: L.y, r: L.r };
    const n = 1 + Math.floor(c.rng() * 2); for (let k = 0; k < n; k++) addPlateau(c, { x: L.x + rr(c, -L.r * 0.8, L.r * 0.8), y: L.y - L.r * 0.9 - 5 * c.S.width, rx: rr(c, 9, 14), ry: rr(c, 4, 5.5) });
    if (c.rng() < 0.5) { const [px, py] = away(c, 30, 44); addLake(c, { x: px, y: py, r: rr(c, 3.5, 5.5) }); }
  },
  FALLS(c) { // đảo: vòng nước lớn quanh đảo trung tâm; các đảo đá nhỏ có vách phía nam; cầu đá (bến) nối ra cổng
    const w = rr(c, 31, 35); addLake(c, { x: c.start.x + rr(c, -3, 3) * c.u, y: c.start.y + rr(c, -3, 3) * c.u, r: w, aspect: rr(c, 0.82, 0.95), irr: 0.4 });
    addIsland(c, { x: c.start.x, y: c.start.y, rx: rr(c, 11, 14), ry: rr(c, 8, 10) });
    const L = c.meta.lakes[0], n = 6 + Math.floor(c.rng() * 3); for (let k = 0; k < n; k++) { const a = (k + c.rng() * 0.7) / n, ca = [1, 0.7, 0, -0.7, -1, -0.7, 0, 0.7], sa = [0, 0.7, 1, 0.7, 0, -0.7, -1, -0.7], q = Math.floor(a * 8) % 8, d = L.r * rr(c, 0.45, 0.8); addIsland(c, { x: L.x + ca[q] * d + rr(c, -3, 3), y: L.y + sa[q] * d * 0.85 + rr(c, -3, 3), rx: rr(c, 6, 9.5), ry: rr(c, 4, 6.5) }); }
    c.fallsBoost = 0.7;
  },
  COAST(c) { // biển phía một (hoặc hai) cạnh, bờ uốn lượn, cửa sông nhỏ đổ ra biển
    const s = Math.floor(c.rng() * 4); addCoast(c, s, rr(c, 17, 24), 0.4); c.seaSide = s;
    if (c.rng() < 0.4) addCoast(c, pick(c, s < 2 ? [2, 3] : [0, 1]), rr(c, 7, 12), 0.5);
    if (c.rng() < 0.6) { const sx = s < 2 ? rr(c, 25, 75) * c.u : (s === 2 ? 4 : c.W - 5), sy = s < 2 ? (s === 0 ? 8 : c.H - 9) : rr(c, 25, 75) * c.u, ix = s < 2 ? sx + rr(c, -16, 16) * c.u : (s === 2 ? rr(c, 40, 58) : rr(c, 42, 60)) * c.u, iy = s < 2 ? (s === 0 ? rr(c, 38, 55) : rr(c, 45, 62)) * c.u : sy + rr(c, -16, 16) * c.u; addRiver(c, { a: [ix, iy], b: [sx, sy], width: 3.2, meander: 0.5, kind: 'stream' }); }
    const [x, y] = away(c, 26, 42); addPlateau(c, { x, y, rx: rr(c, 9, 14), ry: rr(c, 4, 6) });
  },
  WILD(c) { // tổ hợp ngẫu nhiên, bất đối xứng
    if (c.rng() < 0.65) crossingRiver(c, rr(c, 3, 4.2), 0.7, 26); else { const [x, y] = away(c, 22, 40); addLake(c, { x, y, r: rr(c, 7, 11), aspect: 0.65 }); }
    if (c.rng() < 0.5) { const [x, y] = away(c, 24, 44); addLake(c, { x, y, r: rr(c, 4, 6) }); }
    const n = 1 + Math.floor(c.rng() * 3); for (let k = 0; k < n; k++) { const [x, y] = away(c, 18, 44); addPlateau(c, { x, y, rx: rr(c, 8, 16), ry: rr(c, 4, 7), irr: 0.6 }); }
  },
};
