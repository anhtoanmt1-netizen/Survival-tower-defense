// Chỉ số slime. Mọi con số là giá trị khởi đầu để cân bằng, chỉnh ở đây không cần sửa code.
// reward: vàng khi tiêu diệt (hệ thống vàng sẽ dùng ở Giai đoạn 4; slime đỏ chưa có số trong spec nên tạm 22).
export const SLIMES = {
  green:  { name: 'Slime xanh lá',  hp: 20,  speed: 1.10, radius: 0.32, scale: 1.0,  reward: 8,  attackCooldown: 1.0 },
  blue:   { name: 'Slime xanh dương', hp: 45, speed: 1.25, radius: 0.34, scale: 1.1,  reward: 12, attackCooldown: 1.0 },
  purple: { name: 'Slime tím',      hp: 90,  speed: 1.40, radius: 0.36, scale: 1.2,  reward: 18, attackCooldown: 1.0 },
  red:    { name: 'Slime đỏ',       hp: 170, speed: 1.55, radius: 0.38, scale: 1.3,  reward: 22, attackCooldown: 1.0 },
  gold:   { name: 'Slime vàng',     hp: 300, speed: 1.90, radius: 0.34, scale: 1.15, reward: 25, attackCooldown: 1.0 },
};
export const SLIME_TYPES = Object.keys(SLIMES);
export const MONSTER_SETTINGS = { maxActive: 150, dyingTime: 0.55, contactDamage: 1, separation: 0.9 };
