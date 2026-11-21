// Danh mục tài nguyên hình ảnh (cắt từ Background.png / Tree.png / Tower.png → public/assets). Thêm hình mới: thêm vào đây.
export const GROUND_RES = 1.5;                 // độ phân giải nướng nền: px nguồn / px thế giới (tile nguồn 48px)
export const TILE_SRC = 48;
const N = (p, n) => Array.from({ length: n }, (_, i) => `${p}_v${i}`);
export const TILES = {
  grass: N('grass_plain', 8), grassAccent: ['grass_1', 'grass_2', 'grass_3', 'grass_4'],
  sand: [...N('sand_0', 4), ...N('sand_1', 4), ...N('sand_2', 4)], water: [...N('water_0', 4), ...N('water_1', 4)], waterShallow: N('water_2', 4), pave: ['pave_0', 'pave_1', 'pave_2'],
};
export const ROCKS = ['rock_0', 'rock_1', 'rock_2', 'rock_3', 'rock_4', 'rock_5', 'rock_6', 'rock_7'];
export const BUSH = 'bush_0';
// Cây: nhóm loài theo vùng (rừng thông, sồi, vườn táo...) để cảnh quan có chủ đề. Chỉ số = tree_<i>.png
export const TREE_NAMES = ['Phong đỏ', 'Liễu', 'Anh đào', 'Hoa đỏ rủ', 'Sồi', 'Táo', 'Tre', 'Khô', 'Thông'];
export const TREE_ZONES = [
  { name: 'oak', species: [4, 4, 4, 5, 1], },
  { name: 'pine', species: [8, 8, 8, 4, 7], },
  { name: 'orchard', species: [5, 5, 4, 2, 3], },
  { name: 'blossom', species: [2, 2, 3, 4, 1], },
  { name: 'autumn', species: [0, 0, 0, 4, 7], },
  { name: 'bamboo', species: [6, 6, 6, 4, 1], },
];
export const TREE_DISPLAY = { width: 52, texScale: 0.5, baseY: 30 };   // đáy cây đặt thấp hơn tâm ô 14px: gốc cây nằm trong ô
export const ROCK_DISPLAY = { width: 42, texScale: 0.5 };
export const BUSH_DISPLAY = { width: 30, texScale: 0.5 };
export const TOWER_DISPLAY = { texScale: 0.5, shadowY: 4 };                // 6 hình: 0 (LV1-4), 1 (LV5), 2 (LV7), 3 (LV9), 4 (LV12), 5 (LV15)
export const TOWER_STAGE_LEVELS = [5, 7, 9, 12, 15];
export const towerStage = (level) => TOWER_STAGE_LEVELS.filter((l) => level >= l).length;
export function assetManifest() {
  const img = [];
  for (const k of [...TILES.grass, ...TILES.grassAccent, ...TILES.sand, ...TILES.water, ...TILES.waterShallow, ...TILES.pave]) img.push([k, `tiles/${k}.png`]);
  for (const k of [...ROCKS, BUSH]) img.push([k, `objects/${k}.png`]);
  for (let i = 0; i < 9; i++) img.push([`tree_${i}`, `trees/tree_${i}.png`]);
  for (let i = 0; i < 6; i++) img.push([`tower_${i}`, `towers/tower_${i}.png`]);
  return img;
}
