// Bảng kinh tế (giá trị khởi đầu để thử nghiệm – chỉnh ở đây, không cần sửa code).
export const ECON = {
  startGold: 120,
  buildCost: 60,          // tháp cấp 1
  buildCostGrowth: 0.08,  // mỗi tháp đang có làm tháp kế tiếp đắt thêm 8% (tránh xây ồ ạt đầu game)
  sellRefund: 0.6,        // hoàn 60% tổng vàng đã đầu tư
  buildTime: 2,           // giây
  upgradeCosts: [45, 70], // LV1->2, LV2->3; các cấp sau theo upgradeGrowth
  upgradeGrowth: 1.42,
  resetBranchCost: 40,    // phí đặt lại lựa chọn nhánh của một tháp
  safetyIncome: 3,        // vàng/giây chỉ khi KHÔNG còn tháp nào và không đủ tiền xây (chống kẹt không thể chơi tiếp)
};
export function upgradeCost(level) { // chi phí nâng từ `level` lên level+1
  const n = ECON.upgradeCosts.length;
  return level <= n ? ECON.upgradeCosts[level - 1] : Math.round(ECON.upgradeCosts[n - 1] * Math.pow(ECON.upgradeGrowth, level - n));
}
