#!/usr/bin/env python3
"""Dựng asset từ File.rar (Main.png, Tower.png, Wall.png):
   python3 tools/build_new_assets.py <thư mục chứa Main.png Tower.png Wall.png>
- Main.png: tách nền magenta (chroma key + khử viền), cắt 12 khung (3 cột x 4 hàng: xuống/trái/phải/lên), căn chân theo từng hàng -> public/assets/player/main_sheet.png
- Tower.png: 6 hình tiến hóa, GIỮ NGUYÊN chi tiết gốc (đuốc, cờ, pha lê); chỉ làm mờ mép tấm đế để hòa vào nền -> public/assets/towers/tower_N.png; in ra tọa độ đuốc (chuẩn hóa) để config/art.js dùng
- Wall.png: cắt sát, làm mờ mép đế -> public/assets/wall/wall.png"""
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi

def key_magenta(path):
    a = np.array(Image.open(path).convert('RGB')).astype(np.float32); R, G, B = a[..., 0], a[..., 1], a[..., 2]
    alpha = 1 - np.clip((np.minimum(R, B) - G - 60) / 140, 0, 1)
    solid = alpha > 0.5; lab, n = ndi.label(ndi.binary_dilation(solid, iterations=2)); sizes = ndi.sum(solid, lab, range(1, n + 1)); keep = np.zeros(n + 1, bool); keep[1:] = sizes > 400
    alpha = alpha * ndi.binary_dilation(keep[lab], iterations=1)
    bg = np.array([250, 4, 250], np.float32); out = a.copy(); m = (alpha > 0.02) & (alpha < 0.98)
    for c in range(3): out[..., c][m] = np.clip((a[..., c][m] - (1 - alpha[m]) * bg[c]) / np.maximum(alpha[m], 0.05), 0, 255)
    return np.dstack([out, alpha * 255]).clip(0, 255).astype(np.uint8)

def build_main(src, dst):
    im = key_magenta(src); al = im[..., 3]; CW, CH, S, GROUND, HALF = 96, 136, 0.37, 128, 125
    sheet = Image.new('RGBA', (CW * 3, CH * 4), (0, 0, 0, 0))
    for r in range(4):
        cells = []
        for c in range(3):
            x0, x1, y0, y1 = int(c * 1024 / 3), int((c + 1) * 1024 / 3), r * 384, (r + 1) * 384; a = al[y0:y1, x0:x1] > 128; ys, xs = np.where(a)
            cells.append((x0, y0, ys.max(), a[int(ys.max() - 0.12 * (ys.max() - ys.min())):].nonzero()[1].mean()))
        gb = cells[1][2]; gx = cells[1][3]            # mặt đất + tâm chân lấy theo khung đứng yên (khung giữa), mọi khung trong hàng dịch cùng một lượng
        for c, (x0, y0, _, _) in enumerate(cells):
            sx0, sy0 = int(x0 + gx - HALF), int(y0 + gb - GROUND / S); w, h = 2 * HALF, int(CH / S)
            pad = np.zeros((h, w, 4), np.uint8); ax0, ay0 = max(0, sx0), max(0, sy0); ax1, ay1 = min(im.shape[1], sx0 + w), min(im.shape[0], sy0 + h)
            # chỉ lấy trong ô của chính khung (tránh lẫn khung bên cạnh)
            cx0, cx1, cy0, cy1 = max(ax0, x0), min(ax1, int(x0 + 1024 / 3)), max(ay0, y0), min(ay1, y0 + 384)
            pad[cy0 - sy0:cy1 - sy0, cx0 - sx0:cx1 - sx0] = im[cy0:cy1, cx0:cx1]
            t = Image.fromarray(pad).resize((CW, CH), Image.LANCZOS); sheet.paste(t, (c * CW, r * CH))
    sheet.save(dst); print('main', sheet.size)

def feather_base(a, cyp, rx, ryu, ryl, y0p, soft):
    """Mờ dần mép tấm đế (cỏ/đất) để vật thể 'mọc' từ mặt đất. Nửa dưới tâm đế: elip đầy đủ; nửa trên: chỉ mờ theo CHIỀU NGANG
    (không bao giờ làm mờ thân công trình -> không có vệt ngang cắt qua cửa/thân). ryu giữ lại để tương thích tham số cũ."""
    h, w = a.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]; dy = yy - (h - cyp); dx = (xx - w / 2) / rx
    d = np.where(dy >= 0, np.sqrt(dx ** 2 + (dy / ryl) ** 2), np.abs(dx))
    t = np.clip((1 - d) / soft, 0, 1); m = t * t * (3 - 2 * t); m = np.where(yy > h - y0p, m, 1.0); a = a.copy(); a[..., 3] = (a[..., 3] * m).astype(np.uint8); return a

# tọa độ đuốc trên sheet gốc (x, y của gốc ngọn lửa, tỉ lệ kích thước) – kiểm tra bằng ảnh phủ
TORCH = {2: [(1138, 305, 1.0), (1312, 310, 1.0), (1378, 303, 0.5)], 3: [(158, 825, 1.0), (343, 830, 1.0), (407, 832, 0.5)],
         4: [(640, 825, 1.0), (835, 828, 1.0), (900, 825, 0.55)], 5: [(1121, 868, 0.9), (1355, 880, 0.9), (1405, 868, 0.7)]}
def build_towers(src, dst_dir, F=0.46):
    A = np.array(Image.open(src).convert('RGBA')); k = 0; flames = {}
    for y0, y1 in [(0, 478), (478, 1024)]:
        for cx in range(3):
            c = A[y0:y1, cx * 512:(cx + 1) * 512]; ys, xs = np.where(c[..., 3] > 40); oy, ox = ys.min(), xs.min(); c = c[oy:ys.max() + 1, ox:xs.max() + 1].copy()
            c = feather_base(c, cyp=50, rx=int(0.5 * c.shape[1]), ryu=86, ryl=57, y0p=121, soft=0.4)
            im = Image.fromarray(c).resize((round(c.shape[1] * F), round(c.shape[0] * F)), Image.LANCZOS); im.save(f'{dst_dir}/tower_{k}.png')
            if k in TORCH: flames[k] = [[round((x - (cx * 512 + ox)) / c.shape[1], 4), round((y - (y0 + oy)) / c.shape[0], 4), s] for x, y, s in TORCH[k]]
            print('tower', k, im.size); k += 1
    return flames

def build_wall(src, dst):
    A = np.array(Image.open(src).convert('RGBA')); ys, xs = np.where(A[..., 3] > 40); A = A[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
    A = feather_base(A, cyp=int(0.07 * A.shape[0]), rx=int(0.62 * A.shape[1]), ryu=int(0.16 * A.shape[0]), ryl=int(0.1 * A.shape[0]), y0p=int(0.2 * A.shape[0]), soft=0.35)
    F = 220 / A.shape[1]; Image.fromarray(A).resize((220, round(A.shape[0] * F)), Image.LANCZOS).save(dst); print("wall", 220, round(A.shape[0] * F))

if __name__ == '__main__':
    d = sys.argv[1]; os.makedirs('public/assets/player', exist_ok=True); os.makedirs('public/assets/wall', exist_ok=True)
    build_main(f'{d}/Main.png', 'public/assets/player/main_sheet.png'); fl = build_towers(f'{d}/Tower.png', 'public/assets/towers'); build_wall(f'{d}/Wall.png', 'public/assets/wall/wall.png')
    print('FLAMES', json.dumps(fl))
