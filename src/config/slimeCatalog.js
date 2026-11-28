// DANH MỤC 30 SLIME theo ID riêng. Tách bạch: Stats · Body/Material · Core · Palette · Motion(Animation) · VFX · Skills.
// Dữ liệu thuần, KHÔNG import config cũ (config/slimes.js vẫn là nguồn sự thật của chế độ chơi hiện tại cho tới khi nối ở Giai đoạn 2).
// hp là hệ số cơ sở (green = 20) và vẫn nhân với hpMul theo đợt/độ khó như quái cũ. armor = tỉ lệ giảm sát thương 0..0.6.
// reward chỉ là giá trị khởi đầu; cân bằng kinh tế thật sẽ chỉnh ở Giai đoạn 2 khi nối vào game.
import { SKILLS_SLIME } from './slimeSkills.js';

export const GROUPS = {
  normal:    { name: 'Slime cơ bản', en: 'Normal', size: [1.0, 1.25], core: 'small_soft' },
  elemental: { name: 'Slime nguyên tố', en: 'Elemental', size: [1.1, 1.4], core: 'element' },
  armored:   { name: 'Slime giáp', en: 'Armored', size: [1.2, 1.5], core: 'buried' },
  mutant:    { name: 'Slime đột biến', en: 'Mutant', size: [1.2, 1.6], core: 'multi_asym' },
  elite:     { name: 'Slime tinh anh', en: 'Elite', size: [1.5, 1.9], core: 'ringed' },
  legendary: { name: 'Slime huyền thoại', en: 'Legendary', size: [1.6, 2.0], core: 'faceted_multilayer' },
  boss:      { name: 'Boss', en: 'Boss', size: [3.2, 5.5], core: 'colossal_layered' },
};

// Chuẩn lõi theo nhóm (bản yêu cầu mục 3). Hoạt ảnh lõi dùng chung CORE_ANIM nhưng hình dạng/màu riêng từng slime.
export const CORE_DESIGNS = {
  small_soft: { desc: 'Lõi tròn nhỏ, ánh sáng dịu', relSize: 0.22, layers: 1 },
  element: { desc: 'Lõi mang hình dạng và màu nguyên tố', relSize: 0.28, layers: 1 },
  buried: { desc: 'Lõi nằm sâu bên trong lớp bảo vệ', relSize: 0.24, layers: 1, depth: 0.7 },
  multi_asym: { desc: 'Lõi nhiều phần, bất đối xứng hoặc biến dạng', relSize: 0.3, layers: 2, asymmetric: true },
  ringed: { desc: 'Lõi lớn có vòng năng lượng bao quanh', relSize: 0.36, layers: 2, rings: 1 },
  faceted_multilayer: { desc: 'Lõi đa tầng, nhiều mặt tinh thể', relSize: 0.4, layers: 3, rings: 2, facets: true },
  colossal_layered: { desc: 'Lõi khổng lồ nhiều lớp, nhiều vòng xoay và bộ phận năng lượng độc lập', relSize: 0.45, layers: 4, rings: 3, orbiters: true },
};
export const CORE_ANIM = {
  pulse: { hz: [0.8, 2.2], amp: 0.12 },          // nhịp đập; tốc độ tăng khi HP thấp
  squashFollow: 0.6,                              // lõi co giãn theo thân
  hpIntensity: { full: 1.0, low: 0.55, flickerBelow: 0.25 }, // cường độ sáng theo HP
  skillFlash: { rise: 0.15, hold: 0.25, fall: 0.4, boost: 2.2 }, // sáng mạnh khi kích hoạt kỹ năng
  dying: { crackAt: 0.15, unstableJitter: 0.08, burstOnDeath: true }, // nứt vỡ/mất ổn định khi sắp chết
};

