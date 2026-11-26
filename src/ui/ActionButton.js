import Phaser from 'phaser';
import { FONT } from '../config/ui.js';
// Nút tròn có khung viền vàng, mặt màu, bóng đổ. Trạng thái: bình thường / nhấn (thu nhỏ) / kích hoạt (vòng sáng nhấp nháy) /
// hồi chiêu (quạt tối + đếm giây) / vô hiệu (mờ). Dùng cho XÂY, kỹ năng, nâng tốc độ.
export class ActionButton {
  // iconKey: texture icon vector (ui_icon_*) — đồng bộ với bộ icon DOM; icon: ký tự (dự phòng)
  constructor(scene, { color, icon = '', iconKey = null, onTap, depth = 1000, iconSize = 22 }) {
    this.scene = scene; this.r = 30; this.x = 0; this.y = 0; this.base = 1; this.press = 1; this.color = color; this.onTap = onTap; this.hit = { x: 0, y: 0, r: 30 };
    const A = (o) => o.setScrollFactor(0);
    this.shadow = A(scene.add.image(0, 0, 'ui_face').setTint(0x000000).setAlpha(0.4).setDepth(depth - 1));
    this.glow = A(scene.add.image(0, 0, 'ui_ring').setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 3).setAlpha(0).setTint(0xfff08a));
    this.face = A(scene.add.image(0, 0, 'ui_face').setTint(color).setDepth(depth).setInteractive());
    this.rim = A(scene.add.image(0, 0, 'ui_rim').setDepth(depth + 1));
    this.cd = A(scene.add.graphics().setDepth(depth + 2));
    this.ico = A(iconKey ? scene.add.image(0, 0, iconKey).setDepth(depth + 4) : scene.add.text(0, 0, icon, { fontFamily: FONT, fontSize: iconSize + 'px', fontStyle: '700', color: '#fff' }).setOrigin(0.5).setDepth(depth + 4)); this.isImg = !!iconKey;
    this.badge = A(scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '10px', fontStyle: '800', color: '#2b1f06', backgroundColor: '#f4d36b', padding: { x: 4, y: 1 } }).setOrigin(0.5).setDepth(depth + 6).setVisible(false));
    this.sub = A(scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '10px', fontStyle: '800', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(depth + 5));
    this.parts = [this.shadow, this.glow, this.face, this.rim, this.cd, this.ico, this.sub, this.badge];
    this.face.on('pointerdown', () => { this.press = 0.9; this.onTap?.(); }); const up = () => { this.press = 1; }; this.face.on('pointerup', up); this.face.on('pointerout', up); this.face.on('pointerupoutside', up);
  }
  layout(x, y, r, iconDy = -6, subDy = 14) {
    Object.assign(this, { x, y, r, iconDy, subDy }); this.hit = { x, y, r }; this.face.setInteractive(new Phaser.Geom.Circle(this.face.width / 2, this.face.height / 2, this.face.width / 2 - 4), Phaser.Geom.Circle.Contains);
    this.apply();
  }
  apply() {
    const d = this.r * 2 * this.press;
    this.shadow.setPosition(this.x + 1, this.y + 4).setDisplaySize(d, d); this.face.setPosition(this.x, this.y).setDisplaySize(d, d); this.rim.setPosition(this.x, this.y).setDisplaySize(d, d);
    this.glow.setPosition(this.x, this.y).setDisplaySize(d * 1.3, d * 1.3); this.ico.setPosition(this.x, this.y + this.iconDy * this.press); if (this.isImg) this.ico.setDisplaySize(this.r * 1.08 * this.press, this.r * 1.08 * this.press); else this.ico.setScale(this.press); this.badge.setPosition(this.x + this.r * 0.72, this.y - this.r * 0.72); this.sub.setPosition(this.x, this.y + this.subDy * this.press);
  }
  // s: {alpha, active, activeFrac, cd, cdFrac, sub, subColor, tint}
  setState(s) {
    if (this.press > 1) this.press = Math.max(1, this.press - 0.012); // nảy nhẹ khi vừa sẵn sàng (đặt press > 1 để kích hoạt)
    this.apply(); const a = s.alpha ?? 1; for (const p of [this.face, this.rim, this.ico, this.shadow]) p.setAlpha(p === this.shadow ? 0.4 * a : a);
    if (s.tint !== undefined) this.face.setTint(s.tint); else this.face.setTint(this.color);
    this.sub.setText(s.sub ?? '').setColor(s.subColor ?? '#ffffff'); this.cd.clear();
    if (s.active) { this.glow.setAlpha(0.55 + 0.35 * Math.sin(this.scene.time.now / 110)); this.cd.lineStyle(5, 0xfff08a, 1).beginPath().arc(this.x, this.y, this.r + 1, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (s.activeFrac ?? 1), false).strokePath(); }
    else this.glow.setAlpha(s.ready ? 0.22 + 0.18 * Math.sin(this.scene.time.now / 300) : 0);
    if (s.cd > 0) { this.cd.fillStyle(0x000000, 0.62).beginPath().slice(this.x, this.y, this.r - 4, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * s.cdFrac, false).fillPath(); }
  }
  setBadge(t) { this.badge.setText(t || '').setVisible(!!t && this.parts[0].visible); return this; }
  setVisible(v) { for (const p of this.parts) p.setVisible(v); return this; }
}
