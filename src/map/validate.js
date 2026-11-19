import { T, isBlocking, isBuildableTerrain } from './tiles.js';
import { floodReach, wideMask } from './analysis.js';
export const LIMITS = { maxBlockedRatio: 0.45, minBuildableRatio: 0.3, maxNarrowRatio: 0.08 };
export function validateMap(m) {
  const { width: W, height: H, tiles } = m, errors = [], N = W * H;
  if (tiles.length !== N) errors.push('Kích thước mảng tile không khớp.');
  const count = new Array(6).fill(0); let open = 0, buildable = 0;
  for (let i = 0; i < N; i++) { count[tiles[i]]++; if (!isBlocking(tiles[i])) open++; if (isBuildableTerrain(tiles[i])) buildable++; }
  const s = m.playerStart;
  const reach = floodReach(tiles, W, H, s.x, s.y);
  let reached = 0; for (let i = 0; i < N; i++) reached += reach[i];
  if (isBlocking(tiles[s.y * W + s.x])) errors.push('Điểm xuất phát bị chặn.');
  if (reached !== open) errors.push(`Có ${open - reached} ô đi được nhưng bị cô lập.`);
  if (m.gates.length !== 8) errors.push('Phải có đúng 8 cổng.');
  for (const g of m.gates) if (!reach[g.y * W + g.x]) errors.push(`Cổng ${g.name} không có đường tới trung tâm.`);
  const blockedRatio = 1 - open / N; if (blockedRatio > LIMITS.maxBlockedRatio) errors.push(`Vật cản quá dày (${(blockedRatio * 100).toFixed(1)}%).`);
  if (buildable / N < LIMITS.minBuildableRatio) errors.push('Quá ít ô có thể xây tháp.');
  const wide = wideMask(tiles, W, H); let narrow = 0; for (let i = 0; i < N; i++) if (!isBlocking(tiles[i]) && !wide[i]) narrow++;
  const narrowRatio = narrow / open; if (narrowRatio > LIMITS.maxNarrowRatio) errors.push(`Quá nhiều lối hẹp (${(narrowRatio * 100).toFixed(1)}%).`);
  return { ok: errors.length === 0, errors, stats: { tree: count[T.TREE] / N, rock: count[T.ROCK] / N, river: count[T.RIVER] / N, bush: count[T.BUSH] / N, dirt: count[T.DIRT] / N, blockedRatio, buildableRatio: buildable / N, narrowRatio } };
}
