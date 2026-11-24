// Tạm dừng theo LÝ DO (không phải một cờ duy nhất): game chỉ chạy tiếp khi KHÔNG còn lý do nào. Thuần logic, kiểm thử được, sẵn cho multiplayer sau này.
//  user      = nút tạm dừng thủ công      settings = đang mở Cài đặt
//  tower     = đang mở bảng tháp (nâng cấp) skill    = đang mở bảng chọn nhánh kỹ năng
// 'tower' và 'skill' chỉ tính khi người chơi bật "tự động tạm dừng khi nâng cấp"; nếu tắt, game vẫn chạy trong lúc mở bảng.
const AUTO = new Set(['tower', 'skill']);
export class PauseState {
  constructor(autoPause = () => true) { this.autoPause = autoPause; this.wanted = new Set(); }
  set(reason, on) { on ? this.wanted.add(reason) : this.wanted.delete(reason); return this.frozen; }
  toggle(reason) { return this.set(reason, !this.wanted.has(reason)); }
  get active() { const s = new Set(); for (const r of this.wanted) if (!AUTO.has(r) || this.autoPause()) s.add(r); return s; }
  has(reason) { return this.active.has(reason); }
  get frozen() { return this.active.size > 0; }
  get onlyAuto() { const a = this.active; return a.size > 0 && [...a].every((r) => AUTO.has(r)); } // chỉ đang dừng vì bảng nâng cấp -> hiện nhãn gợi ý
  get modalOpen() { return this.wanted.has('skill'); }
  clear() { this.wanted.clear(); }
}
