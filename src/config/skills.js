// Kỹ năng nhân vật + nâng tốc độ chạy. Thời gian hồi chiêu tính từ lúc kích hoạt.
export const SKILLS = {
  invincible: { name: 'Bất tử', icon: '🛡️', duration: 5, cooldown: 300 },
  phase: { name: 'Xuyên vật thể', icon: '👻', duration: 5, cooldown: 180 },
};
export const SPEED_UPGRADE = { maxLevel: 8, perLevel: 0.07, baseCost: 40, growth: 1.55 }; // +7% tốc độ mỗi cấp
export const speedUpgradeCost = (lv) => Math.round(SPEED_UPGRADE.baseCost * Math.pow(SPEED_UPGRADE.growth, lv)); // từ cấp lv lên lv+1
