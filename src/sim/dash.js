import { DASH, dashCooldown, dashDistance, dashUpgradeCost } from '../config/skills.js';
// Kỹ năng Dash thuần logic (không Phaser): trạng thái, hồi chiêu, nâng cấp và bước di chuyển có va chạm. Kiểm thử được bằng mô phỏng.
// Thời gian (hồi chiêu, đang lướt) chạy theo THỜI GIAN GAME: x2/x3 tốc độ game thì hồi chiêu cũng nhanh tương ứng, tạm dừng thì đứng yên.
export class DashSkill {
  constructor(cfg = DASH, { cdMul = 1 } = {}) { this.cfg = cfg; this.cdMul = cdMul; this.level = 0; this.cd = 0; this.t = 0; this.dx = 0; this.dy = 1; }
  get active() { return this.t > 0; }
  get cooldown() { return Math.round(dashCooldown(this.level) * this.cdMul); }
  get distance() { return dashDistance(this.level); }
  get speed() { return this.distance / this.cfg.duration; } // ô / giây khi đang lướt
  get maxed() { return this.level >= this.cfg.maxLevel; }
  upgradeCost(mul = 1) { return this.maxed ? Infinity : Math.round(dashUpgradeCost(this.level) * mul); }
  upgrade() { if (this.maxed) return false; this.level++; this.cd = Math.min(this.cd, this.cooldown); return true; } // hồi chiêu mới ngắn hơn áp dụng ngay cho lượt đang đếm
  can() { return !this.active && this.cd <= 0; }
  // dx,dy: hướng (sẽ chuẩn hóa). Trả về false nếu đang hồi chiêu hoặc hướng vô nghĩa.
  start(dx, dy) { if (!this.can()) return false; const l = Math.hypot(dx, dy); if (!(l > 1e-6)) return false; this.dx = dx / l; this.dy = dy / l; this.t = this.cfg.duration; this.cd = this.cooldown; return true; }
  cancel() { this.t = 0; }
  update(dt, onEnd) { if (this.cd > 0) this.cd = Math.max(0, this.cd - dt); if (this.t > 0) { this.t -= dt; if (this.t <= 0) { this.t = 0; onEnd?.(); } } }
}
// Di chuyển (dx,dy) theo từng bước nhỏ ≤ maxSub ô, tách trục (trượt dọc vật cản), dừng đúng chỗ khi va chạm: không bao giờ "nhảy xuyên" tường mỏng dù dt lớn (x3 tốc độ).
// collides(x,y) -> bool. Trả về { x, y, moved (ô đã đi), blocked }.
export function moveWithCollision(collides, x, y, dx, dy, maxSub = 0.1) {
  const len = Math.hypot(dx, dy); if (!(len > 0)) return { x, y, moved: 0, blocked: false };
  const n = Math.max(1, Math.ceil(len / maxSub)), sx = dx / n, sy = dy / n; let cx = x, cy = y, blocked = false;
  for (let i = 0; i < n; i++) {
    const okx = !sx || !collides(cx + sx, cy), oky = !sy || !collides(cx, cy + sy);
    if (okx) cx += sx; if (oky) cy += sy; if (!okx || !oky) blocked = true; if (!okx && !oky) break;
  }
  return { x: cx, y: cy, moved: Math.hypot(cx - x, cy - y), blocked };
}