// Phong cách chuyển động: [hopHz, squash, hangTime, idleWobble] + ghi chú tạo hình cho animator ở Giai đoạn 2
export const MOTION_STYLES = {
  squash_hop: [1.6, 0.35, 0.18, 0.05, 'nén xuống rồi bật, vòng sóng gelatin khi chạm đất'],
  ripple_glide: [0.9, 0.12, 0.0, 0.08, 'trượt êm, gợn sóng bề mặt chạy dọc thân, vệt nước lấp lánh'],
  anger_swell: [1.3, 0.3, 0.12, 0.07, 'bước nảy nặng, thân phình theo nhịp giận dữ, rơi giọt nóng'],
  light_bounce: [2.6, 0.28, 0.3, 0.04, 'nảy nhẹ liên tục, vòng sáng nhỏ quanh thân'],
  flame_lick: [1.4, 0.22, 0.1, 0.12, 'đỉnh thân bốc như ngọn lửa, bước nảy để lại vệt lửa'],
  crystal_slide: [1.0, 0.1, 0.0, 0.03, 'trượt cứng, gai băng rung, tinh thể xoay chậm bên trong'],
  arc_jitter: [2.0, 0.2, 0.15, 0.15, 'giật nhẹ như điện, vệt sáng, tia nhỏ phóng ra'],
  rumble_crawl: [0.8, 0.15, 0.05, 0.02, 'nặng nề, mỗi bước rung đất và tung bụi'],
  ooze_bubble: [1.1, 0.25, 0.1, 0.1, 'bềnh bồng, túi độc phồng xẹp, khói độc bốc lên'],
  smear_phase: [1.5, 0.3, 0.2, 0.06, 'trượt nhòe có ảnh tối đi theo, thân hút ánh sáng'],
  float_halo: [1.2, 0.18, 0.4, 0.05, 'bay lơ lửng nhẹ, vòng năng lượng xoay, vệt sáng'],
  plated_march: [0.9, 0.08, 0.0, 0.02, 'bước nặng, phiến đá rung và bụi rơi'],
  clank_roll: [1.0, 0.06, 0.0, 0.02, 'khớp kim loại kêu và chuyển động theo độ đàn hồi thân'],
  prism_roll: [0.9, 0.1, 0.0, 0.03, 'lăn nhẹ, mặt tinh thể khúc xạ tia sáng khi xoay'],
  thorn_sway: [1.0, 0.18, 0.0, 0.05, 'gai bất đối xứng đung đưa so le, gốc gai nháy sáng'],
  tentacle_crawl: [1.3, 0.2, 0.08, 0.14, 'xúc tu luân phiên bò chống đất, thân đu đưa'],
  eye_scan: [1.4, 0.2, 0.1, 0.06, 'các mắt đảo độc lập, thân nghiêng theo ánh nhìn'],
  lobe_wobble: [1.5, 0.25, 0.1, 0.12, 'các thùy dính liền rung lệch nhịp, kéo nhau'],
  spike_lurch: [1.1, 0.22, 0.05, 0.08, 'các khối cơ phình xẹp bất thường, lao từng nhịp'],
  void_drift: [1.0, 0.15, 0.3, 0.1, 'các mảng thân lơ lửng nối nhau bằng chất lỏng tối, biến dạng như hút sáng'],
  muscle_surge: [1.5, 0.3, 0.1, 0.08, 'khối cơ gelatin gồng theo nhịp lõi, gai sống lưng dựng'],
  fluid_stalk: [1.2, 0.2, 0.05, 0.1, 'tua chất lỏng vươn dò đường, trượt uyển chuyển'],
  mist_drift: [1.1, 0.1, 0.35, 0.12, 'một phần thân tan thành sương rồi tái tạo, bóng ảnh phía sau'],
  layer_pulse: [1.0, 0.18, 0.05, 0.06, 'các lớp gelatin dồn lên nhau nhịp nhàng, vết thương khép phát sáng'],
  tier_sway: [0.7, 0.1, 0.0, 0.04, 'thân nhiều tầng đung đưa ngược pha, mảnh năng lượng lơ lửng'],
  molten_swell: [0.9, 0.2, 0.05, 0.1, 'thân phập phồng, dung nham chảy trong thân, khói đen'],
  gold_flow: [1.3, 0.25, 0.15, 0.06, 'chảy như vàng nóng, mảnh vàng xoay quanh'],
  prism_shift: [1.2, 0.2, 0.12, 0.08, 'sắc cầu vồng chảy theo dòng năng lượng'],
  star_glide: [1.0, 0.1, 0.4, 0.04, 'trôi như thiên thể, vòng lớn xoay quanh thân'],
  rune_float: [0.9, 0.12, 0.3, 0.05, 'bước chậm uy nghi, ký tự rune chạy trên bề mặt, tinh thể quay'],
};

