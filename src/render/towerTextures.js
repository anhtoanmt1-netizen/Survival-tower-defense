import { make, rect, disc } from './textures.js';
import { createFlameTextures } from './flameFx.js';
// Texture hiệu ứng + mũi tên + giàn giáo xây dựng (hình tháp thật lấy từ Tower.png, nạp ở GameScene.preload).
export function createFxTextures(scene) {
  createFlameTextures(scene);
  make(scene, 'tower_scaffold', 52, 64, (c) => {
    for (const x of [6, 42]) rect(c, '#9b7a50', x, 14, 4, 48);
    for (const y of [22, 36, 50]) rect(c, '#b08d5e', 6, y, 40, 3);
    rect(c, '#7a5f3c', 6, 26, 40, 1); rect(c, 'rgba(0,0,0,.25)', 4, 58, 44, 5);
  });
  const arrow = (key, head, glow) => make(scene, key, 16, 5, (c) => {
    rect(c, '#e8e8e8', 0, 1, 3, 3); rect(c, '#c9a26b', 2, 2, 10, 1); rect(c, head, 11, 1, 4, 3); rect(c, head, 15, 2, 1, 1);
    if (glow) { rect(c, glow, 0, 2, 2, 1); rect(c, glow, 5, 1, 2, 1); }
  });
  arrow('arrow_arrow', '#cfd6dc'); arrow('arrow_ice', '#7fd4ff', '#bfeaff'); arrow('arrow_fire', '#ff7a2a', '#ffd24a');
  make(scene, 'fx_dot', 6, 6, (c) => disc(c, '#ffffff', 3, 3, 2));
  make(scene, 'fx_ring', 32, 32, (c) => { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(16, 16, 14, 0, 6.2832); c.stroke(); });
  make(scene, 'fx_glow', 64, 64, (c) => { c.imageSmoothingEnabled = true; const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  make(scene, 'fx_spark', 16, 16, (c) => { c.imageSmoothingEnabled = true; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(8, 0); c.lineTo(10, 6); c.lineTo(16, 8); c.lineTo(10, 10); c.lineTo(8, 16); c.lineTo(6, 10); c.lineTo(0, 8); c.lineTo(6, 6); c.closePath(); c.fill(); });
  make(scene, 'fx_leaf', 8, 6, (c) => { c.imageSmoothingEnabled = true; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(4, 3, 3.6, 2.2, 0.5, 0, 6.2832); c.fill(); });
  make(scene, 'fx_shadow', 64, 32, (c) => { c.imageSmoothingEnabled = true; c.save(); c.scale(1, 0.5); const g = c.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(20,28,16,.9)'); g.addColorStop(0.6, 'rgba(20,28,16,.45)'); g.addColorStop(1, 'rgba(20,28,16,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); c.restore(); });
}
