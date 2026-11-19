import { SLIME_TYPES } from '../config/slimes.js';
const FW = 32, FH = 32, BASE = 30;
const PAL = {
  green:  { b: '#5fcf5a', l: '#9cf08f', d: '#3a9a3a' },
  blue:   { b: '#4aa3f0', l: '#92d0ff', d: '#2b6fb8' },
  purple: { b: '#a566e0', l: '#d3a5ff', d: '#6e3fa8' },
  red:    { b: '#e0463e', l: '#ff8f85', d: '#9c2420' },
  gold:   { b: '#f2c230', l: '#fff08a', d: '#b8860b' },
};
const POSES = {
  idle: [{ rx: 11, ry: 9, lift: 0 }, { rx: 12, ry: 8, lift: 0 }],
  move: [{ rx: 12, ry: 7, lift: 0 }, { rx: 9, ry: 12, lift: 0 }, { rx: 8, ry: 12, lift: 6 }, { rx: 11, ry: 8, lift: 1 }],
  die:  [{ rx: 13, ry: 5, lift: 0, f: 0 }, { rx: 14, ry: 3, lift: 0, f: 1 }, { rx: 15, ry: 2, lift: 0, f: 2 }],
};
const RATES = { idle: [3, -1], move: [8, -1], die: [8, 0] };
const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
function ell(c, col, cx, cy, rx, ry) { c.fillStyle = col; for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) c.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1); }
function draw(c, ox, type, p) {
  const P = PAL[type], cx = ox + 16, cy = BASE - p.ry - p.lift;
  c.globalAlpha = p.f === undefined ? 1 : [0.9, 0.7, 0.45][p.f];
  R(c, 'rgba(0,0,0,.3)', cx - p.rx, BASE - 1, p.rx * 2, 3);
  ell(c, P.d, cx, cy + 1, p.rx, p.ry); ell(c, P.b, cx, cy, p.rx - 1, p.ry - 1);
  if (p.ry > 4) { ell(c, P.l, cx - p.rx / 3, cy - p.ry / 2, Math.max(1, p.rx / 4), Math.max(1, p.ry / 5)); }
  if (p.f === undefined || p.f === 0) {
    const ey = cy - Math.floor(p.ry / 4);
    R(c, '#fff', cx - 5, ey - 2, 4, 5); R(c, '#fff', cx + 2, ey - 2, 4, 5); R(c, '#1a1a1a', cx - 4, ey - 1, 2, 3); R(c, '#1a1a1a', cx + 3, ey - 1, 2, 3);
    R(c, '#1a1a1a', cx - 1, ey + 5, 3, 1);
    if (type === 'red') { R(c, '#1a1a1a', cx - 6, ey - 4, 5, 1); R(c, '#1a1a1a', cx + 2, ey - 4, 5, 1); }
  }
  const top = cy - p.ry;
  if (type === 'purple') { R(c, P.d, cx - 7, top - 3, 2, 4); R(c, P.d, cx + 6, top - 3, 2, 4); R(c, P.l, cx - 7, top - 4, 1, 1); R(c, P.l, cx + 7, top - 4, 1, 1); }
  if (type === 'red') for (const dx of [-6, -2, 2, 6]) { R(c, P.d, cx + dx, top - 3, 2, 4); R(c, '#ffb3ad', cx + dx, top - 3, 1, 1); }
  if (type === 'blue') { R(c, '#cfeaff', cx - 1, top - 2, 3, 3); R(c, '#fff', cx, top - 3, 1, 1); } // giọt nước trên đầu
  if (type === 'gold') { R(c, '#fff3a0', cx - 5, top - 3, 10, 3); R(c, '#e0a800', cx - 5, top, 10, 1); for (const dx of [-5, -1, 3]) R(c, '#fff3a0', cx + dx, top - 5, 2, 2); R(c, '#fff', cx + 9, top + 2, 1, 1); R(c, '#fff', cx - 10, top + 6, 1, 1); }
  c.globalAlpha = 1;
}
// Mỗi loại 1 texture; animation key: `slime_<loại>:idle|move|die`
export function ensureSlimes(scene) {
  for (const type of SLIME_TYPES) {
    const key = 'slime_' + type; if (scene.textures.exists(key)) continue;
    const all = Object.entries(POSES).flatMap(([a, l]) => l.map((p, i) => ({ a, i, p })));
    const tex = scene.textures.createCanvas(key, FW * all.length, FH), c = tex.getContext(); c.imageSmoothingEnabled = false;
    all.forEach(({ a, i, p }, n) => { draw(c, n * FW, type, p); tex.add(`${a}_${i}`, 0, n * FW, 0, FW, FH); });
    tex.refresh();
    for (const [a, l] of Object.entries(POSES)) scene.anims.create({ key: `${key}:${a}`, frames: l.map((_, i) => ({ key, frame: `${a}_${i}` })), frameRate: RATES[a][0], repeat: RATES[a][1] });
  }
}
export const SLIME_ORIGIN_Y = (BASE + 1) / FH;
