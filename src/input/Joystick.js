import Phaser from 'phaser';
import { safeInsets } from '../ui/safeArea.js';
// Joystick ảo kiểu game mobile chuyên nghiệp.
//  - NỔI: chạm bất kỳ đâu ở nửa dưới-trái màn hình (ngoài nút/bảng) là đế joystick xuất hiện ngay dưới ngón tay → không phải "mò" đúng vị trí cố định. Chạm gần vị trí nghỉ thì dùng luôn vị trí nghỉ.
//  - THEO NGÓN: kéo vượt bán kính thì đế trượt theo ngón (đổi hướng tức thì, không phải kéo ngược cả quãng) nhưng luôn nằm trong màn hình.
//  - VÙNG CHẾT nhỏ (8%) rồi chuẩn hóa lại 0..1: hết rung nhẹ khi nhấc/để ngón, độ nhạy tuyến tính; hướng tính theo góc nên không giật khi qua tâm.
//  - Theo dõi theo pointer.id → dùng đồng thời với ngón thứ hai (nút kỹ năng, kéo bản đồ). Khi thả: đế trượt êm về vị trí nghỉ và mờ đi.
// Phản hồi: vec được cập nhật NGAY trong sự kiện pointer (không chờ khung kế); GameScene đọc vec mỗi khung.
const DEAD = 0.08, FOLLOW = 1.0, REST_ALPHA = 0.5;
export class Joystick {
  constructor(scene) {
    this.scene = scene; this.vec = new Phaser.Math.Vector2(); this.id = null; this.R = 58; this.rx = 0; this.ry = 0; this.cx = 0; this.cy = 0; this.u = 1;
    this.base = scene.add.image(0, 0, 'ui_joy_base').setScrollFactor(0).setDepth(1000).setAlpha(REST_ALPHA);
    this.knob = scene.add.image(0, 0, 'ui_knob').setScrollFactor(0).setDepth(1001).setAlpha(REST_ALPHA + 0.15);
    scene.input.on('pointerdown', this.down, this); scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.up, this); scene.input.on('pointerupoutside', this.up, this);
    this.layout();
  }
  layout(u = 1) {
    this.u = u; const { width, height } = this.scene.scale, ins = safeInsets(); this.R = 58 * u;
    this.rx = ins.left + 28 + this.R; this.ry = height - ins.bottom - 28 - this.R; this.W = width; this.H = height; this.ins = ins;
    if (this.id === null) { this.cx = this.rx; this.cy = this.ry; } this.paint();
  }
  // vùng "nổi": nửa trái, từ 38% chiều cao xuống đáy (không phủ HUD ở trên); nút/bảng khác được UIScene loại trừ qua hitsButtons
  inFloatZone(p) { return p.x <= Math.max(this.W * 0.5, this.rx + this.R * 2) && p.y >= this.H * 0.38; }
  contains(p) { return Math.hypot(p.x - this.rx, p.y - this.ry) <= this.R * 1.8 || this.inFloatZone(p); }
  ownsPointer(p) { return this.id === p.id || (this.id === null && this.contains(p)); }
  down(p) {
    if (this.id !== null || !this.contains(p) || this.scene.hitsButtons?.(p)) return;
    this.id = p.id; const nearRest = Math.hypot(p.x - this.rx, p.y - this.ry) <= this.R * 1.2;
    if (nearRest) { this.cx = this.rx; this.cy = this.ry; } else { this.cx = p.x; this.cy = p.y; this.clampCenter(); }
    this.base.setAlpha(1); this.apply(p);
  }
  move(p) { if (p.id === this.id) this.apply(p); }
  up(p) { if (p.id !== this.id) return; this.id = null; this.vec.set(0, 0); this.knob.clearTint(); this.paint(); }
  clampCenter() { const m = this.R * 1.05 + 6, i = this.ins; this.cx = Phaser.Math.Clamp(this.cx, i.left + m, Math.max(i.left + m, this.W * 0.55)); this.cy = Phaser.Math.Clamp(this.cy, this.H * 0.38 + m * 0.5, this.H - i.bottom - m); }
  apply(p) {
    let dx = p.x - this.cx, dy = p.y - this.cy, d = Math.hypot(dx, dy); const R = this.R;
    if (d > R * FOLLOW) { const ex = d - R * FOLLOW; this.cx += dx / d * ex; this.cy += dy / d * ex; this.clampCenter(); dx = p.x - this.cx; dy = p.y - this.cy; d = Math.hypot(dx, dy); } // đế trượt theo ngón
    const k = Math.min(1, d / R), m = k <= DEAD ? 0 : (k - DEAD) / (1 - DEAD), ux = d > 1e-6 ? dx / d : 0, uy = d > 1e-6 ? dy / d : 0, sd = Math.min(d, R);
    this.vec.set(ux * m, uy * m); this.knob.setTint(0xfff2c0); this.paint(ux * sd, uy * sd);
  }
  paint(ox = 0, oy = 0) {
    const R = this.R, act = this.id !== null; this.base.setPosition(this.cx, this.cy).setDisplaySize(R * 2.1, R * 2.1).setAlpha(act ? 1 : REST_ALPHA);
    this.knob.setPosition(this.cx + ox, this.cy + oy).setDisplaySize(R * 0.82, R * 0.82).setAlpha(act ? 1 : REST_ALPHA + 0.15);
  }
  // trượt êm về vị trí nghỉ sau khi thả (dt thực, giây)
  update(dt) {
    if (this.id !== null) return; const dx = this.rx - this.cx, dy = this.ry - this.cy; if (Math.abs(dx) + Math.abs(dy) < 0.5) { if (dx || dy) { this.cx = this.rx; this.cy = this.ry; this.paint(); } return; }
    const k = 1 - Math.exp(-dt * 14); this.cx += dx * k; this.cy += dy * k; this.paint();
  }
}
