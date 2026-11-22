import { generateForest2026 } from './forest2026.js';
import { generateForest2027 } from './forest2027.js';
import { TERRAIN_GENERATORS } from '../terrain/generate.js';
// Mỗi "edition" là một phiên bản thuật toán bất biến. Map ID lưu edition để bản đồ cũ luôn tái tạo được.
export const EDITIONS = {
  2026: { defaultSize: 100, minSize: 40, maxSize: 400, generators: { FOREST: generateForest2026 } }, // bất biến: chỉ để Map ID cũ còn tái tạo được
  2027: { defaultSize: 100, minSize: 40, maxSize: 400, generators: { FOREST: generateForest2027 } }, // bố cục có chủ đề (mặc định cho bản đồ mới)
  2028: { defaultSize: 100, minSize: 40, maxSize: 400, generators: TERRAIN_GENERATORS }, // địa hình theo sprite sheet mới: 7 chủ đề, autoterrain, sông/hồ/vách/thác
};
export const CURRENT_EDITION = 2028;
