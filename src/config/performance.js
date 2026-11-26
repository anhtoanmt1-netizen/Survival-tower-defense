// BA CHẾ ĐỘ HIỆU NĂNG. Chỉ đổi CÁCH XỬ LÝ (tần suất cập nhật, số hiệu ứng phụ đồng thời, giới hạn khung hình);
// gameplay (quái, tháp, kỹ năng, kinh tế, bản đồ) giống hệt ở cả ba chế độ. Mọi con số nằm ở đây, không rải trong code.
//   fpsLimit    : trần khung hình (0 = theo màn hình)      fxMaxLive : số hạt/vòng sáng tối đa cùng lúc
//   ambientStride: cứ N khung mới cập nhật một lần cỏ/nước/lá (cảnh quan vẫn chuyển động, chỉ thưa nhịp cập nhật)
//   grassTufts  : số cụm cỏ tối đa trong khung nhìn      water/leaf : hệ số số lượng hiệu ứng nước / lá rơi
//   dust        : số hạt bụi mỗi bước chân               ghosts     : số bóng ảo ảnh khi Dash
//   uiStride    : cứ N khung mới vẽ lại lớp minimap/HUD  hairStride : nhịp cập nhật chuyển động tóc
export const PERF_MODES = ['saver', 'balanced', 'high'];
export const DEFAULT_PERF_MODE = 'balanced';
export const PERF_PROFILES = {
  saver:    { id: 'saver',    name: 'Tiết kiệm', icon: 'leaf',  blurb: 'Mát máy, tiết kiệm pin. Hiệu ứng phụ thưa nhịp hơn.',      fpsLimit: 30, fxMaxLive: 90,  ambientStride: 3, grassTufts: 240, water: 0.45, leaf: 0.4, dust: 1, ghosts: 3, uiStride: 3, hairStride: 2, grassCells: 900 },
  balanced: { id: 'balanced', name: 'Cân bằng', icon: 'scale', blurb: 'Mượt và đẹp, nhiệt độ vừa phải. Khuyến nghị cho đa số máy.', fpsLimit: 60, fxMaxLive: 170, ambientStride: 2, grassTufts: 420, water: 0.75, leaf: 0.7, dust: 2, ghosts: 5, uiStride: 2, hairStride: 1, grassCells: 1400 },
  high:     { id: 'high',     name: 'Cao cấp',   icon: 'sparkle', blurb: 'Đầy đủ chi tiết, hiệu ứng và độ mượt tối đa.',            fpsLimit: 0,  fxMaxLive: 260, ambientStride: 1, grassTufts: 640, water: 1,    leaf: 1,   dust: 3, ghosts: 7, uiStride: 1, hairStride: 1, grassCells: 2000 },
};
export const getProfile = (mode) => PERF_PROFILES[mode] || PERF_PROFILES[DEFAULT_PERF_MODE];
// Gợi ý chế độ theo thiết bị (người chơi luôn có thể đổi tay). hw: {cores, memGb, mobile}
export function recommendMode({ cores = 4, memGb = 4, mobile = true } = {}) {
  if (!mobile && cores >= 8) return 'high';
  if (memGb <= 2 || cores <= 4) return 'saver';
  if (memGb >= 8 && cores >= 8) return 'high';
  return 'balanced';
}
// Bộ điều tiết tự động (tùy chọn, bật mặc định): nếu khung hình kéo dài dưới ngưỡng thì GIÃN NHỊP cập nhật hiệu ứng phụ (cỏ/nước/lá/minimap) theo bậc 0..2;
// khi ổn định lại thì từ từ trả về. Không bao giờ đổi gameplay, không tắt hiệu ứng, không hạ chế độ người chơi đã chọn.
export const GOVERNOR = { window: 4, lowFps: 40, highFps: 55, maxStep: 2, cooldown: 8 };
export class PerfGovernor {
  constructor(cfg = GOVERNOR) { this.cfg = cfg; this.step = 0; this.acc = 0; this.frames = 0; this.hold = 0; }
  // dt: giây của khung vừa rồi; target: FPS mục tiêu của chế độ (30 hoặc 60). Trả về bậc hiện tại.
  update(dt, target = 60) {
    const c = this.cfg; if (!(dt > 0) || dt > 0.5) return this.step; // khung bất thường (chuyển tab, tạm dừng): bỏ qua
    this.acc += dt; this.frames++; this.hold = Math.max(0, this.hold - dt);
    if (this.acc >= c.window) {
      const fps = this.frames / this.acc, lo = Math.min(c.lowFps, target * 0.8), hi = Math.min(c.highFps, target * 0.92);
      if (fps < lo && this.step < c.maxStep && this.hold <= 0) { this.step++; this.hold = c.cooldown; } else if (fps > hi && this.step > 0 && this.hold <= 0) { this.step--; this.hold = c.cooldown; }
      this.acc = 0; this.frames = 0;
    }
    return this.step;
  }
  reset() { this.step = 0; this.acc = 0; this.frames = 0; this.hold = 0; }
}
