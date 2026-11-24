import { ECON } from './economy.js';
import { WAVE_SETTINGS } from './waves.js';
import { MONSTER_SETTINGS } from './slimes.js';
import { GAME_CONFIG } from './gameConfig.js';
// Toàn bộ thông số độ khó ở MỘT nơi. Mọi hệ thống (đợt, quái, tháp, kinh tế, kỹ năng) đọc từ đây.
// Dễ = hành vi cũ của game nhưng máu quái ×1,5. Các cấp còn lại tăng mạnh dần.
//   hpMul/speedMul/countMul : nhân lên công thức đợt (config/waves.js)      tierShift: quái mạnh xuất hiện sớm hơn N đợt
//   bossHpMul   : nhân thêm máu cho slime vàng (mốc thử thách)               speedCap: trần hệ số tốc độ quái
//   rewardMul   : vàng nhận khi diệt quái     towerDamageMul/towerRateMul: sức mạnh tháp
//   buildCost   : giá xây tháp CỐ ĐỊNH         upgradeMul: nhân giá nâng cấp tháp + nâng tốc độ chạy
//   contactDamage: sát thương quái chạm người  skillCdMul: nhân thời gian hồi kỹ năng
const BASE = {
  hpMul: 1, speedMul: 1, countMul: 1, tierShift: 0, bossHpMul: 1, speedCap: 2.2,
  rewardMul: 1, towerDamageMul: 1, towerRateMul: 1,
  startGold: ECON.startGold, buildCost: ECON.buildCost, upgradeMul: 1, sellRefund: ECON.sellRefund, resetCost: ECON.resetBranchCost, safetyIncome: ECON.safetyIncome,
  firstWaveDelay: WAVE_SETTINGS.firstWaveDelay, waveInterval: WAVE_SETTINGS.interval, spawnPerSecond: WAVE_SETTINGS.spawnPerSecond, maxActive: MONSTER_SETTINGS.maxActive,
  playerHp: GAME_CONFIG.player.hp, contactDamage: MONSTER_SETTINGS.contactDamage, skillCdMul: 1,
};
// Trung tính: dùng làm mặc định cho kiểm thử mô phỏng (không đổi gì so với công thức gốc).
export const NEUTRAL = Object.freeze({ id: 'neutral', name: 'Gốc', ...BASE });
const mk = (id, level, name, en, color, icon, blurb, o) => Object.freeze({ ...BASE, id, level, name, en, color, icon, blurb, ...o });
export const DIFFICULTIES = {
  easy: mk('easy', 1, 'Dễ', 'Easy', '#7ddc7d', '🌱', 'Nhịp chơi hiện tại, quái trâu hơn 1,5 lần.', { hpMul: 1.5 }),
  normal: mk('normal', 2, 'Thường', 'Normal', '#5ab4f0', '⚔️', 'Quái trâu và đông hơn, đợt đến nhanh hơn.', {
    hpMul: 2.4, speedMul: 1.06, countMul: 1.2, tierShift: 4, bossHpMul: 1.1, waveInterval: 28, spawnPerSecond: 6.5, upgradeMul: 1, skillCdMul: 1.05 }),
  hard: mk('hard', 3, 'Khó', 'Hard', '#e0b13a', '🔥', 'Quái mạnh sớm, đông gấp rưỡi, vàng eo hẹp hơn.', {
    hpMul: 4, speedMul: 1.12, countMul: 1.5, tierShift: 9, bossHpMul: 1.25, rewardMul: 0.95, startGold: 110, waveInterval: 26, spawnPerSecond: 7.5, upgradeMul: 1.1, skillCdMul: 1.15 }),
  veryHard: mk('veryHard', 4, 'Rất Khó', 'Very Hard', '#e8643a', '💀', 'Quái chạm là mất 2 tim. Tháp đắt hơn, thu nhập giảm.', {
    hpMul: 7, speedMul: 1.2, countMul: 2, tierShift: 16, bossHpMul: 1.4, rewardMul: 0.85, towerDamageMul: 0.95, buildCost: 75, startGold: 100, upgradeMul: 1.3,
    sellRefund: 0.55, resetCost: 60, firstWaveDelay: 12, waveInterval: 23, spawnPerSecond: 9, maxActive: 165, contactDamage: 2, skillCdMul: 1.3 }),
  nightmare: mk('nightmare', 5, 'Ác Mộng', 'Nightmare', '#c04bff', '👹', 'Biển slime. Gần như không có chỗ cho sai lầm.', {
    hpMul: 12, speedMul: 1.32, countMul: 2.8, tierShift: 26, bossHpMul: 1.6, rewardMul: 0.75, towerDamageMul: 0.9, towerRateMul: 0.95, buildCost: 95, startGold: 90, upgradeMul: 1.6,
    sellRefund: 0.5, resetCost: 90, firstWaveDelay: 10, waveInterval: 18, spawnPerSecond: 12, maxActive: 180, contactDamage: 2, skillCdMul: 1.5, speedCap: 2.4 }),
};
// icon vector (src/ui/icons.js) cho từng độ khó
export const DIFF_ICON = { easy: 'grass', normal: 'sword', hard: 'flame', veryHard: 'skull', nightmare: 'bolt' };
export const DIFFICULTY_LIST = Object.values(DIFFICULTIES);
export const DEFAULT_DIFFICULTY = 'easy';
export const getDifficulty = (id) => DIFFICULTIES[id] || DIFFICULTIES[DEFAULT_DIFFICULTY];
