#!/usr/bin/env python3
"""Tách sprite sheet cỏ (tools/src/grass.png, nền hồng #FA05FC, lưới 3x3) thành 9 sprite PNG trong suốt: public/assets/grass/grass_0..8.png.
- Xóa nền bằng khoảng cách màu + làm mềm mép + khử viền hồng (despill), không đụng vào màu hoa (đỏ/tím nằm xa màu nền hơn nhiều).
- Cắt sát vùng alpha, thu về chiều rộng tối đa OUT_W (nét cho zoom 3x của game), ghi tools/grass_meta.json (kích thước, tâm chân) để game đặt đúng gốc cỏ.
Chạy: python3 tools/build_grass_assets.py"""
import json, os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(ROOT, 'src', 'grass.png'); OUT = os.path.join(ROOT, '..', 'public', 'assets', 'grass')
KEY = np.array([250, 5, 252], dtype=np.float32); OUT_W = 192; LO, HI = 55.0, 120.0   # <LO: nền hẳn, >HI: giữ hẳn, giữa: mép mềm
os.makedirs(OUT, exist_ok=True)
im = Image.open(SRC).convert('RGB'); a = np.asarray(im, dtype=np.float32); H, W, _ = a.shape
dist = np.sqrt(((a - KEY) ** 2).sum(axis=2)); alpha = np.clip((dist - LO) / (HI - LO), 0, 1)
rgb = a.copy()
# despill: vùng sát mép (trong 4px quanh nền) bị ngả hồng/tím do trộn với màu nền -> kéo R,B xuống theo G (cỏ/lá xanh có G cao hơn R,B).
# Chỉ áp ở vùng mép nên hoa tím/đỏ nằm trong thân cỏ không bị đổi màu.
bgmask = alpha < 0.15; near = bgmask.copy()
for _ in range(4):
    n = near.copy(); n[1:] |= near[:-1]; n[:-1] |= near[1:]; n[:, 1:] |= near[:, :-1]; n[:, :-1] |= near[:, 1:]; near = n
zone = near & ~bgmask; g = rgb[..., 1]
for c in (0, 2): rgb[..., c] = np.where(zone & (rgb[..., c] > g), g * 0.9, rgb[..., c])
alpha = np.where(zone, np.clip((dist - 70) / (170 - 70), 0, 1), alpha)
rgba = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
meta = []
cw, ch = W // 3, H // 3
for i in range(9):
    r, c = divmod(i, 3); cell = rgba[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]; ys, xs = np.where(cell[..., 3] > 24)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1; crop = Image.fromarray(cell[y0:y1, x0:x1], 'RGBA')
    k = min(1.0, OUT_W / crop.width); crop = crop.resize((max(1, round(crop.width * k)), max(1, round(crop.height * k))), Image.LANCZOS)
    crop.save(os.path.join(OUT, f'grass_{i}.png'), optimize=True)
    meta.append({'id': i, 'w': crop.width, 'h': crop.height, 'file': f'grass/grass_{i}.png'})
json.dump(meta, open(os.path.join(ROOT, 'grass_meta.json'), 'w'), indent=1); print(meta)
