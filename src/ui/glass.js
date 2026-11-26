// Khung "kính" Modern Fantasy cho Phaser Graphics: bóng đổ mềm, thân tối chuyển sắc 2 lớp, vệt sáng trên đầu, viền màu nhấn + viền sáng mảnh bên trong.
// Chỉ gọi khi bố cục/trạng thái đổi (không mỗi khung) nên không tốn hiệu năng. g: Phaser.GameObjects.Graphics.
export function glassPanel(g, x, y, w, h, r, { accent = 0xe0b13a, body = 0x14221b, alpha = 0.94, hot = false, shadow = true, gloss = 0.1 } = {}) {
  if (shadow) g.fillStyle(0x000000, 0.28).fillRoundedRect(x - 2, y + 3, w + 4, h + 3, r + 2);
  g.fillStyle(body, alpha).fillRoundedRect(x, y, w, h, r);
  g.fillStyle(0xffffff, hot ? gloss * 1.8 : gloss).fillRoundedRect(x + 2, y + 2, w - 4, Math.max(8, h * 0.42), { tl: Math.max(2, r - 2), tr: Math.max(2, r - 2), bl: 4, br: 4 });
  g.fillStyle(0x000000, 0.16).fillRoundedRect(x + 2, y + h * 0.62, w - 4, h * 0.38 - 2, { tl: 2, tr: 2, bl: Math.max(2, r - 2), br: Math.max(2, r - 2) });
  g.lineStyle(2, accent, hot ? 1 : 0.9).strokeRoundedRect(x, y, w, h, r);
  g.lineStyle(1, 0xffffff, 0.16).strokeRoundedRect(x + 2.5, y + 2.5, w - 5, h - 5, Math.max(1, r - 2.5));
  return g;
}
