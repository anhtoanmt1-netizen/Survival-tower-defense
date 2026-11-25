#!/usr/bin/env python3
"""Tách 9 cây từ Tree.png (lưới 3x3, nền trong suốt) -> public/assets/trees/tree_0..8.png:  python3 tools/build_tree_assets.py <Tree.png>
- Giữ NGUYÊN độ phân giải, màu và chi tiết gốc (không co ảnh, không chỉnh màu, KHÔNG làm mờ/xóa chân cây): thân và rễ liền một khối.
- Chỉ cắt sát vùng có hình và bỏ các chấm lẻ ngoài cây. Thứ tự tree_<i> = thứ tự đọc trái->phải, trên->dưới (khớp VISUAL.leaf)."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
def main(src, out='public/assets/trees'):
    A = np.array(Image.open(src).convert('RGBA')); H, W = A.shape[:2]
    lab, n = ndi.label(ndi.binary_dilation(A[..., 3] > 40, iterations=5)); items = []
    for i, s in enumerate(ndi.find_objects(lab)):
        if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) > 0.004 * H * W: items.append((i + 1, s))
    assert len(items) == 9, f'cần 9 cây, tìm thấy {len(items)}'
    items.sort(key=lambda t: ((t[1][0].start + t[1][0].stop) // 2 * 3 // H, t[1][1].start))
    for k, (lb, s) in enumerate(items):
        c = A[s].copy(); c[lab[s] != lb, 3] = 0; ys, xs = np.where(c[..., 3] > 8); c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        Image.fromarray(c).save(f'{out}/tree_{k}.png', optimize=True); print('tree', k, c.shape[1], 'x', c.shape[0])
if __name__ == '__main__': main(*sys.argv[1:])
