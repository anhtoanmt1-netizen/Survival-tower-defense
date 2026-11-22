// Kiểm tra chất lượng riêng cho địa hình (bổ sung cho map/validate.js kiểm tra khả năng chơi).
import { C, F, isWaterC } from './classes.js';
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export function validateTerrain(map) {
  const { width: W, height: H, cls, feat } = map, N = W * H, errors = [], warns = [], m = {};
  // 1) không có nước bị tách rời vô nghĩa
  const seen = new Uint8Array(N); let comps = 0, tiny = 0, water = 0;
  for (let i = 0; i < N; i++) { if (!isWaterC(cls[i])) continue; water++; if (seen[i]) continue; comps++; const q = [i]; seen[i] = 1; for (let h = 0; h < q.length; h++) { const k = q[h], x = k % W, y = (k / W) | 0; for (const [dx, dy] of D4) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && isWaterC(cls[ny * W + nx]) && !seen[ny * W + nx]) { seen[ny * W + nx] = 1; q.push(ny * W + nx); } } } if (q.length < 12) tiny++; }
  if (tiny) errors.push(`Có ${tiny} vũng nước rời rạc quá nhỏ.`); m.waterRatio = water / N; m.waterComponents = comps;
  // 2) vách đúng hướng: có mặt trên (đất, không phải nước) phía bắc, chân vách phía nam không bị chặn/không phải vách khác
  let badCliff = 0, cliffs = 0; for (let i = W; i < N - W; i++) if (feat[i] === F.CLIFF) { cliffs++; if (isWaterC(cls[i - W]) || feat[i + W] === F.CLIFF || cls[i] !== C.GRASS) badCliff++; }
  if (badCliff) errors.push(`${badCliff} ô vách sai hướng/sai lớp.`); m.cliffCells = cliffs;
  // 3) không quá vuông vức: đoạn biên thẳng liên tục dài nhất của nước và của vách
  const run = (isT) => { let best = 0; for (let y = 1; y < H; y++) { let r = 0; for (let x = 0; x < W; x++) { if (isT(y * W + x) && !isT((y - 1) * W + x)) { r++; if (r > best) best = r; } else r = 0; } } for (let x = 1; x < W; x++) { let r = 0; for (let y = 0; y < H; y++) { if (isT(y * W + x) && !isT(y * W + x - 1)) { r++; if (r > best) best = r; } else r = 0; } } return best; };
  m.straightWater = run((i) => isWaterC(cls[i])); m.straightCliff = run((i) => feat[i] === F.CLIFF);
  if (m.straightWater > 0.3 * W) errors.push(`Bờ nước thẳng quá dài (${m.straightWater}).`); if (m.straightCliff > 0.34 * W) errors.push(`Vách thẳng quá dài (${m.straightCliff}).`);
  // 4) vật thể không phân bố đều như ma trận: hệ số biến thiên mật độ theo khối ~10x10
  const B = Math.max(8, Math.round(W / 10)), cnt = []; for (let by = 0; by < H; by += B) for (let bx = 0; bx < W; bx += B) { let n = 0; for (let y = by; y < Math.min(H, by + B); y++) for (let x = bx; x < Math.min(W, bx + B); x++) if (feat[y * W + x] === F.TREE || feat[y * W + x] === F.ROCK) n++; cnt.push(n); }
  const mean = cnt.reduce((a, b) => a + b, 0) / cnt.length, sd = Math.sqrt(cnt.reduce((a, b) => a + (b - mean) ** 2, 0) / cnt.length); m.objectCV = sd / Math.max(1e-6, mean); if (m.objectCV < 0.45) errors.push(`Vật thể phân bố quá đều (CV ${m.objectCV.toFixed(2)}).`);
  // 5) khả năng chơi: lõi trống, mỗi cổng có đường đất/bến đá chạm tới
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const i = (map.playerStart.y + dy) * W + map.playerStart.x + dx; if (feat[i] || isWaterC(cls[i])) { errors.push('Điểm xuất phát bị chặn.'); dy = 9; break; } }
  for (const g of map.gates) { let ok = false; for (let dy = -3; dy <= 3 && !ok; dy++) for (let dx = -3; dx <= 3; dx++) { const x = g.x + dx, y = g.y + dy; if (x >= 0 && y >= 0 && x < W && y < H && (cls[y * W + x] === C.DIRT || cls[y * W + x] === C.PAVE)) { ok = true; break; } } if (!ok) errors.push(`Cổng ${g.name} không có đường dẫn.`); }
  // 6) đường đi không xuyên hồ/vách: ô đường (DIRT/PAVE) không được là vách; PAVE chỉ nằm cạnh nước (bến)
  m.ok = !errors.length; return { ok: !errors.length, errors, warns, metrics: m };
}
