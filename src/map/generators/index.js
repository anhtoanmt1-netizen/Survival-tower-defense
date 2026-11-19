import { generateForest2026 } from './forest2026.js';
// Mỗi "edition" là một phiên bản thuật toán bất biến. Map ID lưu edition để bản đồ cũ luôn tái tạo được.
export const EDITIONS = {
  2026: { defaultSize: 100, minSize: 40, maxSize: 400, generators: { FOREST: generateForest2026 } },
};
export const CURRENT_EDITION = 2026;
