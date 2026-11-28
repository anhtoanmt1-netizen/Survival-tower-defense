// PHÂN BỔ SLIME CHO 100 WAVE / 10 CHƯƠNG. Dữ liệu + hàm thuần planWave(w); chưa nối vào WaveDirector (Giai đoạn 2).
// Mục tiêu: mỗi chương mở slime mới, có kỹ năng mới, kết hợp với kỹ năng cũ, đổi cách phối quái, có wave đặc biệt —
// KHÔNG chỉ cộng HP. Số lượng/HP vẫn do config/waves.js + độ khó quyết định; ở đây chỉ quyết định "ai xuất hiện, phối thế nào".
import { SLIMES_V2, GROUPS } from './slimeCatalog.js';
import { BOSSES } from './slimeBosses.js';
export const TOTAL_WAVES = 100;
// u = [[slime, wave mở khóa]]. sp = wave đặc biệt [wave, id đặc biệt]
export const CHAPTERS = [
  { n: 1, name: 'Đồng cỏ khởi đầu', boss: 'ancient_king', theme: 'Slime cơ bản', mechanic: 'Học nhịp đợt: đàn đông, quái nhanh, quái đỏ giận dữ.',
    u: [['green', 1], ['blue', 3], ['red', 6], ['yellow', 8]], sp: [[3, 'swarm_run'], [6, 'fast_rush'], [9, 'rage_pack']] },
  { n: 2, name: 'Thức tỉnh nguyên tố', boss: 'frost_emperor', theme: 'Lửa & Băng', mechanic: 'Hiệu ứng trạng thái: cháy làm tan băng, băng dập lửa.',
    u: [['fire', 11], ['ice', 14]], sp: [[13, 'ember_swarm'], [16, 'steam_clash'], [19, 'frost_rush']] },
  { n: 3, name: 'Vùng đá và giáp', boss: 'inferno_titan', theme: 'Đất, Giáp, Gai', mechanic: 'Giáp giảm sát thương: cần lửa/băng và nâng cấp tháp thay vì chỉ đông tháp.',
    u: [['earth', 21], ['stone_armor', 24], ['thorn', 27]], sp: [[23, 'quake_march'], [26, 'armored_push'], [29, 'thorn_wall']] },
  { n: 4, name: 'Bão độc và đột biến', boss: 'thunder_lord', theme: 'Sét, Độc, Đột biến', mechanic: 'Sét liên hoàn, độc cộng dồn, slime tách thân khi bị thương.',
    u: [['thunder', 31], ['poison', 33], ['split', 36], ['spike_mutant', 38]], sp: [[33, 'storm_front'], [36, 'toxic_tide'], [39, 'split_flood']] },
  { n: 5, name: 'Đêm bóng tối', boss: 'abyssal_horror', theme: 'Bóng tối, Ma, Xúc tu, Nhiều mắt', mechanic: 'Tàng hình và ảo ảnh đánh lạc hướng tháp; xúc tu kéo.',
    u: [['dark', 41], ['phantom', 44], ['tentacle', 46], ['multi_eye', 48]], sp: [[43, 'shadow_march'], [46, 'night_veil'], [49, 'many_eyes']] },
  { n: 6, name: 'Pha lê và thép', boss: 'crystal_colossus', theme: 'Pha lê, Sắt, Tái tạo, Tinh anh', mechanic: 'Phản sát thương, hồi máu: phải dồn sát thương nhanh.',
    u: [['crystal', 51], ['iron', 53], ['regeneration', 55], ['berserker', 57]], sp: [[53, 'prism_guard'], [56, 'regen_siege'], [59, 'elite_escort']] },
  { n: 7, name: 'Vực hư không', boss: 'plague_overlord', theme: 'Đột biến cao cấp, Ma cà rồng, Ánh sáng', mechanic: 'Trọng lực hút, hút máu, slime ánh sáng giải hiệu ứng.',
    u: [['void_mutant', 61], ['vampire', 63], ['light', 65]], sp: [[63, 'gravity_rift'], [66, 'blood_hunt'], [69, 'shield_wall']] },
  { n: 8, name: 'Điện thờ huyền thoại', boss: 'golden_devourer', theme: 'Huyền thoại, Hấp thụ', mechanic: 'Slime nuốt slime nhỏ để to lên; tăng cường đồng đội.',
    u: [['golden', 71], ['celestial', 74], ['overlord', 77]], sp: [[73, 'gold_rush'], [76, 'star_court'], [79, 'devour_horde']] },
  { n: 9, name: 'Hỗn mang nguyên tố', boss: 'chaos_rainbow', theme: 'Slime lai nguyên tố, Chaos, Hợp nhất', mechanic: 'Hợp nhất: hai slime gộp thành một con mang kỹ năng của cả hai.',
    u: [['rainbow', 81], ['infernal', 85]], sp: [[83, 'hybrid_clash'], [86, 'fusion_event'], [89, 'chaos_mix']] },
  { n: 10, name: 'Nguồn gốc', boss: 'primordial', theme: 'Tối thượng, kết hợp biến thể', mechanic: 'Khóa nâng cấp tháp, ảo ảnh, mọi kỹ năng cũ hợp lại.',
    u: [['ancient', 91]], sp: [[93, 'rune_lock'], [96, 'mirror_wave'], [99, 'last_stand']] },
];
// Wave đặc biệt: focus là các slime được ưu tiên (focusShare = tỉ lệ lượt xuất hiện lấy từ focus).
const SP = (name, rule, focus, o = {}) => ({ name, rule, focus, focusShare: 0.7, countMul: 1, speedMul: 1, ...o });
export const SPECIAL_WAVES = {
  swarm_run: SP('Đàn xanh', 'Rất đông slime xanh lá, ít khi có quái mạnh.', ['green'], { countMul: 1.5, focusShare: 0.9 }),
  fast_rush: SP('Xung phong nhanh', 'Slime nhẹ và nhanh ào tới cùng lúc.', ['blue', 'green'], { countMul: 1.2, speedMul: 1.25 }),
  rage_pack: SP('Bầy giận dữ', 'Slime đỏ và vàng đi thành bầy, đỏ cuồng nộ khi thấp máu.', ['red', 'yellow']),
  ember_swarm: SP('Bầy tàn lửa', 'Slime lửa đốt cháy đường đi, lửa lan khi chết.', ['fire', 'green']),
  steam_clash: SP('Hơi nước', 'Lửa và băng đi cùng nhau; hai hệ triệt tiêu hiệu ứng của nhau nên cần chọn nhánh tháp hợp lý.', ['fire', 'ice'], { focusShare: 0.85 }),
  frost_rush: SP('Băng tràn', 'Slime băng làm chậm cả tháp lẫn người chơi, đi cùng quái nhanh.', ['ice', 'blue', 'yellow']),
  quake_march: SP('Diễu hành rung chuyển', 'Slime đất làm rung mặt đất, đi cùng lửa.', ['earth', 'fire'], { countMul: 0.9 }),
  armored_push: SP('Đạo quân giáp', 'Toàn slime có giáp; sát thương thấp bị giảm mạnh.', ['stone_armor', 'earth', 'ice'], { countMul: 0.75, focusShare: 0.85 }),
  thorn_wall: SP('Tường gai', 'Slime gai phản sát thương cận chiến đi sau giáp đá.', ['thorn', 'stone_armor'], { countMul: 0.8 }),
  storm_front: SP('Tiền tuyến sấm sét', 'Slime sét chạm điện lan; băng làm giòn trước sét.', ['thunder', 'blue', 'ice']),
  toxic_tide: SP('Thủy triều độc', 'Độc cộng dồn tầng; các vũng độc chồng nhau trên đường đi.', ['poison', 'earth', 'thorn']),
  split_flood: SP('Lũ phân thân', 'Slime tách thân khi bị thương; tháp đơn mục tiêu bị quá tải.', ['split', 'spike_mutant', 'green'], { countMul: 0.85 }),
  shadow_march: SP('Hành quân bóng tối', 'Slime tối dịch chuyển, kèm sét.', ['dark', 'thunder']),
  night_veil: SP('Màn đêm', 'Slime ma tàng hình ngắn và ảo ảnh; tháp chọn nhầm mục tiêu.', ['phantom', 'dark'], { focusShare: 0.8 }),
  many_eyes: SP('Vạn nhãn', 'Nhiều mắt gây ảo giác cho tháp, xúc tu kéo người chơi.', ['multi_eye', 'tentacle', 'dark']),
  prism_guard: SP('Vệ binh pha lê', 'Phản sát thương và giáp sắt: đánh liều sẽ bị phản.', ['crystal', 'iron'], { countMul: 0.8 }),
  regen_siege: SP('Vây hãm hồi sinh', 'Slime tái tạo được giáp bảo vệ; phải dồn sát thương.', ['regeneration', 'iron', 'stone_armor'], { countMul: 0.7, focusShare: 0.8 }),
  elite_escort: SP('Hộ tống tinh anh', 'Một nhóm nhỏ tinh anh có đàn tép đi kèm.', ['berserker', 'crystal', 'iron'], { countMul: 0.7 }),
  gravity_rift: SP('Khe nứt trọng lực', 'Slime hư không kéo mục tiêu và tạo bản sao.', ['void_mutant', 'dark', 'phantom']),
  blood_hunt: SP('Săn máu', 'Hút máu hồi phục khi chạm người chơi.', ['vampire', 'split', 'spike_mutant'], { countMul: 0.85 }),
  shield_wall: SP('Bức tường ánh sáng', 'Slime ánh sáng che khiên và xóa hiệu ứng cho cả đàn.', ['light', 'stone_armor', 'regeneration'], { focusShare: 0.8 }),
  gold_rush: SP('Cơn sốt vàng', 'Slime vàng kim mang thưởng lớn nhưng tự dựng khiên.', ['golden', 'yellow'], { countMul: 0.7, focusShare: 0.8 }),
  star_court: SP('Cung đình sao', 'Thiên thể hồi phục vùng, vàng kim tăng cường đồng đội.', ['celestial', 'light', 'golden'], { countMul: 0.75 }),
  devour_horde: SP('Bầy nuốt chửng', 'Chúa tể nuốt slime nhỏ để to hơn: đừng để tép sống sót quá lâu.', ['overlord', 'green', 'blue', 'split'], { countMul: 1.1 }),
  hybrid_clash: SP('Va chạm lai nguyên tố', 'Cầu vồng đổi nguyên tố; nhiều phản ứng trạng thái cùng lúc.', ['rainbow', 'fire', 'ice', 'thunder']),
  fusion_event: SP('Sự kiện hợp nhất', 'Các slime gần nhau hợp nhất thành con mạnh hơn.', ['infernal', 'fire', 'split', 'berserker'], { focusShare: 0.75 }),
  chaos_mix: SP('Hỗn mang', 'Mọi nguyên tố cùng lúc.', ['rainbow', 'infernal', 'thunder', 'poison', 'dark'], { focusShare: 0.8 }),
  rune_lock: SP('Phong ấn rune', 'Slime cổ đại khóa hiệu ứng nhánh của tháp trong thời gian ngắn.', ['ancient', 'light', 'celestial'], { countMul: 0.7 }),
  mirror_wave: SP('Wave ảo ảnh', 'Rất nhiều bản sao ảo; phải nhận ra con thật.', ['phantom', 'ancient', 'multi_eye', 'rainbow'], { countMul: 0.9 }),
  last_stand: SP('Trận cuối', 'Tập hợp tất cả họ huyền thoại trước khi Boss cuối xuất hiện.', ['ancient', 'overlord', 'infernal', 'golden', 'rainbow', 'celestial'], { countMul: 0.65, focusShare: 0.9 }),
};

