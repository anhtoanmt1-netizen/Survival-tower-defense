// Danh mục tài nguyên hình ảnh: cây (Tree.png) và tháp (Tower.png) ở public/assets; địa hình ở map/terrain/registry.js (Asset Registry).
// Kích thước hiển thị của cây/bóng đổ nằm ở config/visual.js.
export const TREE_NAMES = ['Phong đỏ', 'Liễu', 'Anh đào', 'Hoa đỏ rủ', 'Sồi', 'Táo', 'Tre', 'Khô', 'Thông'];
// Nhóm loài cây theo VÙNG: rừng thông, sồi, vườn táo, hoa anh đào... Chỉ số = tree_<i>.png
export const TREE_ZONES = [
  { name: 'oak', species: [4, 4, 4, 5, 1] }, { name: 'pine', species: [8, 8, 8, 4, 7] }, { name: 'orchard', species: [5, 5, 4, 2, 3] },
  { name: 'blossom', species: [2, 2, 3, 4, 1] }, { name: 'autumn', species: [0, 0, 0, 4, 7] }, { name: 'bamboo', species: [6, 6, 6, 4, 1] },
];
export const TOWER_DISPLAY = { texScale: 0.5, shadowY: 4 };                // 6 hình: 0 (LV1-4), 1 (LV5), 2 (LV7), 3 (LV9), 4 (LV12), 5 (LV15)
export const TOWER_STAGE_LEVELS = [5, 7, 9, 12, 15];
export const towerStage = (level) => TOWER_STAGE_LEVELS.filter((l) => level >= l).length;
export function assetManifest() {
  const img = [];
  for (let i = 0; i < 9; i++) img.push([`tree_${i}`, `trees/tree_${i}.png`]);
  for (let i = 0; i < 6; i++) img.push([`tower_${i}`, `towers/tower_${i}.png`]);
  return img;
}
