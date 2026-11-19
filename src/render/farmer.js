// Nông dân cầm búa: pixel art vẽ bằng code. 6 animation: idle, walk, run, build, hurt, die. Màu áo tùy chỉnh.
const FW = 32, FH = 44;
const POSES = {
  idle: [{ bob: 0 }, { bob: 1 }],
  walk: [{ liftL: 0, liftR: 2, bob: 0 }, { liftL: 1, liftR: 1, bob: 1 }, { liftL: 2, liftR: 0, bob: 0 }, { liftL: 1, liftR: 1, bob: 1 }],
  run: [{ liftL: 0, liftR: 3, bob: 0, lean: 1 }, { liftL: 2, liftR: 2, bob: 2, lean: 1 }, { liftL: 3, liftR: 0, bob: 0, lean: 1 }, { liftL: 2, liftR: 2, bob: 2, lean: 1 }],
  build: [{ hammer: 0 }, { hammer: 1 }, { hammer: 2 }],
  hurt: [{ hurt: true }],
  die: [{ dead: 1 }, { dead: 2 }, { dead: 3 }],
};
export const FARMER_ANIMS = {
  idle: { rate: 3, repeat: -1 }, walk: { rate: 8, repeat: -1 }, run: { rate: 12, repeat: -1 },
  build: { rate: 7, repeat: -1 }, hurt: { rate: 6, repeat: 0 }, die: { rate: 5, repeat: 0 },
};
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const m = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + f)))); return `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`; };
const R = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

function draw(c, ox, oy, p, shirt) {
  const K = { skin: '#f2c79b', pants: '#5b4636', boot: '#2d2118', hat: '#e3b94f', hatD: '#b88a2a', hw: '#7a5230', hh: '#9aa3ad', belt: '#3b2a1c' };
  const cx = ox + 16, base = oy + 42, sd = shade(shirt, -0.25);
  if (p.dead) {
    const y = base - (p.dead === 1 ? 14 : 9);
    R(c, 'rgba(0,0,0,.3)', cx - 15, base - 3, 30, 4);
    R(c, K.pants, cx - 15, y + 2, 9, 5); R(c, K.boot, cx - 17, y + 2, 3, 5);
    R(c, shirt, cx - 6, y - 1, 12, 9); R(c, sd, cx - 6, y + 6, 12, 2);
    R(c, K.skin, cx + 6, y, 8, 7); R(c, '#222', cx + 11, y + 2, 1, 1);
    if (p.dead < 3) R(c, K.hat, cx + 5, y - 3, 9, 3); else R(c, K.hat, cx + 16, y + 4, 7, 3);
    return;
  }
  const b = p.bob || 0, X = cx + (p.lean || 0), lL = p.liftL || 0, lR = p.liftR || 0;
  R(c, 'rgba(0,0,0,.3)', cx - 8, base - 2, 16, 4);
  R(c, K.pants, cx - 5, base - 10, 4, 8 - lL); R(c, K.boot, cx - 5, base - 2 - lL, 4, 2);
  R(c, K.pants, cx + 1, base - 10, 4, 8 - lR); R(c, K.boot, cx + 1, base - 2 - lR, 4, 2);
  R(c, shirt, X - 6, base - 22 - b, 12, 12); R(c, sd, X - 6, base - 13 - b, 12, 1); R(c, K.belt, X - 6, base - 11 - b, 12, 2);
  R(c, shirt, X - 9, base - 21 - b, 3, 7); R(c, K.skin, X - 9, base - 14 - b, 3, 2);
  const h = p.hammer;
  if (h === 0) { R(c, shirt, X + 6, base - 28 - b, 3, 7); R(c, K.skin, X + 6, base - 30 - b, 3, 2); R(c, K.hw, X + 7, base - 40, 2, 11); R(c, K.hh, X + 4, base - 42, 8, 4); }
  else if (h === 1) { R(c, shirt, X + 6, base - 22 - b, 3, 5); R(c, K.skin, X + 8, base - 19 - b, 2, 2); R(c, K.hw, X + 8, base - 19, 8, 2); R(c, K.hh, X + 15, base - 23, 4, 8); }
  else if (h === 2) { R(c, shirt, X + 6, base - 20 - b, 3, 6); R(c, K.skin, X + 7, base - 14 - b, 3, 2); R(c, K.hw, X + 11, base - 22, 2, 14); R(c, K.hh, X + 9, base - 10, 6, 4); }
  else { R(c, shirt, X + 6, base - 21 - b, 3, 7); R(c, K.skin, X + 6, base - 14 - b, 3, 2); R(c, K.hw, X + 9, base - 16, 2, 10); R(c, K.hh, X + 8, base - 8, 5, 3); }
  R(c, K.skin, X - 4, base - 30 - b, 8, 8); R(c, '#222', X - 2, base - 27 - b, 1, 2); R(c, '#222', X + 1, base - 27 - b, 1, 2);
  R(c, K.hatD, X - 7, base - 31 - b, 14, 2); R(c, K.hat, X - 4, base - 34 - b, 8, 3);
  if (p.hurt) { c.globalCompositeOperation = 'source-atop'; R(c, 'rgba(255,60,60,.55)', ox, oy, FW, FH); c.globalCompositeOperation = 'source-over'; }
}

// Tạo texture + animation cho một màu áo. Trả về key texture; animation key: `${key}:${tên}`
export function ensureFarmer(scene, shirt) {
  const key = 'farmer_' + shirt.slice(1);
  if (scene.textures.exists(key)) return key;
  const all = Object.entries(POSES).flatMap(([anim, list]) => list.map((p, i) => ({ anim, i, p })));
  const tex = scene.textures.createCanvas(key, FW * all.length, FH); const c = tex.getContext(); c.imageSmoothingEnabled = false;
  all.forEach(({ anim, i, p }, n) => { draw(c, n * FW, 0, p, shirt); tex.add(`${anim}_${i}`, 0, n * FW, 0, FW, FH); });
  tex.refresh();
  for (const [anim, list] of Object.entries(POSES))
    scene.anims.create({ key: `${key}:${anim}`, frames: list.map((_, i) => ({ key, frame: `${anim}_${i}` })), frameRate: FARMER_ANIMS[anim].rate, repeat: FARMER_ANIMS[anim].repeat });
  return key;
}
export const FARMER_ORIGIN_Y = 42 / FH;