export const VFX_GROUPS = {
  fire:      { name: 'Lửa', particles: ['lửa', 'tàn tro', 'dung nham', 'sóng nhiệt'], budget: { low: 6, mid: 14, high: 28 } },
  ice:       { name: 'Băng', particles: ['bông tuyết', 'sương lạnh', 'tinh thể băng', 'băng vỡ'], budget: { low: 6, mid: 14, high: 26 } },
  thunder:   { name: 'Sét', particles: ['tia điện', 'hồ quang', 'xung điện'], budget: { low: 5, mid: 12, high: 24 } },
  poison:    { name: 'Độc', particles: ['khói độc', 'bong bóng độc', 'vệt chất lỏng'], budget: { low: 6, mid: 14, high: 26 } },
  dark:      { name: 'Bóng tối', particles: ['khói đen', 'hố xoáy', 'hạt bóng tối'], budget: { low: 5, mid: 12, high: 24 } },
  light:     { name: 'Ánh sáng', particles: ['tia sáng', 'vòng hào quang', 'bụi sao'], budget: { low: 5, mid: 12, high: 24 } },
  earth:     { name: 'Đất', particles: ['bụi đất', 'đá vỡ', 'chấn động'], budget: { low: 5, mid: 12, high: 22 } },
  crystal:   { name: 'Pha lê', particles: ['ánh sáng khúc xạ', 'mảnh tinh thể', 'tia lấp lánh'], budget: { low: 5, mid: 12, high: 24 } },
  mutant:    { name: 'Đột biến', particles: ['xúc tu', 'chất lỏng biến dạng', 'gai mọc'], budget: { low: 5, mid: 12, high: 22 } },
  legendary: { name: 'Huyền thoại', particles: ['vòng ma thuật', 'năng lượng nhiều lớp', 'hạt sáng cao cấp'], budget: { low: 7, mid: 16, high: 32 } },
};
// Quy tắc VFX chung (renderer Giai đoạn 2 phải tuân theo)
export const VFX_RULES = { neverCoverBody: true, neverCoverPath: true, neverCoverHud: true, maxAlphaOverBody: 0.55, qualityLevels: ['low', 'mid', 'high'], globalParticleCap: { low: 120, mid: 320, high: 700 } };

export const ANIM_STATES = ['idle', 'move', 'hit', 'attack', 'skill', 'evolution', 'death'];
export const SKILL_ANIM_PHASES = ['prepare', 'activate', 'sustain', 'end'];

// Slime cũ (config/slimes.js) → ID mới, để chuyển tiếp mà không mất dữ liệu cũ
export const LEGACY_MAP = { green: 'green', blue: 'blue', red: 'red', gold: 'yellow', purple: null };

export const SLIMES_V2 = {};
// st = [hp, armor, speed, scale, reward]; pal = [main, sub, sub2, core, glow]
const N = (id, num, group, vi, en, st, sil, mat, pal, core, surface, particles, motion, skills, vfx, extra = {}) => {
  SLIMES_V2[id] = { id, num, group, name: vi, en, stats: { hp: st[0], armor: st[1], speed: st[2], scale: st[3], reward: st[4], radius: +(0.28 + st[3] * 0.06).toFixed(2), contactDamage: 1, attackCooldown: 1.0 },
    body: { silhouette: sil, material: mat, surface }, palette: { main: pal[0], sub: [pal[1], pal[2]], core: pal[3], glow: pal[4] },
    core: { design: GROUPS[group].core, ...core }, particles, motion: { style: motion[0], hit: motion[1], death: motion[2] }, skills, vfx, ...extra };
};

// ===== A. NORMAL =====
N('green', 1, 'normal', 'Slime xanh lá', 'Green Slime', [20, 0, 1.1, 1.0, 8], 'teardrop_wide_base', 'gelatin xanh lá trong suốt, bóng như thạch', ['#5fcf5a', '#9cf08f', '#3a9a3a', '#c8ffb0', '#7dff7d'],
  { shape: 'orb', note: 'lõi lục nhạt giữa thân' }, 'bong bóng khí nhỏ trôi trong thân', ['giọt gelatin bắn khi chạm đất'], ['squash_hop', 'wobble_dent', 'melt_splash'], [], 'light');
