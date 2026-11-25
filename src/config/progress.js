// TIẾN TRÌNH MỞ KHÓA CẤP ĐỘ (độ khó). Cấp 1 luôn mở; cấp N chỉ mở khi đã THẮNG (sống sót đủ 100 đợt) cấp N-1.
// Thuần logic, không phụ thuộc trình duyệt: dùng chung cho menu, kiểm tra khi bắt đầu ván, ghi nhận kết quả và kiểm thử.
import { DIFFICULTY_LIST } from './difficulty.js';
const ORDER = DIFFICULTY_LIST.slice().sort((a, b) => a.level - b.level).map((d) => d.id);
export const LEVEL_ORDER = ORDER;
// cleared: { [idĐộKhó]: true } – chỉ những cấp đã thắng
export function isUnlocked(id, cleared = {}) {
  const i = ORDER.indexOf(id); if (i < 0) return false; if (i === 0) return true;
  for (let k = 0; k < i; k++) if (!cleared?.[ORDER[k]]) return false; // phải thắng LẦN LƯỢT mọi cấp trước đó
  return true;
}
export const unlockedIds = (cleared) => ORDER.filter((id) => isUnlocked(id, cleared));
export const highestUnlocked = (cleared) => unlockedIds(cleared).pop();
export const requirementOf = (id) => { const i = ORDER.indexOf(id); return i > 0 ? ORDER[i - 1] : null; };
// Ghi nhận kết quả ván: chỉ thắng ở cấp ĐANG MỞ mới được tính (không thể "thắng" cấp đang khóa)
export function recordResult(cleared, id, won) { return won && isUnlocked(id, cleared) ? { ...cleared, [id]: true } : { ...cleared }; }
// Bản đã lưu có thể bị sửa tay: chỉ giữ các cấp hợp lệ và liên tục từ cấp 1
export function sanitizeCleared(raw) { const out = {}; for (const id of ORDER) { if (raw?.[id] === true && isUnlocked(id, out)) out[id] = true; else break; } return out; }
