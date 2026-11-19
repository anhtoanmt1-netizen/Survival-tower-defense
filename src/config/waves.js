// Công thức đợt (phi tuyến, chỉnh được). Giai đoạn 2: dùng bản đơn giản để chơi thử; Giai đoạn 4 hoàn thiện cân bằng + giao diện đợt.
export const WAVE_SETTINGS = { totalWaves: 100, firstWaveDelay: 15, interval: 30, spawnPerSecond: 6 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function waveSpec(w) {
  const boss = w % 10 === 0;                              // mốc thử thách 10,20,...,100
  let count = Math.round(3 + 1.0 * w + 0.012 * w * w);
  const weights = {
    green: Math.max(0.1, 1 - w / 40),
    blue: w >= 4 ? clamp(w / 20, 0, 0.5) : 0,
    purple: w >= 15 ? clamp((w - 14) / 60, 0, 0.45) : 0,
    red: w >= 35 ? clamp((w - 34) / 80, 0, 0.4) : 0,
    gold: 0,
  };
  if (boss) { weights.gold = 0.25; count = Math.round(count * 1.25); }
  return { wave: w, count, boss, hpMul: 1 + 0.06 * w + 0.0015 * w * w, rewardMul: 1 + 0.04 * w, speedMul: Math.min(1.7, 1 + 0.006 * w), weights };
}
