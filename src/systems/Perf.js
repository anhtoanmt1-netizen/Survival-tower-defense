import { settings } from '../config/settings.js';
import { getProfile, PerfGovernor } from '../config/performance.js';
// Điểm truy cập DUY NHẤT tới thông số hiệu năng đang hiệu lực. Các hệ thống đọc perf.p / perf.stride() mỗi khung (rẻ), không tự giữ bản sao.
class PerfSystem {
  constructor() { this.gov = new PerfGovernor(); this.frame = 0; this.p = getProfile(settings.data.perf.mode); settings.on((d, keys) => { if (keys.includes('perf')) this.refresh(); }); }
  refresh() { this.p = getProfile(settings.data.perf.mode); if (!settings.data.perf.adaptive) this.gov.reset(); }
  // Áp trần FPS lên vòng lặp Phaser đang chạy (nếu bản Phaser cho phép đổi lúc chạy); nếu không, chế độ có hiệu lực từ lần mở game kế tiếp (main.js đọc cùng giá trị khi khởi tạo).
  applyToGame(game) { const l = game?.loop; if (!l || !('fpsLimit' in l)) return false; const n = this.p.fpsLimit; l.fpsLimit = n; l.hasFpsLimit = n > 0; l._limitRate = n > 0 ? 1000 / n : 0; return true; }
  get mode() { return this.p.id; }
  get step() { return settings.data.perf.adaptive ? this.gov.step : 0; }
  // Gọi MỘT lần mỗi khung (GameScene.update). dt thật (giây), chưa nhân tốc độ game.
  tick(dt) { this.frame++; if (settings.data.perf.adaptive) this.gov.update(dt, this.p.fpsLimit || 60); }
  // true nếu khung này được phép cập nhật một hệ thống cảnh quan (độ thưa = nhịp profile + bậc điều tiết); `offset` so le để các hệ thống không dồn vào cùng một khung
  due(offset = 0) { const n = this.p.ambientStride + this.step; return n <= 1 || (this.frame + offset) % n === 0; }
  dueUi(offset = 0) { const n = this.p.uiStride + (this.step > 1 ? 1 : 0); return n <= 1 || (this.frame + offset) % n === 0; }
  // số khung bị gộp lại (để các hệ thống nhân dt bù, chuyển động vẫn đúng tốc độ)
  strideN() { return Math.max(1, this.p.ambientStride + this.step); }
}
export const perf = new PerfSystem();
