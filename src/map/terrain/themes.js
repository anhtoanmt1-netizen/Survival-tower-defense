// 7 chủ đề bản đồ. Mỗi chủ đề có (1) tham số chung ở đây và (2) HÀM BỐ CỤC riêng trong layouts.js (cấu trúc khác nhau chứ không chỉ khác tên).
// Mọi độ dài/số lượng được nhân theo kích thước bản đồ trong stages.js (u = size/100).
const pal = (o) => ({ grass: '#6fae5e', dirt: '#b99a62', sand: '#d9c58a', water: '#4a8fc4', tree: '#2f6b36', rock: '#8d949b', bush: '#6fb35a', ...o });
export const TERRAIN_THEMES = {
  MEADOW: { id: 'MAP_001', name: 'Green Meadow', vi: 'Đồng cỏ xanh', blurb: 'Đồng cỏ rộng, cụm đá nhỏ, bãi đất xen kẽ, đường mòn tự nhiên.', minimap: pal({}),
    biomes: { meadow: 6, forest: 1, rocky: 1, dry: 2, wet: 0 }, treeBase: 0.5, treeBelt: 2.5, rockClusters: 5, flowers: 0.9, dirt: 0.55, bushes: 0.5, pathWidth: 2.4, shallowW: 2, beach: 0.5, zones: ['oak', 'orchard', 'blossom'] },
  RIVER: { id: 'MAP_002', name: 'River Valley', vi: 'Thung lũng sông', blurb: 'Sông chạy xuyên bản đồ, hai bên là thảm cỏ, bờ cát và đá, có đoạn vách.', minimap: pal({}),
    biomes: { meadow: 4, forest: 3, rocky: 2, dry: 1, wet: 2 }, treeBase: 0.75, treeBelt: 3.5, rockClusters: 7, flowers: 0.6, dirt: 0.3, bushes: 0.7, pathWidth: 2.3, shallowW: 2, beach: 0.9, zones: ['oak', 'pine', 'autumn'] },
  HIGHLAND: { id: 'MAP_003', name: 'Rocky Highlands', vi: 'Cao nguyên đá', blurb: 'Nhiều tầng vách đá, cụm đá lớn, thảm cỏ trên đỉnh, vài vùng đất nhỏ.', minimap: pal({ grass: '#74a35f' }),
    biomes: { meadow: 3, forest: 1, rocky: 6, dry: 3, wet: 0 }, treeBase: 0.35, treeBelt: 2, rockClusters: 24, flowers: 0.35, dirt: 0.8, bushes: 0.4, pathWidth: 2.2, shallowW: 2, beach: 0.4, zones: ['pine', 'autumn'] },
  LAKE: { id: 'MAP_004', name: 'Forest Lake', vi: 'Hồ trong rừng', blurb: 'Hồ lớn lệch tâm, bờ không đều, nước nông ven bờ, rừng và đá bao quanh.', minimap: pal({}),
    biomes: { meadow: 3, forest: 5, rocky: 2, dry: 1, wet: 2 }, treeBase: 1.0, treeBelt: 4, rockClusters: 6, flowers: 0.5, dirt: 0.3, bushes: 0.8, pathWidth: 2.3, shallowW: 3, beach: 1.0, zones: ['pine', 'oak', 'bamboo', 'blossom'] },
  FALLS: { id: 'MAP_005', name: 'Waterfall Island', vi: 'Đảo thác nước', blurb: 'Cụm đảo đá, vách tiếp giáp nước, thác nước, bãi cỏ nhỏ trên đỉnh đảo.', minimap: pal({ water: '#3f86c6' }),
    biomes: { meadow: 3, forest: 2, rocky: 5, dry: 0, wet: 4 }, treeBase: 0.55, treeBelt: 2, rockClusters: 9, flowers: 0.5, dirt: 0.15, bushes: 0.6, pathWidth: 2.4, shallowW: 2, beach: 0.6, zones: ['bamboo', 'blossom', 'oak'] },
  COAST: { id: 'MAP_006', name: 'Natural Coast', vi: 'Bờ biển tự nhiên', blurb: 'Biển lớn, bờ uốn lượn, cát xen cỏ, đá lớn dọc bờ nước.', minimap: pal({ sand: '#e0cc90' }),
    biomes: { meadow: 4, forest: 2, rocky: 3, dry: 3, wet: 3 }, treeBase: 0.5, treeBelt: 2.5, rockClusters: 9, flowers: 0.6, dirt: 0.35, bushes: 0.6, pathWidth: 2.4, shallowW: 3, beach: 1.0, zones: ['oak', 'orchard', 'blossom'] },
  WILD: { id: 'MAP_007', name: 'Mixed Wilderness', vi: 'Hoang dã hỗn hợp', blurb: 'Đồng cỏ, đường đất, sông nhỏ, đá và vách núi; bố cục tự nhiên, không đối xứng.', minimap: pal({}),
    biomes: { meadow: 3, forest: 3, rocky: 3, dry: 2, wet: 2 }, treeBase: 0.7, treeBelt: 3, rockClusters: 9, flowers: 0.7, dirt: 0.5, bushes: 0.7, pathWidth: 2.3, shallowW: 2, beach: 0.8, zones: ['oak', 'pine', 'orchard', 'autumn', 'blossom', 'bamboo'] },
};
export const TERRAIN_THEME_CODES = Object.keys(TERRAIN_THEMES);
// Các cấp kiểm soát theo kích thước (100/150/200 chạy chung một hệ thống): chiều rộng, diện tích, mật độ đều được co giãn, KHÔNG kéo giãn hình.
export const sizeScale = (size) => { const u = size / 100; return { u, len: u, area: u * u, width: 1 + (u - 1) * 0.4, region: 1 + (u - 1) * 0.6 }; };
