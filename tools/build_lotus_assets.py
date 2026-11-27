#!/usr/bin/env python3
"""Tách sprite sheet hoa sen (tools/src/hoasen.png, nền trắng) thành các sprite PNG trong suốt: public/assets/lotus/lotus_0..N.png + tools/lotus_meta.json.
- Nền = vùng gần trắng LIÊN THÔNG với mép ảnh (nên điểm sáng trắng trên cánh hoa/giọt nước bên trong không bị xóa), làm mềm mép 1px, khử viền trắng.
- Mỗi sprite là một cụm rời nhau (gộp bằng giãn nở để các mảnh gợn nước thuộc cùng sprite), cắt sát, thu về tối đa OUT_W px (nét ở zoom 3x), sắp theo thứ tự đọc (trên→dưới, trái→phải).
- meta: kích thước và 'water' = tỉ lệ chiều cao phần có mặt nước (lá/hoa nổi) để game biết sprite lớn cỡ nào thì cần bao nhiêu ô nước.
Chạy: python3 tools/build_lotus_assets.py"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(ROOT, 'src', 'hoasen.png'); OUT = os.path.join(ROOT, '..', 'public', 'assets', 'lotus')
OUT_W = 256; WHITE = 238
os.makedirs(OUT, exist_ok=True)
im = Image.open(SRC).convert('RGB'); a = np.asarray(im).astype(np.float32); H, W, _ = a.shape
white = a.min(axis=2) >= WHITE
lab, n = ndi.label(white); border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
sizes = ndi.sum(white, lab, index=np.arange(1, n + 1))
big = {i + 1 for i, z in enumerate(sizes) if z >= 1500}   # khoảng trắng kín giữa các nụ/cuống cũng là nền; điểm sáng trong cánh hoa nhỏ hơn nhiều nên được giữ
bg = np.isin(lab, list(border | big))
alpha = ndi.gaussian_filter((~bg).astype(np.float32), 1.0)           # mép mềm
alpha = np.clip((alpha - 0.35) / 0.5, 0, 1)
# khử viền trắng: ở vùng sát nền, kéo màu về màu trung bình của điểm ảnh bên trong (xói mòn 3px)
inner = ndi.binary_erosion(~bg, iterations=3); rgb = a.copy()
dist_in = ndi.distance_transform_edt(~inner, return_indices=True)
idx = dist_in[1]; near = (~inner) & (~bg)
for c in range(3): rgb[..., c] = np.where(near, a[..., c][idx[0], idx[1]], a[..., c])
rgba = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
merged = ndi.binary_dilation(alpha > 0.2, iterations=40); lab2, n2 = ndi.label(merged); sl = ndi.find_objects(lab2)
items = []
for i, s in enumerate(sl):
    ys, xs = s; area = ((alpha[s] > 0.2) & (lab2[s] == i + 1)).sum()
    if area < 20000: continue
    items.append((ys.start, xs.start, s, i + 1))
rows = sorted(items, key=lambda t: (round(t[0] / 400), t[1]))     # theo hàng (±400px) rồi theo cột
meta = []
for k, (_, _, s, lid) in enumerate(rows):
    cell = rgba[s].copy(); cell[..., 3] = np.where(lab2[s] == lid, cell[..., 3], 0)
    ys, xs = np.where(cell[..., 3] > 24); crop = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    img = Image.fromarray(crop, 'RGBA'); sc = min(1.0, OUT_W / img.width)
    # thu nhỏ với alpha nhân sẵn để không lem viền
    f = np.asarray(img).astype(np.float32); f[..., :3] *= f[..., 3:4] / 255; im2 = Image.fromarray(f.astype(np.uint8), 'RGBA')
    sm = np.asarray(im2.resize((max(1, round(img.width * sc)), max(1, round(img.height * sc))), Image.LANCZOS)).astype(np.float32)
    al = sm[..., 3:4]; sm[..., :3] = np.where(al > 0, sm[..., :3] * 255 / np.maximum(al, 1), 0)
    out = Image.fromarray(sm.clip(0, 255).astype(np.uint8), 'RGBA'); out.save(os.path.join(OUT, f'lotus_{k}.png'), optimize=True)
    meta.append({'i': k, 'w': out.width, 'h': out.height})
json.dump(meta, open(os.path.join(ROOT, 'lotus_meta.json'), 'w'), indent=1); print(meta)