N('blue', 2, 'normal', 'Slime xanh dương', 'Blue Slime', [45, 0, 1.25, 1.1, 12], 'round_ripple_dome', 'nước biển trong suốt có chiều sâu', ['#4aa3f0', '#92d0ff', '#2b6fb8', '#7ee8ff', '#4de0ff'],
  { shape: 'orb', note: 'lõi cyan phát sáng' }, 'dòng chất lỏng xoáy, bong bóng, gợn sóng liên tục', ['vệt nước lấp lánh khi đi'], ['ripple_glide', 'ripple_dent', 'water_burst'], [], 'ice');
N('red', 3, 'normal', 'Slime đỏ', 'Red Slime', [170, 0.05, 1.55, 1.3, 22], 'stout_horned_blob', 'gelatin đỏ cam, vệt đậm như dung nham', ['#e0463e', '#ff8f85', '#9c2420', '#ff3b2f', '#ff6a3a'],
  { shape: 'orb', note: 'lõi đỏ rực nhấp nháy theo nhịp' }, 'vết nứt năng lượng phát sáng trên bề mặt', ['giọt năng lượng nóng rơi theo bước'], ['anger_swell', 'wobble_dent', 'ember_pop'], ['berserk'], 'fire');
N('yellow', 4, 'normal', 'Slime vàng', 'Yellow Slime', [300, 0, 1.9, 1.15, 25], 'small_bouncer_halo', 'vàng chanh pha ánh vàng kim', ['#f2c230', '#fff08a', '#b8860b', '#fffbe0', '#ffe14a'],
  { shape: 'orb', note: 'lõi vàng trắng' }, 'tia sáng và hạt năng lượng chuyển động bên trong', ['vòng sáng nhỏ xuất hiện quanh thân'], ['light_bounce', 'spark_dent', 'sparkle_pop'], [], 'light');

// ===== B. ELEMENTAL =====
N('fire', 5, 'elemental', 'Slime lửa', 'Fire Slime', [110, 0, 1.35, 1.25, 26], 'flame_crest_blob', 'gelatin đỏ cam chứa dung nham nóng chảy', ['#e8541e', '#ffb347', '#7a1d0c', '#fff2c0', '#ff7a1a'],
  { shape: 'flame', note: 'lõi dung nham đỏ trắng' }, 'vết nứt vàng cam; đỉnh bốc như ngọn lửa nhưng vẫn là slime', ['tàn tro', 'vệt lửa'], ['flame_lick', 'ember_dent', 'fire_burst_death'], ['fireball', 'burn_zone', 'fire_burst'], 'fire');
N('ice', 6, 'elemental', 'Slime băng', 'Ice Slime', [120, 0.08, 1.15, 1.25, 26], 'spiked_frost_dome', 'gelatin xanh băng pha trắng + tinh thể băng', ['#7fd3ff', '#eaf9ff', '#3a8fc0', '#aef0ff', '#6fe3ff'],
  { shape: 'hexagon', note: 'lõi băng lục giác phát sáng cyan' }, 'gai băng trên đỉnh và hai bên; bông tuyết, tinh thể nhỏ xoay chậm bên trong', ['bông tuyết', 'sương lạnh'], ['crystal_slide', 'shard_dent', 'ice_shatter'], ['frost_mist', 'ice_shard', 'ice_nova'], 'ice');
N('thunder', 7, 'elemental', 'Slime sét', 'Thunder Slime', [100, 0, 1.6, 1.2, 28], 'angular_sparking_blob', 'gelatin xanh điện / tím điện', ['#7a5cff', '#c9b8ff', '#3b2aa8', '#ffffff', '#9ad0ff'],
  { shape: 'sphere_hot', note: 'lõi cầu phát sáng mạnh' }, 'đường mạch điện chạy quanh thân, tia sét nhỏ phóng ra từ nhiều điểm', ['tia điện', 'hồ quang'], ['arc_jitter', 'shock_dent', 'overload_burst'], ['shock_pulse', 'magnetic_field', 'chain_lightning'], 'thunder');
N('earth', 8, 'elemental', 'Slime đất', 'Earth Slime', [160, 0.2, 0.9, 1.4, 28], 'rock_plated_mound', 'gelatin nâu đất xen đá và khoáng vật', ['#8a6a3a', '#c9a76b', '#4d3820', '#ffbf3a', '#ffcc55'],
  { shape: 'amber_stone', note: 'lõi đá hổ phách' }, 'phiến đá lớn xếp chồng như giáp, rễ khoáng và mảnh đá nổi quanh thân', ['bụi đất', 'đá vụn'], ['rumble_crawl', 'rock_dent', 'rock_crumble'], ['quake', 'stone_pillar', 'stone_armor'], 'earth');
