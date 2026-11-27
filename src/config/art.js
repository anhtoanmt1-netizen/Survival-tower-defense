// Danh mục tài nguyên hình ảnh: cây (Tree.png) và tháp (Tower.png) ở public/assets; địa hình ở map/terrain/registry.js (Asset Registry).
// Kích thước hiển thị của cây/bóng đổ nằm ở config/visual.js.
export const TREE_NAMES = ['Phong đỏ', 'Liễu', 'Anh đào', 'Hoa đỏ rủ', 'Sồi', 'Táo', 'Tre', 'Khô', 'Thông'];
// Nhóm loài cây theo VÙNG: rừng thông, sồi, vườn táo, hoa anh đào... Chỉ số = tree_<i>.png
export const TREE_ZONES = [
  { name: 'oak', species: [4, 4, 4, 5, 1] }, { name: 'pine', species: [8, 8, 8, 4, 7] }, { name: 'orchard', species: [5, 5, 4, 2, 3] },
  { name: 'blossom', species: [2, 2, 3, 4, 1] }, { name: 'autumn', species: [0, 0, 0, 4, 7] }, { name: 'bamboo', species: [6, 6, 6, 4, 1] },
];
// Tháp: chiều rộng hiển thị (px thế giới) theo từng hình tiến hóa. tháp chiếm 2x2 ô = 64px => rộng ~64px: hai tháp liền kề KHÔNG chồng lên nhau (hình LV15 có thêm vòng sáng nên rộng hơn một chút).
export const TOWER_DISPLAY = { widths: [64, 64, 64, 66, 66, 70], shadowY: 4 };   // tháp chiếm 2x2 ô (64px): rộng ≈ 2 ô, hai tháp kề nhau không đè nhau
export const WALL_DISPLAY = { width: 68 };   // tường chiếm 2x2 ô: rộng ~2 ô, các khối tường kề nhau nối liền (xếp theo Y)
export const PLAYER_DISPLAY = { scale: 0.36, originY: 128 / 136, cell: [96, 136] }; // main_sheet.png: 3 cột x 4 hàng (xuống/trái/phải/lên), chân ở y=128
// Vị trí ĐUỐC trên từng hình tháp (Tower.png) – [x, y, cỡ] với x,y là tỉ lệ 0..1 trên ảnh, y = gốc ngọn lửa. Hình LV1-LV7(0,1) không có đuốc. Hình 5 là lửa xanh.
export const TOWER_FLAMES = {
  2: [[0.1752, 0.6403, 1], [0.6442, 0.651, 1], [0.8221, 0.636, 0.5]], 3: [[0.191, 0.6515, 1], [0.6558, 0.661, 1], [0.8166, 0.6648, 0.5]],
  4: [[0.1883, 0.6509, 1], [0.665, 0.6566, 1], [0.824, 0.6509, 0.55]], 5: [[0.1739, 0.7217, 0.9], [0.7094, 0.744, 0.9], [0.8238, 0.7217, 0.7]],
};
export const TOWER_FLAME_BLUE = 5;                // 6 hình: 0 (LV1-4), 1 (LV5), 2 (LV7), 3 (LV9), 4 (LV12), 5 (LV15)
export const TOWER_STAGE_LEVELS = [5, 7, 9, 12, 15];
export const towerStage = (level) => TOWER_STAGE_LEVELS.filter((l) => level >= l).length;
export const GRASS_SPRITES = 9;   // grass_0..8.png: cắt từ tools/src/grass.png bằng tools/build_grass_assets.py
export const LOTUS_COUNT = 7;     // lotus_0..6.png: cắt từ tools/src/hoasen.png bằng tools/build_lotus_assets.py
export function assetManifest() {
  const img = [];
  for (let i = 0; i < 9; i++) img.push([`tree_${i}`, `trees/tree_${i}.png`]);
  for (let i = 0; i < 6; i++) img.push([`tower_${i}`, `towers/tower_${i}.png`]);
  img.push(['wall', 'wall/wall.png'], ['main_sheet', 'player/main_sheet.png'], ['main_base', 'player/main_base.png'], ['main_hair', 'player/main_hair.png']);
  for (let i = 0; i < GRASS_SPRITES; i++) img.push([`grass_img_${i}`, `grass/grass_${i}.png`]);
  for (let i = 0; i < LOTUS_COUNT; i++) img.push([`lotus_${i}`, `lotus/lotus_${i}.png`]);
  return img;
}
