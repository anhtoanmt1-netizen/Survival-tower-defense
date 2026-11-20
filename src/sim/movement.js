// Quy tắc va chạm của người chơi, DÙNG CHUNG cho máy khách (dự đoán) và máy chủ (kiểm tra).
export function boxCollides(grid, x, y, r, phase) {
  if (phase) return x - r < 0 || y - r < 0 || x + r > grid.width || y + r > grid.height; // xuyên vật thể nhưng không ra ngoài bản đồ
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) if (!grid.isWalkable(tx, ty)) return true;
  return false;
}
// Đoạn thẳng từ (x0,y0) tới (x1,y1) có đi xuyên vật cản không (lấy mẫu mỗi 0,2 ô để chống dịch chuyển tức thời xuyên tường)
export function segmentClear(grid, x0, y0, x1, y1, r, phase) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.2));
  for (let i = 1; i <= n; i++) if (boxCollides(grid, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r, phase)) return false;
  return true;
}
