// Bố cục HÀNG KỸ NĂNG NẰM NGANG (thuần toán học, kiểm thử được): nút XÂY ở góc dưới-phải, rồi các nút kỹ năng nối tiếp sang trái, cách đều, không bao giờ chồng nhau.
// Vừa chỗ bên cạnh joystick -> ngang hàng với joystick; màn hẹp -> cả hàng nâng lên ngay trên joystick; vẫn chật -> thu nhỏ đều (tối thiểu 55%).
export const ROW_COUNT = 4;   // số nút kỹ năng ngoài XÂY
export function computeActionRow({ width, height, u = 1, insets = { left: 0, right: 0, bottom: 0 }, joyRight = 0, joyTop = height }) {
  const rb0 = 31 * u, rk0 = 24 * u, gap0 = 9 * u, total0 = 2 * rb0 + ROW_COUNT * 2 * rk0 + ROW_COUNT * gap0, rightX = width - insets.right - 12;
  let sc = Math.min(1, (rightX - joyRight) / total0), lifted = false;
  if (sc < 0.84) { lifted = true; sc = Math.min(1, (rightX - (insets.left + 12)) / total0); }
  sc = Math.max(0.55, sc);
  const rb = rb0 * sc, rk = rk0 * sc, gap = gap0 * sc; let y = height - insets.bottom - 18 - rb; if (lifted) y = Math.min(y, joyTop - rb - 6);
  const bx = rightX - rb, xs = []; let x = bx - rb - gap - rk; for (let i = 0; i < ROW_COUNT; i++) { xs.push(x); x -= 2 * rk + gap; }
  return { sc, rb, rk, gap, y, bx, xs, lifted, top: y - Math.max(rb, rk), left: xs[ROW_COUNT - 1] - rk };
}
