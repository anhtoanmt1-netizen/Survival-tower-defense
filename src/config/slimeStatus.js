// HIỆU ỨNG TRẠNG THÁI của hệ Slime mở rộng. Chỉ là dữ liệu: logic nằm ở src/sim/status.js.
// Không import gì từ config cũ nên KHÔNG ảnh hưởng configChecksum / multiplayer hiện tại.
export const STATUS_IDS = ['burn', 'freeze', 'poison', 'shock', 'slow', 'stun', 'shield'];
export const STATUS = {
  burn:   { name: 'Cháy', kind: 'dot', cc: false, stack: 'refresh', maxDur: 8, tick: 0.5, vfx: 'fire', desc: 'Sát thương theo thời gian; lấy dps cao nhất, làm mới thời lượng.' },
  freeze: { name: 'Đóng băng', kind: 'cc', cc: true, stack: 'refresh', maxDur: 3, vfx: 'ice', desc: 'Đứng yên hoàn toàn. Chịu thêm sát thương; bị lửa làm tan băng.' },
  poison: { name: 'Độc', kind: 'dot', cc: false, stack: 'stacks', maxStacks: 8, maxDur: 8, tick: 0.5, vfx: 'poison', desc: 'Cộng dồn tối đa 8 tầng, mỗi tầng một phần dps. Giảm hiệu quả hồi máu.' },
  shock:  { name: 'Giật điện', kind: 'debuff', cc: false, stack: 'refresh', maxDur: 4, vfx: 'thunder', desc: 'Đánh dấu: đòn tiếp theo gây thêm sát thương điện; làm gián đoạn kỹ năng đang niệm.' },
  slow:   { name: 'Làm chậm', kind: 'debuff', cc: false, stack: 'strongest', maxDur: 6, maxPct: 0.7, vfx: 'ice', desc: 'Giảm tốc độ di chuyển; lấy mức mạnh nhất.' },
  stun:   { name: 'Choáng', kind: 'cc', cc: true, stack: 'refresh', maxDur: 2.5, vfx: 'light', desc: 'Không di chuyển, không dùng kỹ năng.' },
  shield: { name: 'Khiên', kind: 'buff', cc: false, stack: 'strongest', maxDur: 12, vfx: 'light', desc: 'Hấp thụ sát thương trước khi trừ máu; chặn hiệu ứng xấu khi còn khiên.' },
};
// Sau khi hết choáng/đóng băng được miễn khống chế một lúc để không bị khóa liên tục.
export const CC_IMMUNITY = 1.5;
// Tương tác giữa các hiệu ứng (đọc bởi sim/status.js). Mọi hệ số chỉnh ở đây.
export const INTERACTIONS = {
  meltFreezeByBurn: { bonusDmgPerDps: 1.2 },      // lửa lên mục tiêu đang đóng băng: tan băng + nổ hơi nước = dps × 1.2 sát thương tức thì
  quenchBurnByFreeze: { slowPct: 0.35, slowDur: 2 }, // băng lên mục tiêu đang cháy: dập lửa, đổi thành làm chậm
  shatterFreezeByShock: { dmgMul: 0.3, stun: 0.5 },  // điện lên mục tiêu đóng băng: vỡ băng, +30% sát thương, choáng ngắn
  shockOnSlow: { stun: 0.4 },                        // điện lên mục tiêu đang bị làm chậm: choáng ngắn
  igniteFumes: { dmgPerStackPerDps: 0.8 },           // lửa lên mục tiêu đang trúng độc: hơi độc bùng cháy, tiêu hết tầng độc
  frozenDamageMul: 1.2,                              // mục tiêu đóng băng chịu +20% sát thương
  shockMarkDamage: 0.25,                             // đòn tiếp theo vào mục tiêu bị đánh dấu điện: +25% rồi xóa dấu
  poisonHealMul: 0.5,                                // hồi máu giảm còn 50% khi có độc
};
