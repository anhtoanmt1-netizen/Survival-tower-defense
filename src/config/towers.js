// Tháp & nhánh kỹ năng. Thêm tháp mới: thêm vào TOWER_TYPES. Thêm nhánh: thêm vào BRANCHES.
export const TOWER_TYPES = {
  archer: {
    id: 'archer', name: 'Tháp cung tên', maxLevel: 15, milestones: [3, 5, 7, 9, 12, 15], // cấp mở khóa chọn nhánh
    base: { damage: 8, range: 3.5, fireRate: 1.0, arrows: 1, critChance: 0.05, critMult: 1.5 },
    perLevel: { damage: 1.18, range: 0.25, fireRate: 1.07 }, // damage, fireRate: nhân; range: cộng (ô)
    arrowSpeed: 11, fanAngle: 0.22,
  },
};
// effect: add = cộng dồn; set = lấy giá trị bậc cao nhất
export const BRANCHES = {
  volley: { name: 'Mũi tên liên hoàn', icon: '🏹', color: '#e0b13a', desc: 'Nhiều mũi tên, bắn nhanh, chí mạng.', tiers: [
    { text: 'Bắn 2 mũi tên cùng lúc', add: { arrows: 1 } },
    { text: '+15% tốc độ bắn', add: { fireRatePct: 0.15 } },
    { text: '+10% tỷ lệ chí mạng', add: { critChance: 0.10 } },
    { text: '+0,5 sát thương chí mạng', add: { critMult: 0.5 } },
    { text: '3 mũi tên theo hình quạt', add: { arrows: 1 } },
    { text: '+20% tốc độ bắn, +10% chí mạng', add: { fireRatePct: 0.2, critChance: 0.1 } },
  ] },
  frost: { name: 'Mũi tên băng', icon: '❄️', color: '#5ab4f0', desc: 'Làm chậm và khống chế quái vật.', tiers: [
    { text: 'Làm chậm 25% trong 1,5s', set: { slowPct: 0.25 }, add: { slowDur: 1.5 } },
    { text: '+1s thời gian làm chậm', add: { slowDur: 1 } },
    { text: 'Băng lan: làm chậm quái trong 1 ô quanh mục tiêu', set: { slowRadius: 1 } },
    { text: 'Làm chậm 40%', set: { slowPct: 0.4 } },
    { text: 'Phạm vi băng 1,8 ô, +0,5s', set: { slowRadius: 1.8 }, add: { slowDur: 0.5 } },
    { text: 'Làm chậm 55%, +1s', set: { slowPct: 0.55 }, add: { slowDur: 1 } },
  ] },
  burn: { name: 'Mũi tên thiêu đốt', icon: '🔥', color: '#e8643a', desc: 'Sát thương cháy theo thời gian, lan lửa.', tiers: [
    { text: 'Gây cháy: 4 sát thương/s trong 3s', add: { burnDps: 4, burnDur: 3 } },
    { text: '+3 sát thương cháy/s', add: { burnDps: 3 } },
    { text: '+2s thời gian cháy', add: { burnDur: 2 } },
    { text: 'Slime cháy chết có 35% lan lửa trong 1,8 ô', set: { spreadChance: 0.35, spreadRadius: 1.8 } },
    { text: '+4 sát thương cháy/s', add: { burnDps: 4 } },
    { text: 'Lan lửa 60%, bán kính 2,5 ô, +1s', set: { spreadChance: 0.6, spreadRadius: 2.5 }, add: { burnDur: 1 } },
  ] },
};
export const BRANCH_IDS = Object.keys(BRANCHES);
export const pendingPicks = (type, level, picks) => TOWER_TYPES[type].milestones.filter((m) => m <= level).length - picks.length;
// Chỉ số cuối cùng của tháp theo cấp + các nhánh đã chọn (theo thứ tự chọn)
export function computeStats(type, level, picks) {
  const T = TOWER_TYPES[type], b = T.base, L = level - 1;
  const s = { damage: b.damage * Math.pow(T.perLevel.damage, L), range: b.range + T.perLevel.range * L, fireRate: b.fireRate * Math.pow(T.perLevel.fireRate, L),
    arrows: b.arrows, critChance: b.critChance, critMult: b.critMult, slowPct: 0, slowDur: 0, slowRadius: 0, burnDps: 0, burnDur: 0, spreadChance: 0, spreadRadius: 0, arrowSpeed: T.arrowSpeed, fanAngle: T.fanAngle };
  let ratePct = 0; const tier = {};
  for (const id of picks) {
    const t = BRANCHES[id].tiers[tier[id] = (tier[id] ?? -1) + 1]; if (!t) continue;
    for (const [k, v] of Object.entries(t.add || {})) { if (k === 'fireRatePct') ratePct += v; else s[k] += v; }
    Object.assign(s, t.set || {});
  }
  s.fireRate *= 1 + ratePct; s.critChance = Math.min(1, s.critChance); s.tiers = tier; s.kind = s.burnDps ? 'fire' : s.slowPct ? 'ice' : 'arrow';
  return s;
}