N('poison', 9, 'elemental', 'Slime độc', 'Poison Slime', [105, 0, 1.2, 1.25, 27], 'bulbous_blister_blob', 'xanh độc pha tím, trong suốt cao', ['#6fd04a', '#b57be0', '#2f6e2a', '#b6ff4a', '#9bff4a'],
  { shape: 'droplet', note: 'lõi giọt độc neon' }, 'túi độc phồng xẹp, giọt độc chảy dọc thân, bong bóng độc phát sáng bên trong', ['khói độc xanh tím', 'giọt độc'], ['ooze_bubble', 'blister_pop_dent', 'toxic_pop'], ['poison_spit', 'poison_pool', 'poison_cloud', 'sticky_trail'], 'poison');
N('dark', 10, 'elemental', 'Slime bóng tối', 'Dark Slime', [130, 0.05, 1.3, 1.3, 30], 'tendril_shadow_dome', 'đen tím bóng như chất lỏng hắc ám', ['#2a1840', '#7c4bd8', '#0d0618', '#b46bff', '#9b5bff'],
  { shape: 'vortex', note: 'lõi tím đen bọc vòng năng lượng xoáy' }, 'vùng hấp thụ ánh sáng, tua bóng tối nhỏ, viền ánh tím ma thuật', ['khói đen', 'hạt bóng tối'], ['smear_phase', 'void_dent', 'shadow_implode'], ['shadow_clone', 'teleport', 'dark_vortex'], 'dark');
N('light', 11, 'elemental', 'Slime ánh sáng', 'Light Slime', [95, 0, 1.25, 1.2, 28], 'haloed_pearl_dome', 'trắng ngọc trai, trong suốt nhẹ', ['#fdf6e3', '#fff1a8', '#d8c9a0', '#fff6b0', '#fff2a0'],
  { shape: 'star_soft', note: 'lõi ánh sáng trắng vàng' }, 'điểm sáng như bụi sao, vòng năng lượng xoay quanh thân', ['tia sáng', 'bụi sao'], ['float_halo', 'sparkle_dent', 'light_dissolve'], ['energy_shield', 'heal_pulse', 'cleanse'], 'light');

// ===== C. ARMORED =====
N('stone_armor', 12, 'armored', 'Slime giáp đá', 'Stone Armor Slime', [210, 0.3, 0.95, 1.5, 32], 'plated_back_shell', 'gelatin xanh xám trong lớp giáp đá dày', ['#6f7f78', '#9eb0a8', '#3f4a46', '#6fe0ff', '#7fe8ff'],
  { shape: 'buried_gem', note: 'lõi chôn sâu, tỏa sáng qua khe giáp' }, 'phiến đá dày mỏng khác nhau bao đầu, lưng, hai bên; khe giáp phát sáng xanh', ['bụi đá khi bị đánh'], ['plated_march', 'plate_shake', 'plate_fall'], ['stone_armor', 'quake'], 'earth');
N('iron', 13, 'armored', 'Slime sắt', 'Iron Slime', [190, 0.35, 1.0, 1.4, 34], 'riveted_bulwark_blob', 'gelatin xám bạc bọc mảng kim loại có đinh tán', ['#8c97a3', '#cfd8e0', '#464f58', '#ffa43a', '#ffb347'],
  { shape: 'gear_core', note: 'lõi cam hoặc lam sau khung kim loại' }, 'vết xước, đinh tán, đường ghép cơ khí; khớp chuyển động theo độ đàn hồi', ['tia lửa kim loại'], ['clank_roll', 'metal_dent', 'plate_burst'], ['counter_strike', 'armor_up'], 'earth');
N('crystal', 14, 'armored', 'Slime pha lê', 'Crystal Slime', [170, 0.25, 1.05, 1.45, 36], 'faceted_crystal_spires', 'thạch trong suốt gồm nhiều mặt tinh thể', ['#9fe6ff', '#ffd1f4', '#7a8cff', '#ffffff', '#b8f0ff'],
  { shape: 'polyhedron', note: 'lõi đa diện phát sáng nhiều màu' }, 'khối tinh thể lớn mọc từ lưng và đỉnh, ánh sáng khúc xạ và lấp lánh', ['ánh sáng khúc xạ', 'mảnh tinh thể'], ['prism_roll', 'facet_dent', 'crystal_shatter'], ['crystal_shot', 'reflect_damage', 'crystal_split'], 'crystal');
