// 10 BOSS (wave 10, 20, …, 100). Mỗi boss: silhouette riêng, ≥3 lớp vật liệu, ≥3 bộ phận chuyển động độc lập,
// lõi riêng, ≥3 giai đoạn, ≥3 kỹ năng đặc trưng, hoạt ảnh xuất hiện/biến hình/tấn công/chết riêng. Bản chất vẫn là Slime.
// hp là hệ số cơ sở (nhân thêm hpMul theo đợt và độ khó như slime vàng thử thách hiện tại). Cân bằng thật chỉnh ở Giai đoạn 2.
import { SKILLS_SLIME } from './slimeSkills.js';
export const BOSSES = {};
// ph = [[tên, hpTop%, hpBottom%, [kỹ năng mở khóa ở pha], ghi chú thay đổi]]
const B = (id, num, wave, vi, en, st, sil, layers, parts, core, pal, ph, entrance, transform, attackAnim, death, minions, vfx, skills) => {
  BOSSES[id] = { id, num, wave, name: vi, en, group: 'boss', stats: { hp: st[0], armor: st[1], speed: st[2], scale: st[3], reward: st[4], radius: +(0.3 + st[3] * 0.07).toFixed(2), contactDamage: 2, attackCooldown: 1.2 },
    body: { silhouette: sil, layers, parts }, core, palette: { main: pal[0], sub: [pal[1], pal[2]], core: pal[3], glow: pal[4] },
    phases: ph.map(([name, top, bottom, unlock, note], i) => ({ index: i + 1, name, hpTop: top, hpBottom: bottom, skills: unlock, note })),
    anim: { entrance, transform, attack: attackAnim, death }, minions, vfx, skills };
};
// st = [hp, armor, speed, scale, reward]

B('ancient_king', 1, 10, 'Vua Slime Cổ Đại', 'Ancient King Slime', [2200, 0.2, 0.8, 3.4, 400], 'tiered_crown_throne',
  ['gelatin xanh lục cổ đại', 'đá vương miện', 'tinh thể xanh'], ['vương miện đá 5 mũi xoay chậm', 'ba tinh thể xanh nổi quanh đầu', 'dải gelatin buông hai bên như áo choàng'],
  { design: 'colossal_layered', shape: 'jade_orb', note: 'lõi xanh ngọc khổng lồ, hai vòng xoay' }, ['#3a8a4a', '#9fe0a8', '#1a4a2a', '#40ffb0', '#60ffc0'],
  [['Tiên vương', 1.0, 0.66, ['crown_shield', 'summon'], 'phân thân gọi slime nhỏ'], ['Cổ vương', 0.66, 0.33, ['split', 'absorb'], 'hấp thụ slime nhỏ để lớn thêm'], ['Cuồng vương', 0.33, 0, ['spike_growth', 'ancient_burst'], 'phình to, mọc gai năng lượng']],
  'trồi lên từ đống gelatin, vương miện đá lắp ghép từng mảnh', 'rung mạnh, vỏ đá nứt, gai năng lượng mọc ra', 'cúi đầu húc, vương miện phóng tinh thể', 'lõi nứt, vương miện vỡ, tan thành gelatin xanh rồi nổ ánh sáng ngọc',
  ['green', 'blue', 'yellow'], 'legendary', ['split', 'absorb', 'crown_shield', 'summon', 'spike_growth', 'ancient_burst']);
B('frost_emperor', 2, 20, 'Hoàng Đế Băng', 'Frost Emperor Slime', [3600, 0.25, 0.85, 3.6, 600], 'spired_ice_regalia',
  ['gelatin xanh băng', 'giáp tinh thể băng lưng/đầu', 'sương lạnh'], ['hàng gai băng dài như vương miện', 'hai cánh giáp băng', 'đuôi gai băng quét ngang'],
  { design: 'colossal_layered', shape: 'ice_polyhedron', note: 'lõi băng đa diện xoay trong khung tinh thể' }, ['#79c8f0', '#e8f8ff', '#2a6a9a', '#9ff0ff', '#6fe3ff'],
  [['Mùa đông đến', 1.0, 0.66, ['blizzard', 'ice_nova'], 'bão tuyết làm chậm'], ['Băng giá vĩnh cửu', 0.66, 0.33, ['mass_freeze', 'ice_wall'], 'đóng băng diện rộng và dựng tường'], ['Tinh thể hóa', 0.33, 0, ['ice_crystallize', 'ice_shard'], 'toàn thân tinh thể hóa, giáp cao']],
  'sương mù lạnh phủ xuống, băng đóng thành thân từ dưới lên', 'băng phủ kín, thân hóa tinh thể phản xạ ánh sáng', 'đuôi gai quét, gai băng phóng thành chùm', 'tinh thể vỡ từng mảng, lõi băng nổ thành bão tinh thể nhỏ',
  ['ice', 'blue'], 'ice', ['blizzard', 'ice_nova', 'mass_freeze', 'ice_wall', 'ice_crystallize', 'ice_shard']);
