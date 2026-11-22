// Phân lớp địa hình logic (CHƯA phải hình ảnh). Bộ ghép (compose.js) chọn texture/sprite dựa trên các lớp này + hàng xóm.
export const C = { GRASS: 0, FLOWER: 1, DIRT: 2, SAND: 3, SHALLOW: 4, DEEP: 5, PAVE: 6 };      // lớp nền (mỗi ô một lớp)
export const F = { NONE: 0, CLIFF: 1, ROCK: 2, TREE: 3, BUSH: 4 };                             // vật thể/đặc điểm chiếm ô
export const CLASS_NAMES = ['grass', 'flower', 'dirt', 'sand', 'shallow', 'deep', 'pave'];
export const isWaterC = (c) => c === C.SHALLOW || c === C.DEEP;
export const BIOME = { MEADOW: 0, FOREST: 1, ROCKY: 2, DRY: 3, WET: 4 };
export const BIOME_NAMES = ['meadow', 'forest', 'rocky', 'dry', 'wet'];
