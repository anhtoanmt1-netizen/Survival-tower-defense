// Hằng số cấu hình. Kinh tế/đợt/tháp sẽ tách thành file cấu hình riêng ở các giai đoạn sau.
export const GAME_CONFIG = {
  tileSize: 32,
  map: { minSize: 40, maxSize: 400 },
  player: { hp: 3, invulnTime: 1.2, radius: 0.3, walkSpeed: 3.4, runSpeed: 5.0, maxNameLength: 14 },
  shirtColors: ['#d94f4f', '#3f7fd9', '#4fb35a', '#e0b13a', '#9a58c9', '#e07a3a', '#2fb8b0', '#d95fa5'],
};