N('thorn', 15, 'armored', 'Slime gai', 'Thorn Slime', [180, 0.15, 1.1, 1.4, 34], 'asym_thorn_ball', 'gelatin xanh đậm', ['#2f7a3a', '#7ad07a', '#14401e', '#c8ff6a', '#9cff5a'],
  { shape: 'seed', note: 'lõi hạt giống ẩn sau gai' }, 'gai bất đối xứng nhiều cỡ, cong khác nhau; gốc gai có đường năng lượng', ['gai nhỏ bắn khi trúng đòn'], ['thorn_sway', 'thorn_flare', 'thorn_burst'], ['thorn_reflect', 'thorn_shot', 'thorn_ring'], 'mutant');

// ===== D. MUTANT =====
N('tentacle', 16, 'mutant', 'Slime xúc tu', 'Tentacle Slime', [220, 0, 1.25, 1.5, 38], 'sphere_with_tentacles', 'gelatin tím hồng bóng, xúc tu co giãn', ['#b04ac8', '#f0a0ff', '#6a2480', '#ffd0ff', '#e070ff'],
  { shape: 'cluster', note: 'lõi trong thân chính được xúc tu che chắn' }, '4–8 xúc tu tách nhánh, đầu có giác hút hoặc gai năng lượng', ['chất lỏng biến dạng'], ['tentacle_crawl', 'tentacle_recoil', 'tentacle_unravel'], ['tentacle_lash', 'tentacle_pull', 'tentacle_field'], 'mutant');
N('multi_eye', 17, 'mutant', 'Slime nhiều mắt', 'Multi-Eye Slime', [200, 0, 1.4, 1.45, 40], 'eye_studded_orb', 'gelatin tím hoặc xanh đậm', ['#6a3fb0', '#a58aff', '#2a1a60', '#fff070', '#ffe14a'],
  { shape: 'iris_cluster', note: 'lõi trung tâm, mắt nhìn độc lập' }, 'nhiều mắt khác cỡ có tròng, đồng tử và ánh sáng riêng, đảo hướng độc lập', ['hạt sáng nơi mắt'], ['eye_scan', 'eye_squeeze', 'eye_burst'], ['eye_beam', 'hallucinate', 'evade'], 'mutant');
N('split', 18, 'mutant', 'Slime phân thể', 'Split Slime', [240, 0, 1.2, 1.5, 38], 'multi_lobed_cluster', 'gelatin nhiều thùy dính liền, hồng cam', ['#e08a4a', '#ffd0a0', '#9a4a20', '#ffe07a', '#ffc04a'],
  { shape: 'cluster_small', note: 'lõi chính và nhiều lõi phụ nhỏ' }, 'các thùy chuyển động độc lập nhưng liên kết', ['giọt gelatin'], ['lobe_wobble', 'lobe_squash', 'lobe_scatter'], ['split', 'fusion'], 'mutant');
N('spike_mutant', 19, 'mutant', 'Slime gai đột biến', 'Spike Mutant Slime', [320, 0.1, 1.1, 1.6, 44], 'bulging_muscle_spiked', 'gelatin đỏ tím phình cơ bất thường', ['#a83a6a', '#ff7aa8', '#4a1530', '#ff5a8a', '#ff4a7a'],
  { shape: 'pulse_cluster', note: 'lõi nhiều nhịp xung' }, 'gai mọc theo cụm dài ngắn khác nhau, vùng thân phát sáng đỏ tím', ['gai nhỏ bắn'], ['spike_lurch', 'bulge_dent', 'spike_burst'], ['charge_stab', 'spike_volley', 'berserk'], 'mutant');
N('void_mutant', 20, 'mutant', 'Slime hư không', 'Void Mutant Slime', [300, 0.1, 1.15, 1.6, 46], 'floating_fragment_body', 'gelatin méo mó, mảng thân lơ lửng nối bằng chất lỏng tối', ['#3a1e6a', '#8a5ae0', '#0a0420', '#e0b0ff', '#b070ff'],
  { shape: 'space_swirl', note: 'lõi xoáy không gian' }, 'viền thân biến dạng như hút ánh sáng', ['hạt hư không'], ['void_drift', 'void_warp', 'void_collapse_death'], ['teleport', 'gravity_zone', 'void_clone'], 'dark');

