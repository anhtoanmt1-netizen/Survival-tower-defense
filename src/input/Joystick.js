import Phaser from 'phaser';
import { safeInsets } from '../ui/safeArea.js';
// Joystick ảo cố định ở góc dưới-trái. Theo dõi theo pointer.id nên dùng được đồng thời với ngón tay thứ hai (đa điểm).
// Đế và núm là texture (khung vàng, vạch hướng); núm sáng lên khi đang kéo. Kích thước co theo màn hình (đặc biệt chế độ ngang).
export class Joystick {
  constructor(scene) {
    this.scene = scene; this.vec = new Phaser.Math.Vector2(); this.id = null; this.R = 58; this.cx = 0; this.cy = 0;
    this.base = scene.add.image(0, 0, 'ui_joy_base').setScrollFactor(0).setDepth(1000);
    this.knob = scene.add.image(0, 0, 'ui_knob').setScrollFactor(0).setDepth(1001);
    scene.input.on('pointerdown', this.down, this); scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.up, this); scene.input.on('pointerupoutside', this.up, this);
    this.layout();
  }
  layout(u = 1) {
    const { height } = this.scene.scale, ins = safeInsets(); this.R = 58 * u;
    this.cx = ins.left + 28 + this.R; this.cy = height - ins.bottom - 28 - this.R;
    this.base.setPosition(this.cx, this.cy).setDisplaySize(this.R * 2.1, this.R * 2.1); this.knob.setPosition(this.cx, this.cy).setDisplaySize(this.R * 0.95, this.R * 0.95);
  }
  contains(p) { return Math.hypot(p.x - this.cx, p.y - this.cy) <= this.R * 1.8; }
  ownsPointer(p) { return this.id === p.id || this.contains(p); }
  down(p) { if (this.id === null && this.contains(p)) { this.id = p.id; this.apply(p); } }
  move(p) { if (p.id === this.id) this.apply(p); }
  up(p) { if (p.id !== this.id) return; this.id = null; this.vec.set(0, 0); this.knob.setPosition(this.cx, this.cy).clearTint().setAlpha(1); this.base.setAlpha(1); }
  apply(p) {
    let dx = p.x - this.cx, dy = p.y - this.cy; const d = Math.hypot(dx, dy), max = this.R;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    this.knob.setPosition(this.cx + dx, this.cy + dy).setTint(0xfff2b0); this.base.setAlpha(1); this.vec.set(dx / max, dy / max);
  }
}
