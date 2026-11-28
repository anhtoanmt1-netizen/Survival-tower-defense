import { STATUS, CC_IMMUNITY, INTERACTIONS as IX } from '../config/slimeStatus.js';
// HỆ THỐNG HIỆU ỨNG TRẠNG THÁI thuần (không Phaser, không rng) gắn vào từng slime: Burn, Freeze, Poison, Shock, Slow, Stun, Shield.
// Cách dùng: const s = new StatusSet({ maxHp, tenacity, immune }); s.apply('burn', {dps, dur}); mỗi khung: ev = s.update(dt).
// update() trả về danh sách sự kiện để thế giới áp dụng: {type:'dot', status, dmg} (người gọi tự trừ máu), {type:'expire', status}, {type:'shieldBreak'}...
// Chưa nối vào MonsterWorld (Giai đoạn 2) nên gameplay hiện tại không đổi.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export class StatusSet {
  // tenacity 0..1: giảm thời lượng khống chế (boss cao). immune: danh sách trạng thái miễn nhiễm hoàn toàn.
  constructor({ maxHp = 100, tenacity = 0, immune = [] } = {}) {
    this.maxHp = maxHp; this.tenacity = clamp(tenacity, 0, 1); this.immune = new Set(immune); this.reset();
  }
  reset() {
    this.s = { burn: null, freeze: null, poison: null, shock: null, slow: null, stun: null, shield: null }; this.ccImmune = 0; this.tickAcc = { burn: 0, poison: 0 }; this.pending = [];
  }
  has(id) { return !!this.s[id]; }
  get(id) { return this.s[id]; }
  // ---- áp hiệu ứng. Trả về {applied, reason?} ----
  apply(id, cfg = {}) {
    const def = STATUS[id]; if (!def) return { applied: false, reason: 'unknown' };
    if (this.immune.has(id)) return { applied: false, reason: 'immune' };
    if (id !== 'shield' && this.has('shield')) return { applied: false, reason: 'shield' }; // khiên chặn hiệu ứng xấu
    if (def.cc && this.ccImmune > 0) return { applied: false, reason: 'ccImmune' };
    let dur = Math.min(def.maxDur, cfg.dur ?? 1); if (def.cc) dur *= 1 - this.tenacity; if (dur <= 0) return { applied: false, reason: 'tenacity' };
    const S = this.s;
    switch (id) {
      case 'burn': {
        if (S.freeze) { // lửa tan băng: nổ hơi nước
          const dps = cfg.dps ?? 0, steam = dps * IX.meltFreezeByBurn.bonusDmgPerDps; S.freeze = null; this.pending.push({ type: 'react', name: 'melt', dmg: steam, status: 'freeze' });
          return { applied: false, reason: 'melt', reaction: 'melt', dmg: steam };
        }
        if (S.poison && S.poison.stacks > 0) { // hơi độc bùng cháy
          const dmg = S.poison.stacks * (cfg.dps ?? 0) * IX.igniteFumes.dmgPerStackPerDps; S.poison = null; this.pending.push({ type: 'react', name: 'fumes', dmg, status: 'poison' });
          this.setBurn(cfg, dur); return { applied: true, reaction: 'fumes', dmg };
        }
        this.setBurn(cfg, dur); return { applied: true };
      }
      case 'freeze': {
        if (S.burn) { S.burn = null; this.apply('slow', { pct: IX.quenchBurnByFreeze.slowPct, dur: IX.quenchBurnByFreeze.slowDur }); return { applied: false, reason: 'quench', reaction: 'quench' }; }
        S.freeze = { t: dur, dur }; return { applied: true };
      }
      case 'poison': {
        const stacks = Math.min(STATUS.poison.maxStacks, (S.poison?.stacks ?? 0) + (cfg.stacks ?? 1)), dps = Math.max(S.poison?.dps ?? 0, cfg.dps ?? 3);
        S.poison = { stacks, dps, t: Math.max(S.poison?.t ?? 0, dur), dur }; return { applied: true, stacks };
      }
      case 'shock': {
        if (S.freeze) { const r = IX.shatterFreezeByShock; S.freeze = null; this.pending.push({ type: 'react', name: 'shatter', dmgMulOfHit: r.dmgMul, status: 'freeze' }); this.apply('stun', { dur: r.stun }); return { applied: false, reason: 'shatter', reaction: 'shatter' }; }
        S.shock = { t: dur, dur, mark: true };
        if (S.slow) this.apply('stun', { dur: IX.shockOnSlow.stun });
        return { applied: true };
      }
      case 'slow': { const pct = clamp(cfg.pct ?? 0.3, 0, STATUS.slow.maxPct); if (!S.slow || pct >= S.slow.pct) S.slow = { pct, t: dur, dur }; else S.slow.t = Math.max(S.slow.t, dur); return { applied: true }; }
      case 'stun': S.stun = { t: dur, dur }; return { applied: true };
      case 'shield': { const hp = cfg.hp ?? this.maxHp * 0.25; if (!S.shield || hp >= S.shield.hp) S.shield = { hp, max: hp, t: dur }; else S.shield.t = Math.max(S.shield.t, dur); return { applied: true }; }
    }
    return { applied: false };
  }
  setBurn(cfg, dur) { const old = this.s.burn; this.s.burn = { dps: Math.max(old?.dps ?? 0, cfg.dps ?? 4), t: Math.max(old?.t ?? 0, dur), dur }; }
  // ---- xóa hiệu ứng (kỹ năng Giải/Hồi phục) ----
  cleanse(list = ['burn', 'freeze', 'poison', 'shock', 'slow', 'stun']) { const out = []; for (const id of list) if (this.s[id]) { this.s[id] = null; out.push(id); } return out; }
  // ---- truy vấn trạng thái cho mô phỏng ----
  canMove() { return !this.s.freeze && !this.s.stun; }
  canCast() { return !this.s.freeze && !this.s.stun; }
  speedMul() { return this.canMove() ? 1 - (this.s.slow?.pct ?? 0) : 0; }
  healMul() { return this.s.poison ? IX.poisonHealMul : 1; }
  // Hệ số sát thương nhận vào: đóng băng +20%. Dấu giật điện cộng 25% một lần (consume=true sẽ xóa dấu).
  damageTakenMul(consume = false) {
    let m = 1; if (this.s.freeze) m *= IX.frozenDamageMul;
    if (this.s.shock?.mark) { m *= 1 + IX.shockMarkDamage; if (consume) this.s.shock.mark = false; }
    return m;
  }
  // Khiên hấp thụ trước. Trả {through, absorbed, broke}: through = sát thương còn lại trừ vào máu.
  absorb(dmg) {
    const sh = this.s.shield; if (!sh || dmg <= 0) return { through: dmg, absorbed: 0, broke: false };
    const a = Math.min(sh.hp, dmg); sh.hp -= a; const broke = sh.hp <= 0; if (broke) { this.s.shield = null; this.pending.push({ type: 'shieldBreak' }); }
    return { through: dmg - a, absorbed: a, broke };
  }
  // Tổng xử lý một đòn đánh: nhân hệ số, trừ khiên; trả sát thương lên máu thật.
  hit(dmg, { trueDamage = false } = {}) {
    if (trueDamage) return { through: dmg, absorbed: 0, broke: false };
    const d = dmg * this.damageTakenMul(true); return this.absorb(d);
  }
  update(dt) {
    const ev = this.pending; this.pending = []; const S = this.s;
    this.ccImmune = Math.max(0, this.ccImmune - dt);
    for (const id of ['burn', 'poison']) { // sát thương theo nhịp
      const st = S[id]; if (!st) continue; this.tickAcc[id] += dt; const tick = STATUS[id].tick;
      while (this.tickAcc[id] >= tick) { this.tickAcc[id] -= tick; const dmg = st.dps * (id === 'poison' ? st.stacks : 1) * tick; ev.push({ type: 'dot', status: id, dmg }); }
    }
    for (const id of Object.keys(S)) {
      const st = S[id]; if (!st) continue; st.t -= dt;
      if (st.t <= 0) { S[id] = null; ev.push({ type: 'expire', status: id }); if (STATUS[id].cc) this.ccImmune = Math.max(this.ccImmune, CC_IMMUNITY); if (id === 'burn' || id === 'poison') this.tickAcc[id] = 0; }
    }
    return ev;
  }
}