// ===== E. ELITE =====
N('berserker', 21, 'elite', 'Slime cuồng chiến', 'Berserker Slime', [520, 0.15, 1.5, 1.7, 70], 'muscled_spined_back', 'gelatin đỏ đen góc cạnh như cơ bắp', ['#a81a26', '#2a0a10', '#ff5a4a', '#ff2a1a', '#ff4a3a'],
  { shape: 'ringed_heart', note: 'lõi đỏ rực đập theo nhịp, có vòng năng lượng' }, 'khối gelatin nổi như lớp cơ; gai năng lượng dọc sống lưng; HP thấp thì toàn thân cháy năng lượng', ['tia năng lượng đỏ'], ['muscle_surge', 'brace_dent', 'rage_explode'], ['rage_aura', 'berserk'], 'fire');
N('vampire', 22, 'elite', 'Slime ma cà rồng', 'Vampire Slime', [480, 0.1, 1.35, 1.65, 72], 'fluid_tendril_crowned', 'tím đỏ bóng, dải chất lỏng đen', ['#7a1a4a', '#16060f', '#d04a7a', '#8a0a1a', '#d03a5a'],
  { shape: 'ringed_drop', note: 'lõi đỏ sẫm có vòng năng lượng mạch máu' }, 'vân mạch máu năng lượng, tua chất lỏng vươn hút năng lượng', ['giọt đỏ sẫm'], ['fluid_stalk', 'recoil_blood', 'blood_pool'], ['lifesteal_aura', 'blood_drain', 'blood_clone'], 'dark');
N('phantom', 23, 'elite', 'Slime ma', 'Phantom Slime', [400, 0, 1.55, 1.6, 74], 'mist_tailed_ghost_dome', 'xanh tím trong suốt, tan thành sương', ['#6a7aff', '#c9a8ff', '#2a2a80', '#d8e0ff', '#a8b8ff'],
  { shape: 'ringed_dim', note: 'lõi mờ phát sáng yếu' }, 'một phần thân tan thành sương rồi tái tạo, bóng ảnh phía sau', ['sương mờ'], ['mist_drift', 'phase_flicker', 'mist_vanish'], ['cloak', 'illusion', 'evade'], 'dark');
N('regeneration', 24, 'elite', 'Slime tái tạo', 'Regeneration Slime', [600, 0.1, 1.1, 1.7, 76], 'layered_tiers_dome', 'xanh ngọc, nhiều lớp gelatin chồng', ['#3ad0a0', '#a0ffe0', '#1a7a60', '#d0fff0', '#7fffd0'],
  { shape: 'multi_ring', note: 'lõi nhiều vòng năng lượng' }, 'vùng bị thương tự khép bằng chất lỏng phát sáng, các lớp dồn nhau', ['hạt xanh hồi phục'], ['layer_pulse', 'layer_press', 'layer_unspool'], ['regeneration', 'heal_pulse'], 'light');
N('overlord', 25, 'elite', 'Slime chúa tể', 'Overlord Slime', [900, 0.2, 0.85, 1.9, 100], 'tiered_giant_crowned', 'thân khổng lồ nhiều tầng gelatin, tinh thể lớn trên lưng', ['#6a3ab8', '#ffd24a', '#2a1060', '#ffc83a', '#ffb05a'],
  { shape: 'ringed_crown', note: 'lõi vàng tím, vòng hào quang và mảnh năng lượng lơ lửng' }, 'tinh thể lớn và gai năng lượng mọc trên lưng, hào quang bao quanh', ['mảnh năng lượng lơ lửng'], ['tier_sway', 'crown_flare', 'crown_collapse'], ['absorb', 'summon', 'energy_shield'], 'legendary');

// ===== F. LEGENDARY =====
N('golden', 26, 'legendary', 'Slime vàng kim', 'Golden Slime', [800, 0.2, 1.3, 1.8, 160], 'molten_gold_pool_dome', 'vàng kim trong suốt như vàng nóng chảy', ['#f5c518', '#fff3a0', '#a67c00', '#fffbe8', '#ffe14a'],
  { shape: 'faceted_sun', note: 'lõi đa tầng vàng trắng' }, 'vân kim loại chạy bên trong, mảnh vàng nhỏ xoay quanh thân', ['mảnh vàng xoay'], ['gold_flow', 'gold_ripple', 'gold_scatter'], ['gold_shield', 'gold_clone', 'empower'], 'legendary');