B('inferno_titan', 3, 30, 'Titan Địa Ngục', 'Inferno Titan Slime', [5200, 0.3, 0.75, 3.8, 800], 'volcanic_hulk',
  ['dung nham đỏ đen', 'lớp đá núi lửa nứt vỡ', 'khe nóng chảy'], ['hai khối đá vai xoay chậm', 'miệng núi lửa trên đỉnh phun khói', 'các khe nứt mở đóng theo nhịp'],
  { design: 'colossal_layered', shape: 'sun_core', note: 'lõi đỏ trắng như mặt trời, khuất sau giáp đá' }, ['#8a1a0a', '#ff6a1a', '#1a0a08', '#fff0c0', '#ff8a2a'],
  [['Núi lửa thức tỉnh', 1.0, 0.66, ['lava_spit', 'fire_burst'], 'phun dung nham, nổ lửa'], ['Phun trào', 0.66, 0.33, ['scorch_ground', 'lava_zone'], 'tạo vùng đất cháy lớn'], ['Lộ lõi', 0.33, 0, ['armor_break', 'berserk'], 'giáp đá vỡ, lộ lõi dung nham']],
  'đất nứt, dung nham trào, đá nguội ghép thành thân', 'giáp đá nứt toác và rơi, lõi dung nham lộ ra', 'giậm xuống phun dung nham', 'lõi phình sáng như mặt trời rồi nổ vòng lửa, đá rơi lả tả',
  ['fire', 'red'], 'fire', ['lava_spit', 'fire_burst', 'scorch_ground', 'lava_zone', 'armor_break', 'berserk']);
B('thunder_lord', 4, 40, 'Lôi Chúa', 'Thunder Lord Slime', [6800, 0.25, 1.0, 3.7, 1000], 'crystal_crowned_storm',
  ['gelatin xanh tím', 'tinh thể điện', 'hồ quang giữa các tinh thể'], ['sáu tinh thể điện lơ lửng nối hồ quang', 'vòng cung điện trên đỉnh', 'hai cột sét bên hông'],
  { design: 'colossal_layered', shape: 'tiered_orb', note: 'lõi nhiều tầng; giai đoạn cuối thêm lõi điện phụ' }, ['#5a3ad8', '#b8a0ff', '#201060', '#ffffff', '#9ad0ff'],
  [['Mây giông', 1.0, 0.66, ['chain_lightning', 'teleport'], 'sét liên hoàn, dịch chuyển'], ['Điện trường', 0.66, 0.33, ['electric_field', 'shock_pulse'], 'điện trường chiếm vùng'], ['Đa lõi', 0.33, 0, ['core_split', 'magnetic_field'], 'sinh lõi điện phụ']],
  'sét đánh xuống ngưng tụ thành thân, tinh thể điện bật lên', 'tinh thể nổ sáng, ba lõi điện phụ xoay quanh', 'tụ điện về lõi rồi xả sét theo nhánh', 'các tinh thể phóng điện cuối cùng, lõi nổ thành mưa tia sáng',
  ['thunder', 'yellow'], 'thunder', ['chain_lightning', 'teleport', 'electric_field', 'shock_pulse', 'core_split', 'magnetic_field']);
B('abyssal_horror', 5, 50, 'Kinh Dị Vực Thẳm', 'Abyssal Horror Slime', [8800, 0.2, 0.9, 4.0, 1300], 'asym_tentacle_mass',
  ['gelatin đen tím bóng', 'xúc tu khổng lồ', 'chất lỏng hư không'], ['sáu xúc tu khổng lồ vẫy độc lập', 'năm mắt phát sáng đảo độc lập', 'các mảng hư không nổi quanh thân'],
  { design: 'colossal_layered', shape: 'void_swirl', note: 'lõi hư không xoáy ở giữa' }, ['#241040', '#7a40c8', '#080214', '#c890ff', '#a060ff'],
  [['Mắt mở', 1.0, 0.66, ['drain_energy', 'tentacle_lash'], 'hút năng lượng tháp'], ['Ảo mộng', 0.66, 0.33, ['illusion', 'summon_shadow'], 'ảo ảnh và slime bóng tối'], ['Vực sống', 0.33, 0, ['void_expand', 'gravity_zone'], 'mở rộng thành vùng hư không sống']],
  'một vết rách không gian mở ra, xúc tu trồi lên từng cái một', 'thân tan rộng thành vùng hư không có sự sống', 'xúc tu quất từ nhiều hướng, mắt phóng tia', 'các mắt nhắm dần, lõi hư không co lại rồi nổ ngược vào trong',
  ['dark', 'phantom', 'tentacle', 'multi_eye'], 'dark', ['drain_energy', 'tentacle_lash', 'illusion', 'summon_shadow', 'void_expand', 'gravity_zone']);
