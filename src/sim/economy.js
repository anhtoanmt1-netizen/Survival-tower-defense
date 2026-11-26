import { ECON } from '../config/economy.js';
export const MAX_GOLD = 9999999;
export class Economy {
  constructor(cfg = ECON) { this.cfg = cfg; this.gold = cfg.startGold; this.earned = 0; this.spent = 0; this.acc = 0; }
  add(n) { this.gold += n; this.earned += n; }
  // Đặt thẳng số vàng (chức năng nhập xu): chỉ đổi số dư, KHÔNG tính vào 'vàng kiếm được'/'đã tiêu' để thống kê và phần thưởng cuối ván không méo. Giá trị được ép về số nguyên 0..MAX_GOLD.
  set(n) { const v = Math.floor(+n); this.gold = Number.isFinite(v) ? Math.max(0, Math.min(MAX_GOLD, v)) : this.gold; }
  spend(n) { if (n > this.gold) return false; this.gold -= n; this.spent += n; return true; }
  // Chống kẹt: không còn tháp mà không đủ tiền xây => nhận vàng chậm cho tới khi đủ xây 1 tháp
  update(dt, towerCount, buildCost) {
    if (towerCount > 0 || this.gold >= buildCost) { this.acc = 0; return; }
    this.acc += dt * this.cfg.safetyIncome; const g = Math.floor(this.acc); if (g > 0) { this.acc -= g; this.add(g); }
  }
}