N('rainbow', 27, 'legendary', 'Slime cầu vồng', 'Rainbow Slime', [750, 0.1, 1.35, 1.8, 170], 'prism_layered_dome', 'trong suốt nhiều lớp màu cầu vồng chuyển động', ['#ff6ab0', '#6affd0', '#6a8aff', '#ffffff', '#ffd06a'],
  { shape: 'faceted_multicolor', note: 'lõi đa sắc phát sáng mạnh' }, 'màu chạy theo dòng năng lượng, hạt sáng nhiều màu bay quanh', ['hạt nhiều màu'], ['prism_shift', 'color_ripple', 'prism_burst'], ['element_shift', 'chain_lightning', 'fire_burst', 'ice_nova'], 'legendary');
N('celestial', 28, 'legendary', 'Slime thiên thể', 'Celestial Slime', [850, 0.2, 1.1, 1.85, 175], 'ringed_orb_halo', 'trắng xanh ngọc như tinh thể thiên thể', ['#d8f4ff', '#8ae0d8', '#3a6a9a', '#fff7b0', '#bfeaff'],
  { shape: 'multi_point_star', note: 'lõi hình ngôi sao nhiều cánh' }, 'vòng năng lượng lớn xoay quanh thân, bụi vũ trụ', ['bụi vũ trụ'], ['star_glide', 'ring_wobble', 'nova_fade'], ['energy_field', 'heal_pulse', 'star_beam'], 'light');
N('infernal', 29, 'legendary', 'Slime địa ngục', 'Infernal Slime', [950, 0.25, 1.15, 1.9, 180], 'spiked_crown_molten', 'đen đỏ có dung nham chảy bên trong', ['#2a0a0a', '#ff4a1a', '#ff9a3a', '#fff0d0', '#ff5a1a'],
  { shape: 'faceted_star', note: 'lõi đỏ trắng cực sáng' }, 'đỉnh nhô như vương miện gai năng lượng, khói đen và tàn lửa liên tục', ['khói đen', 'tàn lửa'], ['molten_swell', 'ember_dent', 'core_reignite'], ['fire_burst', 'lava_zone', 'rebirth'], 'fire');
N('ancient', 30, 'legendary', 'Slime cổ đại', 'Ancient Slime', [1000, 0.25, 1.0, 1.9, 200], 'rune_tiered_monolith', 'xanh tím cổ đại, cấu trúc nhiều lớp, khắc rune phát sáng', ['#4a5ab8', '#a58aff', '#1a1a50', '#8affd0', '#7a8aff'],
  { shape: 'faceted_polyhedron', note: 'lõi cổ đại đa diện' }, 'ký tự ma thuật phát sáng, mảnh tinh thể và vòng rune xoay quanh', ['rune', 'mảnh tinh thể'], ['rune_float', 'rune_flare', 'rune_unravel'], ['time_warp', 'illusion', 'skill_lock'], 'legendary');

export const SLIME_IDS = Object.keys(SLIMES_V2);
export const idsOfGroup = (g) => SLIME_IDS.filter((id) => SLIMES_V2[id].group === g);
// Bộ hoạt ảnh của một slime: dùng chung 7 trạng thái nhưng thông số lấy từ phong cách riêng của slime đó
export function animSetOf(id) {
  const s = SLIMES_V2[id], m = MOTION_STYLES[s.motion.style], hasSkills = s.skills.length > 0;
  return { idle: { wobble: m[3], coreBeat: true }, move: { hopHz: m[0], squash: m[1], hang: m[2], note: m[4] }, hit: { style: s.motion.hit, coreFlash: 0.12 },
    attack: { windup: 0.25, release: 0.1 }, skill: hasSkills ? Object.fromEntries(SKILL_ANIM_PHASES.map((p) => [p, true])) : null, evolution: s.skills.includes('evolution') || s.group === 'legendary' || s.group === 'elite' ? { shake: 1.2, burst: true } : null, death: { style: s.motion.death, coreCrack: true } };
}
// Kiểm tra tham chiếu kỹ năng (dùng trong test)
export const missingSkills = () => SLIME_IDS.flatMap((id) => SLIMES_V2[id].skills.filter((k) => !SKILLS_SLIME[k]).map((k) => `${id}:${k}`));