B('crystal_colossus', 6, 60, 'Cự Nhân Pha Lê', 'Crystal Colossus Slime', [11000, 0.4, 0.7, 4.2, 1600], 'terraced_crystal_giant',
  ['gelatin trong suốt', 'mảng pha lê giáp', 'tinh thể phát sáng nhiều tầng'], ['sáu lõi tinh thể nhỏ xoay quanh lõi chính', 'hai cụm pha lê vai', 'tầng tinh thể lơ lửng ở lưng'],
  { design: 'colossal_layered', shape: 'polyhedron_orbiters', note: 'lõi chính đa diện, sáu lõi phụ xoay quanh' }, ['#8ae0ff', '#ffc8f4', '#5a6aff', '#ffffff', '#b8f0ff'],
  [['Pha lê trầm mặc', 1.0, 0.66, ['crystal_rain', 'reflect_damage'], 'khiên phản xạ, mưa tinh thể'], ['Sóng khúc xạ', 0.66, 0.33, ['energy_wave', 'crystal_shot'], 'sóng năng lượng'], ['Vỡ rồi hợp', 0.33, 0, ['crystal_reform', 'crystal_split'], 'tách thành khối rồi hợp nhất']],
  'tinh thể mọc dần thành tầng, ánh sáng khúc xạ lan khắp khu vực', 'thân nứt thành khối rồi lao về lõi để hợp nhất', 'lõi phụ phóng tia, mảng giáp xoay', 'các tầng pha lê vỡ lần lượt, lõi chính nổ thành ánh sáng nhiều màu',
  ['crystal', 'iron'], 'crystal', ['crystal_rain', 'reflect_damage', 'energy_wave', 'crystal_shot', 'crystal_reform', 'crystal_split']);
B('plague_overlord', 7, 70, 'Chúa Tể Dịch Bệnh', 'Plague Overlord Slime', [13500, 0.25, 0.85, 4.2, 2000], 'bloated_blister_hulk',
  ['gelatin xanh độc pha tím đen', 'túi độc phồng', 'gai độc và xúc tu nhỏ'], ['sáu túi độc phồng xẹp độc lập', 'gai độc mọc rải rác', 'xúc tu nhỏ vẫy liên tục'],
  { design: 'colossal_layered', shape: 'toxic_droplet', note: 'lõi độc xanh neon trong túi lớn' }, ['#4a8a2a', '#9a5ac8', '#1a2a10', '#b6ff4a', '#9bff4a'],
  [['Ô nhiễm', 1.0, 0.66, ['poison_spit', 'poison_pool'], 'phun độc, vũng độc'], ['Dịch lan', 0.66, 0.33, ['poison_split', 'poison_cloud'], 'phân thân độc, mây độc'], ['Sương độc', 0.33, 0, ['toxic_fog', 'sticky_trail'], 'màn sương độc quanh thân']],
  'sủi bọt từ vũng độc, túi độc phồng dần thành thân', 'túi độc nổ liên hoàn, sương độc bao phủ', 'túi độc phun theo cung', 'túi độc vỡ lần lượt rồi lõi nổ thành mây độc tan nhanh',
  ['poison', 'thorn', 'green'], 'poison', ['poison_spit', 'poison_pool', 'poison_split', 'poison_cloud', 'toxic_fog', 'sticky_trail']);
B('golden_devourer', 8, 80, 'Kẻ Nuốt Vàng', 'Golden Devourer Slime', [16000, 0.35, 0.8, 4.5, 2600], 'gaping_gold_giant',
  ['vàng nóng chảy', 'pha lê vàng', 'giáp vàng nhiều lớp'], ['ba vòng năng lượng vàng quay khác tốc độ', 'miệng hút phía trước mở đóng', 'mảng giáp vàng xoay quanh thân'],
  { design: 'colossal_layered', shape: 'faceted_sun', note: 'lõi vàng trắng cực sáng, nhiều lớp' }, ['#f5c518', '#fff3a0', '#7a5a00', '#fffbe8', '#ffe14a'],
  [['Tham lam', 1.0, 0.66, ['absorb', 'gold_shield'], 'hấp thụ, khiên vàng'], ['Phân thân vàng', 0.66, 0.33, ['gold_clone', 'golden_invuln'], 'bản sao, giáp vàng bất hoại'], ['Khổng lồ', 0.33, 0, ['devourer_giant', 'empower'], 'nuốt nhiều slime thành dạng khổng lồ']],
  'vàng nóng chảy từ trên rơi xuống thành vũng rồi vươn lên', 'hút nhiều slime nhỏ cùng lúc, phình thành dạng khổng lồ', 'miệng hút phóng xúc tu vàng', 'vàng tan chảy thành dòng, lõi nổ ra mảnh vàng rơi như mưa',
  ['golden', 'yellow'], 'legendary', ['absorb', 'gold_shield', 'gold_clone', 'golden_invuln', 'devourer_giant', 'empower']);
