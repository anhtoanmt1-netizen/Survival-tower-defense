// Bảng kinh tế (giá trị khởi đầu để thử nghiệm – chỉnh ở đây, không cần sửa code).
export const ECON = {
  startGold: 120,
  buildCost: 60,          // giá xây 1 tháp (2x2 ô) CỐ ĐỊNH (không tăng theo số tháp/thời gian); độ khó cao có thể ghi đè ở config/difficulty.js
  sellRefund: 0.6,        // hoàn 60% tổng vàng đã đầu tư
  wallCost: 5,            // giá xây 1 TƯỜNG (chiếm 2x2 ô) – cố định ở mọi độ khó; xây tức thì
  footprint: { tower: 2, wall: 2 }, // cạnh (số ô) của khối chiếm chỗ: tháp 2x2, tường 2x2. (x,y) của công trình = ô TRÊN-TRÁI
  buildTime: 2,           // giây
  upgradeCosts: [45, 70], // LV1->2, LV2->3; các cấp sau theo upgradeGrowth
  upgradeGrowth: 1.36,
  resetBranchCost: 40,    // phí đặt lại lựa chọn nhánh của một tháp
  safetyIncome: 3,        // vàng/giây chỉ khi KHÔNG còn tháp nào và không đủ tiền xây (chống kẹt không thể chơi tiếp)
};
export function upgradeCost(level) { // chi phí nâng từ `level` lên level+1
  const n = ECON.upgradeCosts.length;
  return level <= n ? ECON.upgradeCosts[level - 1] : Math.round(ECON.upgradeCosts[n - 1] * Math.pow(ECON.upgradeGrowth, level - n));
}
