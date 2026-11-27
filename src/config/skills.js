// Kỹ năng nhân vật + nâng tốc độ chạy. Thời gian hồi chiêu tính từ lúc kích hoạt.
export const SKILLS = {
  invincible: { name: 'Bất tử', icon: '🛡️', duration: 5, cooldown: 300 },
  phase: { name: 'Xuyên vật thể', icon: '👻', duration: 5, cooldown: 180 },
};
export const SPEED_UPGRADE = { maxLevel: 8, perLevel: 0.07, baseCost: 40, growth: 1.55 }; // +7% tốc độ mỗi cấp
export const speedUpgradeCost = (lv) => Math.round(SPEED_UPGRADE.baseCost * Math.pow(SPEED_UPGRADE.growth, lv)); // từ cấp lv lên lv+1
// DASH (Lướt): lướt nhanh theo hướng điều khiển. Nâng cấp bằng vàng như nâng tốc độ chạy; mọi thông số có giới hạn cứng để không phá cân bằng.
//  cấp 1 -> 10: hồi chiêu 30s -> 1s, quãng đường 3,2 -> 5,2 ô (đạt trần từ cấp 6; thời gian lướt cố định nên tốc độ lướt tăng theo quãng đường). Không bất tử, không xuyên vật cản.
// Cấp hiển thị 1…(maxLevel+1). Cấp 1 hồi 30s, giảm đều theo từng cấp, cấp cao nhất hồi 1s (minCooldown là sàn cứng).
export const DASH = { name: 'Lướt', icon: 'dash', duration: 0.2, baseCooldown: 30, minCooldown: 1, baseDistance: 3.2, maxDistance: 5.2, maxLevel: 9, distancePerLevel: 0.4, baseCost: 80, growth: 1.55 };
export const dashCooldown = (lv) => Math.max(DASH.minCooldown, DASH.baseCooldown - (DASH.baseCooldown - DASH.minCooldown) * Math.min(lv, DASH.maxLevel) / DASH.maxLevel);
export const dashDistance = (lv) => Math.min(DASH.maxDistance, DASH.baseDistance + DASH.distancePerLevel * lv);
export const dashUpgradeCost = (lv) => Math.round(DASH.baseCost * Math.pow(DASH.growth, lv)); // từ cấp lv lên lv+1
