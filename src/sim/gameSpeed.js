// Tốc độ game X1/X2/X3: nhân thời gian MÔ PHỎNG; mỗi bước mô phỏng vẫn ≤ MAX_STEP giây nên va chạm/spawn/hồi chiêu không bị bỏ sót hay trôi lệch ở tốc độ cao.
export const GAME_SPEEDS = [1, 2, 3];
export const MAX_STEP = 0.05;
export const nextSpeed = (s) => GAME_SPEEDS[(GAME_SPEEDS.indexOf(s) + 1) % GAME_SPEEDS.length] ?? 1;
// số bước con cho một khung có thời gian mô phỏng simDt (giây). simDt=0 (tạm dừng) -> 1 bước dt=0 an toàn.
export const subSteps = (simDt) => Math.max(1, Math.ceil(simDt / MAX_STEP - 1e-9));
