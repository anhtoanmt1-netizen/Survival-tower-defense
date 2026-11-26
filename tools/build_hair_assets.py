#!/usr/bin/env python3
"""Tách TÓC khỏi sprite nhân vật để game có thể làm tóc chuyển động (không đổi nét vẽ gốc).
Đầu vào : public/assets/player/main_sheet.png  (3 cột x 4 hàng, ô 96x136; hàng 0 xuống, 1 trái, 2 phải, 3 lên)
Đầu ra  : main_hair.png = chỉ các điểm ảnh tóc (nâu, vùng đầu); main_base.png = sprite gốc nhưng chỗ tóc được lấp màu tóc phẳng (để khi lớp tóc lệch nhẹ không lộ lỗ hổng).
Hàng 3 (nhìn từ sau) gần như chỉ thấy mũ nên không tách tóc. Lớp tóc + lớp thân ghép lại ở vị trí gốc cho đúng ảnh ban đầu từng điểm ảnh."""
import os, numpy as np
from PIL import Image
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'assets', 'player'); CW, CH = 96, 136
im = Image.open(os.path.join(D, 'main_sheet.png')).convert('RGBA'); a = np.asarray(im).astype(np.float32); H, W, _ = a.shape
r, g, b, al = [a[..., i] / 255 for i in range(4)]; mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b); d = mx - mn + 1e-6
h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60; s = d / (mx + 1e-6); v = mx
scarf = ((h <= 13) | (h >= 345)) & (s > 0.55) & (v > 0.42)   # điểm ảnh khăn quàng: game đổi màu theo người chơi -> luôn ở lớp thân
hair = (al > 0.5) & (h >= 12) & (h <= 38) & (s > 0.3) & (s < 0.85) & (v > 0.30) & (v < 0.7) & ~scarf
yy = (np.arange(H)[:, None] % CH); hair &= (yy < 60); hair[3 * CH:] = False
hairimg = np.zeros_like(a); hairimg[hair] = a[hair]; base = a.copy()
for row in range(3):
    for col in range(3):
        sl = (slice(row * CH, (row + 1) * CH), slice(col * CW, (col + 1) * CW)); m = hair[sl]
        if m.any(): base[sl][m] = np.append(a[sl][m][:, :3].mean(axis=0) * 0.82, 255)
Image.fromarray(hairimg.astype(np.uint8), 'RGBA').save(os.path.join(D, 'main_hair.png'), optimize=True)
Image.fromarray(base.astype(np.uint8), 'RGBA').save(os.path.join(D, 'main_base.png'), optimize=True)
print('tóc:', int(hair.sum()), 'điểm ảnh')
