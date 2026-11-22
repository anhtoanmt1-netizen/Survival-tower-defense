#!/usr/bin/env python3
"""Dựng bộ asset địa hình từ sprite sheet:  python3 tools/build_terrain_assets.py <sheet.png>
1) Cắt theo alpha (tools/slice_sheet.py)  2) Gán nhóm/metadata theo bảng META bên dưới (sửa ở đây hoặc dùng tools/asset-inspector.html)
3) Xuất public/assets/terrain/*.png (tỉ lệ đồng nhất 0.54: ô ~192px)  4) Dựng texture nền liền mạch (fill_*)  5) Ghi src/map/terrain/registry.js"""
import sys, os, json, numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(__file__)); from slice_sheet import slice_sheet
SCALE = 192 / 355; OUT = 'public/assets/terrain'; RAW = '/tmp/terrain_raw'
# index: (id, tên, nhóm, phân loại, layer, trọng số, flipX, flipY, rotate, edges N/S/E/W, ghi chú)
E = lambda n, s, e, w: dict(N=n, S=s, E=e, W=w)
G, D, W_, R, X = 'A_GRASS', 'B_DIRT', 'C_WATER', 'D_ROCK_CLIFF', 'E_DECOR'
META = {
 0: ('grass_detail_tuft', 'Cỏ chi tiết: bụi cỏ', G, 'Grass_Detail', 4, 0.6, 1, 1, 1, E('grass', 'grass', 'grass', 'grass')),
 1: ('grass_detail_flowers', 'Cỏ có hoa trắng/cam', G, 'Grass_Detail', 4, 0.8, 1, 1, 1, E('grass', 'grass', 'grass', 'grass')),
 2: ('grass_base_a', 'Cỏ nền', G, 'Grass_Base', 4, 3.0, 1, 1, 1, E('grass', 'grass', 'grass', 'grass')),
 3: ('grass_detail_rock_flowers', 'Cỏ có đá nhỏ và hoa', G, 'Grass_Detail', 4, 0.6, 1, 1, 1, E('grass', 'grass', 'grass', 'grass')),
 4: ('grass_variation_a', 'Cỏ biến thể mật độ', G, 'Grass_Variation', 4, 2.0, 1, 1, 1, E('grass', 'grass', 'grass', 'grass')),
 5: ('dirt_grass_blend_patch', 'Mảng đất xen cỏ', D, 'Dirt_Grass_Blend', 4, 1.0, 1, 1, 1, E('grass', 'grass', 'grass', 'grass')),
 6: ('dirt_path_straight', 'Đường đất thẳng (Bắc-Nam)', D, 'Dirt_Path', 4, 1.0, 0, 1, 0, E('grass', 'grass', 'dirt', 'dirt')),
 7: ('dirt_path_wide', 'Đường đất rộng / ngã ba', D, 'Dirt_Path_Intersection', 4, 1.0, 1, 0, 0, E('grass', 'dirt', 'grass', 'grass')),
 8: ('dirt_open_stones', 'Bãi đất có đá', D, 'Dirt_Open_Area', 4, 1.0, 1, 1, 1, E('grass', 'grass', 'grass', 'grass')),
 9: ('sand_stones_plants', 'Cát/đất có đá, cỏ nhỏ', D, 'Dirt_With_Stones', 4, 1.0, 1, 1, 1, E('sand', 'sand', 'sand', 'sand')),
 10: ('dirt_base', 'Cát/đất nền', D, 'Dirt_Base', 4, 3.0, 1, 1, 1, E('sand', 'sand', 'sand', 'sand')),
 11: ('sand_stone', 'Cát có đá', D, 'Dirt_With_Stones', 4, 1.0, 1, 1, 1, E('sand', 'sand', 'sand', 'sand')),
 12: ('grass_to_sand_edge', 'Cỏ chuyển sang cát (cạnh)', G, 'Grass_To_Sand', 5, 1.0, 1, 0, 1, E('grass', 'sand', 'grass|sand', 'grass|sand')),
 13: ('grass_to_sand_corner', 'Cỏ chuyển sang cát (góc)', G, 'Grass_To_Sand', 5, 1.0, 0, 0, 1, E('grass', 'sand', 'grass', 'sand')),
 14: ('stone_pave', 'Đá lát', D, 'Stone_Pave', 4, 1.0, 1, 1, 1, E('stone', 'stone', 'stone', 'stone')),
 15: ('stone_pave_grass', 'Đá lát xen cỏ', D, 'Stone_Pave', 4, 0.6, 1, 1, 1, E('stone', 'stone', 'stone', 'stone')),
 16: ('stone_pave_grass_edge', 'Đá lát có mép cỏ phía bắc', D, 'Stone_Pave', 5, 0.6, 1, 0, 0, E('grass', 'stone', 'stone', 'stone')),
 17: ('rock_cluster_tile', 'Cụm đá lớn trên nền cỏ (ô)', R, 'Rock_Cluster', 6, 0.8, 1, 0, 0, E('grass', 'rock', 'grass', 'grass')),
 18: ('water_deep_a', 'Nước sâu', W_, 'Water_Deep', 1, 3.0, 1, 1, 1, E('deep', 'deep', 'deep', 'deep')),
 19: ('water_deep_b', 'Nước sâu (biến thể)', W_, 'Water_Deep', 1, 3.0, 1, 1, 1, E('deep', 'deep', 'deep', 'deep')),
 20: ('water_shallow_stones', 'Nước nông có đá', W_, 'Water_Shallow', 2, 1.0, 1, 1, 1, E('shallow', 'shallow', 'shallow', 'shallow')),
 21: ('shore_sand_a', 'Bờ cát: cỏ-cát-nước nông', W_, 'Water_Shore_Sand', 5, 1.0, 1, 0, 0, E('grass|sand', 'shallow', 'shore', 'shore')),
 22: ('shore_sand_b', 'Bờ cát có đá', W_, 'Water_Shore_Sand', 5, 1.0, 1, 0, 0, E('grass|sand', 'shallow', 'shore', 'shore')),
 23: ('shore_sand_curve', 'Bờ cát cong', W_, 'Water_Shore_Sand', 5, 1.0, 0, 0, 0, E('grass|sand', 'shallow', 'sand', 'shore')),
 24: ('shore_grass_rocks', 'Bờ cỏ có đá', W_, 'Water_Shore_Grass', 5, 1.0, 0, 0, 0, E('grass', 'water', 'water', 'grass')),
 25: ('cliff_water_right_end_a', 'Vách ven nước: đầu phải', R, 'Cliff_Water_Edge', 6, 1.0, 0, 0, 0, E('grass', 'water', 'water', 'cliff')),
 26: ('cliff_water_right_end_b', 'Vách ven nước: đầu phải (đá lớn)', R, 'Cliff_Water_Edge', 6, 1.0, 0, 0, 0, E('grass', 'water', 'water', 'cliff')),
 27: ('water_stones_a', 'Nước có đá', W_, 'Water_With_Stones', 2, 0.5, 1, 1, 0, E('deep', 'deep', 'deep', 'deep')),
 28: ('water_stones_b', 'Nước có đá (2)', W_, 'Water_With_Stones', 2, 0.5, 1, 1, 0, E('deep', 'deep', 'deep', 'deep')),
 29: ('water_cascade', 'Thác nhỏ giữa nước (ghềnh)', W_, 'Water_Falls', 2, 0.4, 0, 0, 0, E('shallow', 'deep', 'deep', 'deep')),
 30: ('water_surface_ripple', 'Mặt nước gợn sóng', W_, 'Water_Surface', 2, 1.0, 1, 1, 1, E('deep', 'deep', 'deep', 'deep')),
 31: ('cliff_water_left_end_a', 'Vách ven nước: đầu trái', R, 'Cliff_Water_Edge', 6, 1.0, 0, 0, 0, E('grass', 'water', 'cliff', 'water')),
 32: ('cliff_water_front_a', 'Vách ven nước: mặt trước', R, 'Cliff_Water_Edge', 6, 1.5, 1, 0, 0, E('grass', 'water', 'cliff', 'cliff')),
 33: ('cliff_water_left_end_b', 'Vách ven nước: đầu trái (đá lẻ)', R, 'Cliff_Water_Edge', 6, 1.0, 0, 0, 0, E('grass', 'water', 'cliff', 'water')),
 34: ('cliff_waterfall', 'Vách có thác nước', W_, 'Water_Falls', 6, 1.0, 0, 0, 0, E('grass', 'water', 'cliff', 'cliff')),
 35: ('cliff_water_front_b', 'Vách ven nước: mặt trước (đá giữa)', R, 'Cliff_Water_Edge', 6, 1.5, 1, 0, 0, E('grass', 'water', 'cliff', 'cliff')),
 36: ('cliff_island_arch', 'Khối vách đảo (vòm)', R, 'Cliff_Island', 6, 1.0, 1, 0, 0, E('grass', 'ground', 'open', 'open')),
 37: ('cliff_top_front_a', 'Vách mặt trước A', R, 'Cliff_Top', 6, 1.5, 1, 0, 0, E('grass', 'ground', 'cliff', 'cliff')),
 38: ('cliff_top_front_b', 'Vách mặt trước B (đá lớn)', R, 'Cliff_Top', 6, 1.0, 1, 0, 0, E('grass', 'ground', 'cliff', 'cliff')),
 39: ('cliff_top_front_c', 'Vách mặt trước C (cây bụi)', R, 'Cliff_Top', 6, 1.0, 1, 0, 0, E('grass', 'ground', 'cliff', 'cliff')),
 40: ('cliff_corner_right_a', 'Vách góc đầu phải A', R, 'Cliff_Top_Right', 6, 1.0, 1, 0, 0, E('grass', 'ground', 'open', 'cliff')),
 41: ('cliff_corner_right_b', 'Vách góc đầu phải B', R, 'Cliff_Top_Right', 6, 1.0, 1, 0, 0, E('grass', 'ground', 'open', 'cliff')),
 42: ('cliff_top_front_d', 'Vách mặt trước D (rộng)', R, 'Cliff_Top', 6, 1.2, 1, 0, 0, E('grass', 'ground', 'cliff', 'cliff')),
 43: ('rock_mound_large', 'Gò đá lớn phủ cỏ', R, 'Rock_Large', 8, 1.0, 1, 0, 0, E('any', 'any', 'any', 'any')),
 44: ('cliff_island_mound', 'Đảo đá nhỏ phủ cỏ', R, 'Cliff_Island', 8, 1.0, 1, 0, 0, E('any', 'any', 'any', 'any')),
 45: ('bush_cluster', 'Bụi cây', X, 'Grass_Bushes', 8, 1.0, 1, 0, 0, E('any', 'any', 'any', 'any')),
 46: ('dirt_blob', 'Mảng đất tròn có cỏ viền', X, 'Dirt_Open_Area', 7, 1.0, 1, 1, 1, E('grass', 'grass', 'grass', 'grass')),
 47: ('sand_blob', 'Mảng cát tròn', X, 'Dirt_Open_Area', 7, 1.0, 1, 1, 1, E('grass', 'grass', 'grass', 'grass')),
 48: ('rock_cluster_plants', 'Cụm đá và cây dại', R, 'Rock_Medium', 8, 1.0, 1, 0, 0, E('any', 'any', 'any', 'any')),
 49: ('rock_large_tip', 'Đá lớn có đỉnh cỏ', R, 'Rock_Large', 8, 1.0, 1, 0, 0, E('any', 'any', 'any', 'any')),
 50: ('rock_cluster_wide', 'Cụm đá lớn rộng', R, 'Rock_Cluster', 8, 1.0, 1, 0, 0, E('any', 'any', 'any', 'any')),
}
HAZE = np.array([226, 230, 208], float)
def grade(a, sat=0.72, val=0.98, haze=0.11):
    hsv = np.array(Image.fromarray(a).convert('HSV'), float); hsv[..., 1] *= sat; hsv[..., 2] = np.clip(hsv[..., 2] * val, 0, 255)
    o = np.array(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB'), float); return np.clip(o * (1 - haze) + HAZE * haze, 0, 255).astype(np.uint8)
def ss(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
def edge_fade(a, top=0.0, side=0.0, side_from=0.0, bottom=0.0, side_top=0.0):
    """Làm mờ dần alpha ở viền để sprite HÒA vào nền (xóa viền đen ở mặt cỏ trên đỉnh vách, mép nước của vách ven nước).
    top: tỉ lệ chiều cao mờ ở trên; side/side_from: mờ hai bên từ độ cao side_from trở xuống; bottom: mờ dưới; side_top: mờ hai bên phần cỏ trên cùng."""
    h, w = a.shape[:2]; y = (np.arange(h) / h)[:, None]; x = (np.arange(w) / w)[None, :]; m = np.ones((h, w))
    if top: m *= ss(y / top)
    if bottom: m *= ss((1 - y) / bottom)
    if side: m *= 1 - (1 - ss(x / side) * ss((1 - x) / side)) * ss((y - side_from) / 0.08)
    if side_top: m *= 1 - (1 - ss(x / side_top) * ss((1 - x) / side_top)) * (1 - ss((y - 0.3) / 0.1))
    a = a.copy(); a[..., 3] = (a[..., 3] * m).astype(np.uint8); return a
FADE = {'Cliff_Top': dict(top=0.24, side_top=0.07), 'Cliff_Top_Right': dict(top=0.24, side_top=0.07), 'Cliff_Island': dict(top=0.22, side_top=0.06),
        'Cliff_Water_Edge': dict(top=0.24, side=0.13, side_from=0.5, bottom=0.14, side_top=0.07), 'Water_Falls': dict(top=0.24, side=0.12, side_from=0.5, bottom=0.14, side_top=0.07)}
def crop_frac(i, box, size=64):
    im = Image.open(f'{RAW}/raw/slice_{i:02d}.png').convert('RGB'); w, h = im.size
    return im.crop((int(w * box[0]), int(h * box[1]), int(w * box[2]), int(h * box[3]))).resize((size, size), Image.LANCZOS)
def dih(im, k):
    t = im.rotate(90 * (k % 4)); return t.transpose(Image.FLIP_LEFT_RIGHT) if k >= 4 else t
def seamless(a):
    h, w = a.shape[:2]; yy, xx = np.mgrid[0:h, 0:w]; m = (np.sin(np.pi * (xx + .5) / w) * np.sin(np.pi * (yy + .5) / h))[..., None] ** 0.8
    return (a * m + np.roll(a, (h // 2, w // 2), (0, 1)) * (1 - m)).astype(np.float32)
def flatten(a, r=11, k=0.8):
    img = Image.fromarray(a.astype(np.uint8)); pad = np.pad(a.astype(np.uint8), ((64, 64), (64, 64), (0, 0)), mode='wrap')
    low = np.array(Image.fromarray(pad).filter(ImageFilter.GaussianBlur(r)), float)[64:-64, 64:-64]; return np.clip(a - low * k + a.reshape(-1, 3).mean(0) * k, 0, 255)
def fill(name, crops, sat=0.72, k=0.8, post=None, con=1.0):
    # Nền liền mạch: dán ~18 mảng tròn mép mềm (có xoay/lật, bọc vòng 128px) lên lớp lát -> không còn đường nối ô
    rng = np.random.default_rng(abs(hash(name)) % 2**32); tiles = [np.array(crop_frac(i, b)).astype(float) for i, b in crops]
    cv = np.tile(tiles[0], (2, 2, 1)); yy, xx = np.mgrid[-32:32, -32:32]; d = np.sqrt(xx ** 2 + yy ** 2); t = np.clip((31 - d) / 14, 0, 1); m = (t * t * (3 - 2 * t))[..., None]
    for _ in range(18):
        s = np.array(dih(Image.fromarray(tiles[int(rng.integers(len(tiles)))].astype(np.uint8)), int(rng.integers(8)))).astype(float)
        cy, cx = int(rng.integers(128)), int(rng.integers(128)); ys = (cy - 32 + np.arange(64)) % 128; xs = (cx - 32 + np.arange(64)) % 128
        cv[np.ix_(ys, xs)] = cv[np.ix_(ys, xs)] * (1 - m) + s * m
    a = grade(np.clip(cv, 0, 255).astype(np.uint8), sat=sat); a = flatten(a, 14, k); mu = a.reshape(-1, 3).mean(0); a = np.clip(mu + (a - mu) * con, 0, 255).astype(np.uint8)
    Image.fromarray(a).save(f'{OUT}/fill_{name}.png'); return name
def main(sheet):
    os.makedirs(OUT, exist_ok=True); idx = slice_sheet(sheet, RAW); entries = []
    for e in idx:
        k = e['index']; m = META[k]; im = Image.open(f'{RAW}/raw/slice_{k:02d}.png').convert('RGBA'); w, h = im.size
        a = np.array(im); a[..., :3] = np.where(a[..., 3:4] > 0, grade(a[..., :3], sat=0.8, haze=0.07), a[..., :3])   # chỉnh màu dịu nhưng giữ alpha
        im0 = Image.fromarray(a).resize((round(w * SCALE), round(h * SCALE)), Image.LANCZOS); al = np.array(im0)[..., 3]; ys, xs = np.where(al > 200)   # vùng sử dụng đo TRƯỚC khi làm mờ viền
        f = FADE.get(m[3]) if (m[3] != 'Water_Falls' or m[0] == 'cliff_waterfall') else None
        im = Image.fromarray(edge_fade(np.array(im0), **f)) if f else im0; im.save(f'{OUT}/{m[0]}.png')
        entries.append(dict(id=m[0], name=m[1], group=m[2], sub=m[3], kind='object' if m[4] >= 8 else 'tile', layer=m[4], weight=m[5], size=[im.width, im.height], bbox=e['bbox'], usable=[int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1],
                            flipX=bool(m[6]), flipY=bool(m[7]), rotate=bool(m[8]), edges=m[9], src=f'terrain/{m[0]}.png', index=k))
    fills = [fill('grass', [(2, (.12, .12, .88, .88)), (4, (.12, .12, .88, .88)), (2, (.1, .1, .9, .9)), (4, (.14, .14, .86, .86))]),
             fill('flower', [(1, (.1, .1, .9, .9)), (3, (.1, .1, .9, .9)), (4, (.1, .1, .9, .9)), (0, (.1, .1, .9, .9))], k=0.6),
             fill('dirt', [(7, (.30, .38, .70, .80)), (6, (.32, .30, .68, .75)), (7, (.28, .30, .66, .70)), (6, (.30, .55, .70, .92))], sat=0.85),
             fill('sand', [(10, (.1, .1, .9, .9)), (11, (.1, .1, .9, .9)), (9, (.1, .1, .9, .9)), (10, (.15, .15, .85, .85))], sat=0.9),
             fill('deep', [(18, (.1, .1, .9, .9)), (19, (.1, .1, .9, .9)), (18, (.15, .15, .85, .85)), (19, (.12, .12, .88, .88))], sat=0.82, k=0.7, con=0.82),
             fill('shallow', [(20, (.06, .06, .56, .56)), (30, (.05, .2, .6, .75)), (20, (.45, .5, .95, .95)), (30, (.05, .45, .6, .95))], sat=0.85, k=0.6, con=0.8),
             fill('pave', [(14, (.1, .1, .9, .9)), (14, (.15, .2, .85, .9)), (15, (.1, .1, .6, .6)), (14, (.2, .1, .8, .7))], sat=0.8)]
    for f in fills: entries.append(dict(id='fill_' + f, name='Texture nền liền mạch ' + f, group={'grass': 'A_GRASS', 'flower': 'A_GRASS', 'dirt': 'B_DIRT', 'sand': 'B_DIRT', 'deep': 'C_WATER', 'shallow': 'C_WATER', 'pave': 'B_DIRT'}[f], sub='Fill', kind='fill', layer=3 if f != 'deep' else 1, weight=1.0, size=[128, 128], bbox=[0, 0, 128, 128], usable=[0, 0, 128, 128], flipX=False, flipY=False, rotate=False, edges=E('any', 'any', 'any', 'any'), src=f'terrain/fill_{f}.png', index=-1))
    js = '// SINH TỰ ĐỘNG bởi tools/build_terrain_assets.py — Asset Registry. Sửa metadata trong bảng META của script (hoặc xuất từ tools/asset-inspector.html).\nexport const REGISTRY = ' + json.dumps(entries, ensure_ascii=False, indent=1) + ';\n'
    open('src/map/terrain/registry.js', 'w').write(js); print(len(entries), 'asset trong registry')
if __name__ == '__main__': main(sys.argv[1])
