import { generateForest2026 } from './forest2026.js';
import { generateForest2027 } from './forest2027.js';
// Mỗi "edition" là một phiên bản thuật toán bất biến. Map ID lưu edition để bản đồ cũ luôn tái tạo được.
export const EDITIONS = {
  2026: { defaultSize: 100, minSize: 40, maxSize: 400, generators: { FOREST: generateForest2026 } }, // bất biến: chỉ để Map ID cũ còn tái tạo được
  2027: { defaultSize: 100, minSize: 40, maxSize: 400, generators: { FOREST: generateForest2027 } }, // bố cục có chủ đề (mặc định cho bản đồ mới)
};
export const CURRENT_EDITION = 2027;
