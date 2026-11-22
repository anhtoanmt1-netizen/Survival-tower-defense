#!/usr/bin/env python3
"""Cắt sprite sheet địa hình thành từng asset theo VÙNG ALPHA (không giả định lưới đều).
Chạy: python3 tools/slice_sheet.py <sheet.png> [--out public/assets/terrain]
- Nhận diện thành phần liên thông trên alpha (có giãn nhẹ để gom viền mờ), sắp theo hàng rồi theo x.
- Giữ NGUYÊN pixel rìa: crop theo alpha > 0 trong vùng thành phần; không cắt bớt viền.
- Ghi đè thủ công: tools/manual_crops.json  {"<index>": [x0,y0,x1,y1]}  (dùng khi tự nhận diện sai).
- Ghi: <out>/raw/slice_XX.png (nguyên kích thước), <out>/index.json (bbox, kích thước) -> asset_meta.py gán nhóm."""
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
def slice_sheet(path, out, manual=None):
    im = Image.open(path).convert('RGBA'); A = np.array(im); a = A[..., 3]
    lab, n = ndi.label(ndi.binary_dilation(a > 30, iterations=5)); items = []
    for i, s in enumerate(ndi.find_objects(lab)):
        h, w = s[0].stop - s[0].start, s[1].stop - s[1].start
        if h * w > 6000: items.append((s[0].start + h // 2, s[1].start, i + 1, s))
    items.sort(key=lambda t: t[0]); rows = []
    for t in items:
        if rows and abs(t[0] - rows[-1][0][0]) < 130: rows[-1].append(t)
        else: rows.append([t])
    order = [t for r in rows for t in sorted(r, key=lambda t: t[1])]
    os.makedirs(out + '/raw', exist_ok=True); index = []
    for k, (cy, x, lb, s) in enumerate(order):
        comp = (lab[s] == lb); crop = A[s].copy(); crop[~comp, 3] = 0   # chỉ pixel thuộc thành phần này
        ys, xs = np.where(crop[..., 3] > 0); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        box = [int(v) for v in (s[1].start + x0, s[0].start + y0, s[1].start + x1, s[0].start + y1)]
        if manual and str(k) in manual: box = manual[str(k)]; c = A[box[1]:box[3], box[0]:box[2]].copy()
        else: c = crop[y0:y1, x0:x1]
        Image.fromarray(c).save(f'{out}/raw/slice_{k:02d}.png'); index.append({'index': k, 'bbox': box, 'w': int(c.shape[1]), 'h': int(c.shape[0]), 'row': next(i for i, r in enumerate(rows) if any(t[2] == lb for t in r))})
    json.dump(index, open(out + '/index.json', 'w'), indent=1); return index
if __name__ == '__main__':
    out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else 'public/assets/terrain'
    man = json.load(open('tools/manual_crops.json')) if os.path.exists('tools/manual_crops.json') else None
    idx = slice_sheet(sys.argv[1], out, man); print(len(idx), 'asset')