B('chaos_rainbow', 9, 90, 'Cầu Vồng Hỗn Mang', 'Chaos Rainbow Slime', [20000, 0.3, 1.0, 4.7, 3400], 'shapeshifting_prism',
  ['gelatin nhiều lớp đa sắc', 'lõi nguyên tố nhỏ', 'hào quang cầu vồng'], ['năm lõi nguyên tố nhỏ xoay quanh lõi chính', 'dải tia cầu vồng bên hông', 'lớp gelatin đổi hình liên tục'],
  { design: 'colossal_layered', shape: 'multicolor_orbiters', note: 'lõi trung tâm đa sắc, năm lõi nguyên tố xoay quanh' }, ['#ff6ab0', '#6affd0', '#6a8aff', '#ffffff', '#ffd06a'],
  [['Biến sắc', 1.0, 0.66, ['element_shift', 'elemental_split'], 'đổi nguyên tố, phân thân nguyên tố'], ['Kết hợp', 0.66, 0.33, ['fusion', 'all_elements'], 'kết hợp kỹ năng nhiều nguyên tố'], ['Hỗn mang', 0.33, 0, ['all_elements_active', 'chain_lightning'], 'kích hoạt đồng thời nhiều nguyên tố']],
  'các mảng màu hội tụ từ mọi hướng, thân thành hình khi lõi sáng lên', 'các lõi nguyên tố bùng sáng, hào quang cầu vồng lan ra', 'lõi nguyên tố nào gần mục tiêu thì phóng đòn nguyên tố ấy', 'từng màu rút khỏi thân, lõi nổ thành cầu vồng tan trên không',
  ['rainbow', 'fire', 'ice', 'thunder', 'poison', 'dark'], 'legendary', ['element_shift', 'elemental_split', 'fusion', 'all_elements', 'all_elements_active', 'chain_lightning']);
B('primordial', 10, 100, 'Slime Nguyên Thủy', 'The Primordial Slime', [30000, 0.4, 0.9, 5.5, 6000], 'asym_balanced_colossus',
  ['gelatin nhiều lớp đen tím', 'vàng kim', 'trắng và cầu vồng', 'tinh thể và gai năng lượng'], ['sáu xúc tu năng lượng độc lập', 'bốn cụm tinh thể quay riêng', 'ba vòng năng lượng quay tốc độ khác nhau', 'các mạch năng lượng chạy toàn thân', 'những mảng thân có thể tách ra, biến đổi, hợp nhất'],
  { design: 'colossal_layered', shape: 'primordial_multilayer', note: 'lõi nguyên thủy đa tầng cực lớn, ba vòng quay, các bộ phận năng lượng độc lập' }, ['#2a1048', '#f5c518', '#ffffff', '#e0b0ff', '#c890ff'],
  [['Primordial Form', 1.0, 0.66, ['primordial_split', 'summon', 'devour'], 'kỹ năng cơ bản và triệu hồi slime'], ['Chaos Evolution', 0.66, 0.33, ['chaos_element', 'void_collapse', 'ultimate_evolution'], 'tăng kích thước, mở rộng xúc tu, nhiều nguyên tố'], ['Absolute Primordial', 0.33, 0, ['rebirth_core', 'all_elements_active', 'time_warp'], 'vỏ vỡ, lộ lõi nguyên thủy, hào quang bùng nổ, dùng Ultimate']],
  'mọi màu và mọi nguyên tố hội tụ, khối gelatin nguyên thủy hình thành giữa vòng năng lượng', 'vỏ ngoài vỡ ra, lõi nguyên thủy khổng lồ lộ ra và hào quang bùng nổ', 'xúc tu năng lượng quất, các vòng bắn tia nhiều màu', 'lõi mất ổn định, thân tan thành mảnh gelatin và tinh thể, các vòng co lại rồi nổ ánh sáng hoành tráng',
  ['rainbow', 'golden', 'dark', 'celestial', 'ancient'], 'legendary', ['primordial_split', 'devour', 'chaos_element', 'void_collapse', 'ultimate_evolution', 'rebirth_core']);

export const BOSS_IDS = Object.keys(BOSSES);
export const bossAtWave = (w) => BOSS_IDS.map((k) => BOSSES[k]).find((b) => b.wave === w) || null;
export const bossMissingSkills = () => BOSS_IDS.flatMap((id) => [...BOSSES[id].skills, ...BOSSES[id].phases.flatMap((p) => p.skills)].filter((k) => !SKILLS_SLIME[k]).map((k) => `${id}:${k}`));
