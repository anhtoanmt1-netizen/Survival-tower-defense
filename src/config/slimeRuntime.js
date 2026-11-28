// CẦU NỐI danh mục Slime V2 → mô phỏng/hiển thị chế độ đơn. Quái V2 có type 'v2_<id>' để không đụng config/slimes.js (multiplayer + checksum giữ nguyên).
// Giai đoạn 2: chỉ các slime/boss ở RUNTIME_IDS (wave 1–30) chạy bằng hệ mới; wave > maxWave vẫn dùng hệ cũ cho tới khi các giai đoạn sau hoàn thành.
import { SLIMES_V2 } from './slimeCatalog.js';
import { BOSSES } from './slimeBosses.js';
export const SLIME_V2 = {
  enabled: true,        // false = toàn bộ chế độ đơn quay về slime cũ
  maxWave: 100,         // toàn bộ 100 wave dùng hệ mới (đặt thấp hơn để quay lại slime cũ từ wave đó)
  hpScale: 0.6,         // hp catalog (đã cao hơn slime cũ) nhân thêm hệ số này khi vào game; cân bằng lại bằng tools/balance.mjs
  bossHpScale: 0.45,
  maxActiveHard: 200,   // trần cứng quái đồng thời kể cả quái do kỹ năng sinh ra
  skillDamage: 1,       // sát thương kỹ năng quái lên người chơi (tim) — dùng chung miễn thương 1,2s của người chơi
};
export const RUNTIME_IDS = ['green', 'blue', 'red', 'yellow', 'fire', 'ice', 'earth', 'stone_armor', 'thorn', 'ancient_king', 'frost_emperor', 'inferno_titan',
  // Giai đoạn 3
  'thunder', 'poison', 'dark', 'light', 'iron', 'crystal', 'tentacle', 'multi_eye', 'split', 'spike_mutant', 'void_mutant', 'berserker', 'vampire', 'phantom', 'regeneration', 'overlord', 'golden', 'rainbow', 'celestial', 'infernal', 'ancient',
  'thunder_lord', 'abyssal_horror', 'crystal_colossus', 'plague_overlord', 'golden_devourer', 'chaos_rainbow', 'primordial'];
// Kỹ năng thực sự chạy ở Giai đoạn 2 (các kỹ năng còn lại chờ giai đoạn sau). Kỹ năng tác động lên tháp/đồng minh khác chưa có.
export const RUNTIME_SKILLS = {
  green: [], blue: [], yellow: [], red: ['berserk'],
  fire: ['fireball', 'fire_burst'], ice: ['ice_shard', 'ice_nova'], earth: ['quake', 'stone_armor'], stone_armor: ['stone_armor', 'quake'], thorn: ['thorn_shot', 'thorn_ring'],
};
// Miễn nhiễm hiệu ứng (tạo khác biệt chiến thuật): slime lửa không cháy, slime băng không đóng băng; boss kháng khống chế mạnh.
export const RUNTIME_IMMUNE = { fire: ['burn'], ice: ['freeze'], inferno_titan: ['burn', 'freeze'], frost_emperor: ['freeze'], ancient_king: ['freeze'],
  thunder: ['shock'], poison: ['poison'], infernal: ['burn'], iron: ['shock'], thunder_lord: ['shock', 'freeze'], plague_overlord: ['poison', 'freeze'], golden_devourer: ['freeze'], chaos_rainbow: ['freeze'], primordial: ['freeze', 'burn', 'poison', 'shock'], abyssal_horror: ['freeze'], crystal_colossus: ['freeze'] };
export const BOSS_TENACITY = 0.6;
export const v2Type = (id) => 'v2_' + id;
export const isV2Type = (t) => typeof t === 'string' && t.startsWith('v2_');
export const v2Id = (t) => t.slice(3);
export const isRuntimeId = (id) => RUNTIME_IDS.includes(id);
// Trả về cấu hình dạng cũ ({name,hp,speed,radius,scale,reward,attackCooldown}) cộng phần mở rộng, hoặc null nếu không phải quái V2.
const cache = {};
export function runtimeCfg(type) {
  if (!isV2Type(type)) return null; if (cache[type]) return cache[type];
  const id = v2Id(type), s = SLIMES_V2[id], b = BOSSES[id], d = s || b; if (!d) return null;
  const st = d.stats, boss = !!b;
  return (cache[type] = { v2: true, id, boss, group: d.group, name: d.name, hp: st.hp * (boss ? SLIME_V2.bossHpScale : SLIME_V2.hpScale), speed: st.speed, radius: st.radius, scale: st.scale, reward: st.reward, attackCooldown: st.attackCooldown,
    armor: st.armor, palette: d.palette, vfx: d.vfx ?? b?.vfx, minions: boss ? b.minions.filter(isRuntimeId) : null, skills: boss ? [] : RUNTIME_SKILLS[id] ?? s.skills ?? [], phases: boss ? b.phases : null, immune: RUNTIME_IMMUNE[id] ?? [], tenacity: boss ? BOSS_TENACITY : 0 });
}
