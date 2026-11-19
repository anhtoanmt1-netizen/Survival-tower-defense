import { make, rect, disc } from './textures.js';
// Tháp cung tên (32x48, gốc ở đáy-giữa ô), cung xoay, mũi tên 3 loại, hiệu ứng.
export function createTowerTextures(scene) {
  make(scene, 'tower_base', 32, 48, (c) => {
    rect(c, 'rgba(0,0,0,.3)', 2, 42, 28, 5);
    rect(c, '#8f969c', 6, 22, 20, 22); rect(c, '#6f767c', 22, 22, 4, 22); rect(c, '#a7aeb5', 6, 22, 2, 22);
    for (let y = 26; y < 44; y += 6) rect(c, '#7a8187', 6, y, 20, 1);
    for (let y = 29; y < 44; y += 6) { rect(c, '#7a8187', 12, y, 1, 3); rect(c, '#7a8187', 19, y - 6 > 22 ? y - 6 : y, 1, 3); }
    rect(c, '#4a3524', 13, 34, 6, 10); rect(c, '#4a3524', 14, 32, 4, 2); rect(c, '#2e2016', 17, 36, 1, 8);
    rect(c, '#9aa1a8', 4, 17, 24, 6); for (const x of [4, 10, 16, 22]) rect(c, '#b4bbc2', x, 13, 5, 5);
    rect(c, '#6b4f33', 5, 19, 22, 3);
    rect(c, '#f2c79b', 13, 9, 6, 6); rect(c, '#222', 14, 11, 1, 1); rect(c, '#222', 17, 11, 1, 1); rect(c, '#4a7c3a', 12, 15, 8, 5); rect(c, '#e3b94f', 11, 8, 10, 2); rect(c, '#e3b94f', 13, 6, 6, 3);
  });
  make(scene, 'tower_scaffold', 32, 48, (c) => {
    for (const x of [3, 26]) rect(c, '#9b7a50', x, 18, 3, 28);
    for (const y of [22, 31, 40]) rect(c, '#b08d5e', 3, y, 26, 2);
    rect(c, '#7a5f3c', 3, 24, 26, 1); rect(c, 'rgba(0,0,0,.25)', 2, 44, 28, 3);
  });
  make(scene, 'bow', 16, 16, (c) => {
    for (let y = 1; y <= 14; y++) { const x = Math.round(11 - ((y - 7.5) * (y - 7.5)) / 6); rect(c, '#8a5a2b', x, y, 2, 1); }
    rect(c, '#e8e0c8', 4, 2, 1, 12); rect(c, '#c9a26b', 4, 7, 10, 1); rect(c, '#cfd6dc', 13, 6, 3, 3);
  });
  const arrow = (key, head, glow) => make(scene, key, 16, 5, (c) => {
    rect(c, '#e8e8e8', 0, 1, 3, 3); rect(c, '#c9a26b', 2, 2, 10, 1); rect(c, head, 11, 1, 4, 3); rect(c, head, 15, 2, 1, 1);
    if (glow) { rect(c, glow, 0, 2, 2, 1); rect(c, glow, 5, 1, 2, 1); }
  });
  arrow('arrow_arrow', '#cfd6dc'); arrow('arrow_ice', '#7fd4ff', '#bfeaff'); arrow('arrow_fire', '#ff7a2a', '#ffd24a');
  make(scene, 'fx_dot', 6, 6, (c) => disc(c, '#ffffff', 3, 3, 2));
  make(scene, 'fx_ring', 32, 32, (c) => { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(16, 16, 14, 0, 6.2832); c.stroke(); });
}