const GROUP_WEIGHT = { normal: 1.0, elemental: 0.8, armored: 0.6, mutant: 0.5, elite: 0.45, legendary: 0.5 };
const UNLOCK = {}; const CH_OF_UNLOCK = {}; // slime → wave mở khóa / chương
for (const c of CHAPTERS) for (const [id, w] of c.u) { UNLOCK[id] = w; CH_OF_UNLOCK[id] = c.n; }
export const unlockWave = (id) => UNLOCK[id] ?? Infinity;
export const chapterOf = (w) => CHAPTERS[Math.min(CHAPTERS.length, Math.max(1, Math.ceil(w / 10))) - 1];
export const newUnlocksAt = (w) => Object.keys(UNLOCK).filter((id) => UNLOCK[id] === w);
// Slime cũ nhạt dần khi sang chương sau (giảm 28% mỗi chương, tối thiểu 8%) để cách phối quái thay đổi thật sự; slime mới mở khóa được ưu tiên.
function baseWeights(w) {
  const ch = chapterOf(w), out = {};
  for (const id of Object.keys(UNLOCK)) {
    if (UNLOCK[id] > w) continue; const age = ch.n - CH_OF_UNLOCK[id], since = w - UNLOCK[id];
    let x = GROUP_WEIGHT[SLIMES_V2[id].group] * Math.max(0.08, Math.pow(0.72, age)); if (age === 0) x *= since < 5 ? 1.6 : 1.2; out[id] = x;
  }
  // Tinh anh + huyền thoại bị chặn trần theo chương (30% tới chương 6, rồi +5%/chương tới 50%) để không áp đảo sớm nhưng vẫn là chủ lực cuối game
  let tot = 0, top = 0; for (const [id, x] of Object.entries(out)) { tot += x; const g = SLIMES_V2[id].group; if (g === 'elite' || g === 'legendary') top += x; }
  const cap = eliteCap(ch.n); if (top / tot > cap) { const k = (cap * (tot - top)) / ((1 - cap) * top); for (const id of Object.keys(out)) { const g = SLIMES_V2[id].group; if (g === 'elite' || g === 'legendary') out[id] *= k; } }
  return out;
}
export const eliteCap = (chapter) => Math.min(0.5, 0.3 + 0.05 * Math.max(0, chapter - 6));
const normalize = (o) => { const t = Object.values(o).reduce((a, b) => a + b, 0); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v / t])); };
// Kế hoạch một wave: ai xuất hiện, tỉ lệ, wave đặc biệt, boss. Thuần và tất định.
export function planWave(w) {
  if (!Number.isInteger(w) || w < 1 || w > TOTAL_WAVES) throw new RangeError('wave 1..' + TOTAL_WAVES);
  const ch = chapterOf(w), boss = w % 10 === 0 ? BOSSES[ch.boss] : null, base = baseWeights(w), spId = ch.sp.find(([sw]) => sw === w)?.[1] ?? null, sp = spId ? SPECIAL_WAVES[spId] : null;
  let weights = normalize(base);
  if (sp) { const f = sp.focus.filter((id) => weights[id] !== undefined), fw = normalize(Object.fromEntries(f.map((id) => [id, weights[id]]))), rest = Object.fromEntries(Object.entries(weights).filter(([id]) => !f.includes(id)));
    const restN = Object.keys(rest).length ? normalize(rest) : {}, s = Object.keys(restN).length ? sp.focusShare : 1; weights = {}; for (const [id, v] of Object.entries(fw)) weights[id] = v * s; for (const [id, v] of Object.entries(restN)) weights[id] = v * (1 - s); }
  let escort = null;
  if (boss) { const e = boss.minions.filter((id) => UNLOCK[id] <= w); escort = e; const ew = normalize(Object.fromEntries(e.map((id) => [id, weights[id] ?? 0.2]))), rest = Object.fromEntries(Object.entries(weights).filter(([id]) => !e.includes(id))), restN = Object.keys(rest).length ? normalize(rest) : {};
    weights = {}; for (const [id, v] of Object.entries(ew)) weights[id] = v * 0.7; for (const [id, v] of Object.entries(restN)) weights[id] = (weights[id] ?? 0) + v * 0.3; weights = normalize(weights); }
  return { wave: w, chapter: ch.n, chapterName: ch.name, boss: boss?.id ?? null, escort, special: spId, specialInfo: sp ? { name: sp.name, rule: sp.rule } : null,
    countMul: (sp?.countMul ?? 1) * (boss ? 0.8 : 1), speedMul: sp?.speedMul ?? 1, weights, newUnlocks: newUnlocksAt(w) };
}
export const planAll = () => Array.from({ length: TOTAL_WAVES }, (_, i) => planWave(i + 1));
export { GROUPS };
