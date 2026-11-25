#!/usr/bin/env python3
"""Dựng ảnh cây (Tree.png) và tháp (Tower.png) cho game:  python3 tools/build_object_assets.py <Tree.png> <Tower.png>
- Cây: xuất ảnh RỘNG 504px (hiển thị 112px thế giới = 2x2 ô; bản đồ cũ 52px) -> sắc nét, không nhòe.
- Làm mờ viền PHẦN ĐẾ (tấm đất hình thoi) bằng mặt nạ elip: cây/tháp 'mọc' từ mặt đất thay vì đặt trên một tấm nền rời. Thân/rễ giữ nguyên.
- Chỉnh màu dịu cùng chuẩn với địa hình (giảm bão hòa nhẹ, phủ sương)."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
HAZE = np.array([226, 230, 208], float)
def grade(rgb, sat=0.74, val=0.98, haze=0.09):
    hsv = np.array(Image.fromarray(rgb).convert('HSV'), float); hsv[..., 1] *= sat; hsv[..., 2] = np.clip(hsv[..., 2] * val, 0, 255)
    o = np.array(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB'), float); return np.clip(o * (1 - haze) + HAZE * haze, 0, 255).astype(np.uint8)
def feather_base(a, cyp=30, rx=78, ryu=52, ryl=34, y0p=84, soft=0.5):
    """Mờ dần tấm đế hình thoi ngoài hình elip (tính bằng PIXEL từ đáy ảnh): d<1-soft giữ nguyên, d>=1 trong suốt. Thân/rễ nằm trong elip nên giữ nguyên."""
    h, w = a.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]; dy = yy - (h - cyp); ry = np.where(dy < 0, ryu, ryl); d = np.sqrt(((xx - w / 2) / rx) ** 2 + (dy / ry) ** 2)
    t = np.clip((1 - d) / soft, 0, 1); m = t * t * (3 - 2 * t); m = np.where(yy > h - y0p, m, 1.0); a = a.copy(); a[..., 3] = (a[..., 3] * m).astype(np.uint8); return a
def components(path, dil):
    A = np.array(Image.open(path).convert('RGBA')); lab, n = ndi.label(ndi.binary_dilation(A[..., 3] > 40, iterations=dil)); items = []
    for i, s in enumerate(ndi.find_objects(lab)):
        if (s[0].stop - s[0].start) * (s[1].stop - s[1].start) > 8000: items.append((s[0].start // 500, s[1].start, i + 1, s))
    items.sort(key=lambda t: (t[0], t[1])); out = []
    for r, x, lb, s in items:
        c = A[s].copy(); c[lab[s] != lb, 3] = 0; ys, xs = np.where(c[..., 3] > 40); out.append(c[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    return out
def main(tree, tower):
    F = 504 / 700
    for k, c in enumerate(components(tree, 9)):
        c[..., :3] = grade(c[..., :3]); c = feather_base(c, cyp=int(30 / F), rx=int(58 / F), ryu=int(52 / F), ryl=int(24 / F), y0p=int(84 / F)); im = Image.fromarray(c); im = im.resize((round(im.width * F), round(im.height * F)), Image.LANCZOS)
        im.save(f'public/assets/trees/tree_{k}.png'); print('tree', k, im.size)
    A = np.array(Image.open(tower).convert('RGBA')); k = 0; F = 104 / 371
    for y0, y1 in [(0, 478), (478, 1024)]:
        for cx in range(3):
            c = A[y0:y1, cx * 512:(cx + 1) * 512]; ys, xs = np.where(c[..., 3] > 40); c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
            c = feather_base(c, cyp=int(14 / F), rx=int(0.5 * c.shape[1]), ryu=int(24 / F), ryl=int(16 / F), y0p=int(34 / F), soft=0.4); im = Image.fromarray(c).resize((round(c.shape[1] * F), round(c.shape[0] * F)), Image.LANCZOS)
            im.save(f'public/assets/towers/tower_{k}.png'); print('tower', k, im.size); k += 1
if __name__ == '__main__': main(sys.argv[1], sys.argv[2])
# GHI CHÚ: phần dựng CÂY ở trên đã được thay bằng tools/build_tree_assets.py (nguyên độ phân giải, không làm mờ chân). Đừng chạy file này để dựng cây nữa.
