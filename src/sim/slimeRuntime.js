import { SKILLS_SLIME } from '../config/slimeSkills.js';
import { SLIME_V2, v2Type, isRuntimeId } from '../config/slimeRuntime.js';
// RUNTIME KỸ NĂNG SLIME V2 (thuần, không Phaser). Quái tự quyết định khi nào niệm kỹ năng; có thời gian niệm (telegraph) để người chơi kịp né.
// Giai đoạn 2 hỗ trợ: projectile · zone (tròn/vòng, tức thì hoặc kéo dài) · aura gây sát thương quanh thân · buff (berserk, giáp đá…) · shield · summon ·
// spawnSplit · drain (hút slime đồng bạn) · chuyển pha boss. Mọi sát thương lên người chơi dùng player.takeDamage (miễn thương 1,2s như cũ) và trả sự kiện
// {type:'hit'} cùng kênh với va chạm thường, nên UI/âm thanh/rung không phải đổi. Hooks (tùy chọn) cho bộ vẽ: onCast, onFire, onPhase, onSummon.
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ELEM_TINT = { fire: 0xff7a2a, ice: 0x7ad8ff, thunder: 0xffe65a, poison: 0x7aff5a, dark: 0xb46bff };
const HOLD = new Set(['zone', 'summon', 'shield', 'drain', 'aura', 'chain', 'teleport', 'transform']); // đứng yên khi niệm: dễ đọc và công bằng
export class SlimeRuntime {
  constructor(world, rng, hooks = {}) { this.world = world; this.rng = rng; this.hooks = hooks; this.zones = []; this.projs = []; }
  // ---------- gắn/gỡ ----------
  attach(m) {
    m.rngf = this.rng; m.sk = { list: [], lifesteal: 0, rage: null, rebirth: null, reborn: false, phase: -1, splits: new Set(), buffs: [], minions: [], casting: null, owner: null };
    if (m.cfg.boss) this.enterPhase(m, 0); else this.addSkills(m, m.cfg.skills);
  }
  addSkills(m, ids) {
    for (const id of ids) {
      const def = SKILLS_SLIME[id]; if (!def || m.sk.list.some((k) => k.id === id)) continue; const e = def.effect;
      if (e.type === 'transform') { if (e.kind === 'rebirth') m.sk.rebirth = { ...e, used: false }; if (!['fusion', 'elementShift'].includes(e.kind)) continue; } // rebirth: hồi sinh 1 lần; các biến hình khác áp dụng ở chuyển pha
      if (e.type === 'aura' && e.passive) { this.zones.push({ x: m.x, y: m.y, r: e.radius ?? 3, t: Infinity, tick: 0.5, acc: 0, owner: m, def, follow: true }); continue; } // sương độc bị động: vùng đi theo boss tới khi chết
      if (e.passive) { if (e.healPctOfDmg) m.sk.lifesteal = e.healPctOfDmg; if (e.trigger?.hpBelow) m.sk.rage = { at: e.trigger.hpBelow, speedMul: e.speedMul || 1, on: false }; continue; }
      if (e.type === 'zone' && !['circle', 'ring', 'cone'].includes(e.shape)) continue; // đường: chưa hỗ trợ (quạt chạy như vòng tròn nhỏ tại chỗ người chơi)
      if (e.type === 'aura' && !['enemies', 'allies'].includes(e.targets)) continue;
      if (!['projectile', 'zone', 'aura', 'self', 'buff', 'shield', 'summon', 'spawnSplit', 'drain', 'chain', 'teleport', 'debuff', 'transform'].includes(e.type)) continue; // debuff lên tháp, fusion, đổi nguyên tố: giai đoạn sau
      if (e.type === 'drain' && !['allySlime', 'player', 'towers'].includes(e.target)) continue;
      if (e.type === 'debuff' && !((e.targets === 'towers' && (e.missChance || e.disableBranchEffects)) || e.pull)) continue; // debuff khác (kéo người chơi…): chưa hỗ trợ
      const boss = m.cfg.boss, cd = e.type === 'spawnSplit' && boss ? 20 : def.cooldown || 25;
      m.sk.list.push({ id, def, cd: cd * (0.3 + 0.5 * this.rng()), cooldown: cd, state: 'ready', t: 0, target: null });
    }
  }
  // ---------- phụ trợ ----------
  hurt(p, m, events) { if (p.takeDamage(this.world.contactDamage * SLIME_V2.skillDamage)) { events.push({ type: 'hit', monster: m, player: p, skill: true }); if (m.sk?.lifesteal && !m.dying) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.1 * m.sk.lifesteal * m.status.healMul()); } }
  nearest(m, players) { let b = null, bd = Infinity; for (const p of players) { const d = dist(p, m); if (d < bd) { bd = d; b = p; } } return b ? { p: b, d: bd } : null; }
  recalc(m) {
    const bs = m.sk.buffs; let a = m.armorBase, sp = 1, sc = 1, dg = 0, al = 1, iv = false; for (const b of bs) { a += b.armorAdd || 0; sp *= b.speedMul || 1; sc *= b.scaleMul || 1; dg += b.dodge || 0; if (b.invuln) iv = true; if (b.alpha) al = Math.min(al, b.alpha); }
    if (!bs.some((b) => b.elem) && !m.sk.elemT) m.tint = 0; m.invuln = iv; m.dodge = clamp(dg, 0, 0.6); m.alpha = al; m.armor = clamp(a, 0, 0.8); m.buffSpeed = sp; m.scale = m.cfg.scale * sc * (m.childScale || 1);
  }
  addBuff(m, id, t, o) { const old = m.sk.buffs.find((b) => b.id === id); if (old) { old.t = Math.max(old.t, t); } else m.sk.buffs.push({ id, t, ...o }); this.recalc(m); }
  hasBuff(m, id) { return m.sk.buffs.some((b) => b.id === id); }
  minionCount(m) { return m.sk.minions.filter((x) => x.alive && !x.dying && x.sk && x.sk.owner === m).length; }
  walkableNear(x, y) { const g = this.world.grid; for (let t = 0; t < 8; t++) { const a = this.rng() * 6.283, r = 0.6 + this.rng() * 0.6, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (g.isWalkable(Math.floor(px), Math.floor(py))) return { x: px, y: py }; } return { x, y }; }
  // ---------- boss: chuyển pha ----------
  enterPhase(m, i) {
    const ph = m.cfg.phases[i]; m.sk.phase = i; this.addSkills(m, ph.skills);
    for (const id of ph.skills) { const e = SKILLS_SLIME[id]?.effect; if (e?.type !== 'transform' || e.kind !== 'bossPhase') continue;
      const st = e.statMul || {}, b = { armorAdd: st.armor ?? 0, speedMul: 1 + ((st.damage ?? 1) - 1) * 0.4, scaleMul: e.spikes ? 1.15 : e.scaleMul ?? 1 };
      this.addBuff(m, 'phase:' + id, Infinity, b);
      if (e.voidZoneRadius) this.zones.push({ x: m.x, y: m.y, r: e.voidZoneRadius, t: Infinity, tick: 0.5, acc: 0, owner: m, def: SKILLS_SLIME[id], follow: true }); // vùng hư không sống bám quanh boss
      if (e.absorbTargets) this.absorb(m, e.absorbTargets, 6);
      if (e.elementsAtOnce) m.sk.rainbow = true; }
    this.hooks.onPhase?.(m, ph, i === 0);
  }
  // ---------- mỗi bước mô phỏng ----------
  update(dt, players) {
    const events = [], world = this.world; this.playersNow = players;
    for (let i = this.zones.length - 1; i >= 0; i--) { // vùng kéo dài
      const z = this.zones[i]; if (z.owner && (!z.owner.alive || z.owner.dying)) { this.zones.splice(i, 1); continue; }
      z.t -= dt; if (z.follow) { z.x = z.owner.x; z.y = z.owner.y; } if (z.tower) { if (z.t <= 0) this.zones.splice(i, 1); continue; } z.acc += dt;
      while (z.acc >= z.tick) { z.acc -= z.tick; if (z.def.effect.targets === 'allies') { this.support(z.owner, z.def.effect, z.def, z, z.tick); continue; } for (const p of players) if (dist(p, z) <= z.r + (p.r ?? 0.3)) this.hurt(p, z.owner, events); }
      if (z.t <= 0) this.zones.splice(i, 1);
    }
    for (let i = this.projs.length - 1; i >= 0; i--) { // đạn
      const q = this.projs[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; let end = q.life <= 0;
      if (!end && !world.grid.isWalkable(Math.floor(q.x), Math.floor(q.y))) end = true; // tháp/tường/cây chắn đạn
      if (!end) for (const p of players) if (!p.dead && dist(p, q) <= q.r + (p.r ?? 0.3)) { this.hurt(p, q.owner, events); end = true; break; }
      if (end) { if (q.splash && q.owner) for (const p of players) if (!p.dead && dist(p, q) <= q.splash) this.hurt(p, q.owner, events); this.projs.splice(i, 1); this.hooks.onProjEnd?.(q); }
    }
    for (const m of world.monsters.slice()) {
      if (!m.v2 || m.dying || !m.sk) continue; const sk = m.sk;
      if (sk.reborn) { sk.reborn = false; const st = sk.rebirth.statMul || {}; this.addBuff(m, 'rebirth', Infinity, { speedMul: st.speed ?? 1, armorAdd: 0 }); this.hooks.onRebirth?.(m); }
      if (sk.rage && !sk.rage.on && m.hp / m.maxHp <= sk.rage.at) { sk.rage.on = true; this.addBuff(m, 'rage', Infinity, { speedMul: sk.rage.speedMul }); this.hooks.onRage?.(m); }
      if (sk.elemT > 0) { sk.elemT -= dt; if (sk.elemT <= 0) { m.tint = 0; sk.elemT = 0; } }
      for (const b of sk.buffs) if (b.elem) { b.elem.t += dt; if (b.elem.t >= b.elem.sec) { b.elem.t = 0; b.elem.i = (b.elem.i + 1) % b.elem.list.length; const el = b.elem.list[b.elem.i]; m.tint = ELEM_TINT[el] || 0; this.hooks.onElement?.(m, el); const nn = this.nearest(m, players.filter((p) => !p.dead)); if (nn && nn.d <= 4.5 && (b.elem.combo || b.elem.i % 2 === 0)) this.hurt(nn.p, m, events); } }
      if (sk.mergeT > 0 && (sk.mergeT -= dt) <= 0) this.mergeBack(m);
      for (const b of sk.buffs) if (b.regen) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * b.regen * dt * m.status.healMul());
      for (let i = sk.buffs.length - 1; i >= 0; i--) { const b = sk.buffs[i]; if (b.t !== Infinity && (b.t -= dt) <= 0) { sk.buffs.splice(i, 1); this.recalc(m); } }
      const ratio = m.hp / m.maxHp, ph = m.cfg.phases;
      if (ph) while (sk.phase + 1 < ph.length && ratio <= ph[sk.phase].hpBottom) this.enterPhase(m, sk.phase + 1);
      if (!m.status.canCast()) continue; // đóng băng/choáng: đứng niệm dở thì dừng
      const n = this.nearest(m, players.filter((p) => !p.dead));
      for (const k of sk.list) {
        const e = k.def.effect;
        if (e.type === 'spawnSplit' && !m.cfg.boss) { // phân thân theo ngưỡng máu
          for (const th of [].concat(e.hpThreshold ?? 0.5)) if (ratio <= th && !sk.splits.has(th) && !m.noSplit) { sk.splits.add(th); this.split(m, e); }
          continue;
        }
        if (k.state === 'cast') { k.t -= dt; if (k.t <= 0) { k.state = 'ready'; k.cd = k.cooldown; sk.casting = null; this.fire(m, k, n, events); } continue; }
        k.cd -= dt; if (k.cd > 0 || sk.casting || !n || !this.want(m, k, n, ratio)) continue;
        k.state = 'cast'; k.t = k.def.castTime; sk.casting = k; k.target = (e.shape === 'circle' || e.shape === 'cone') && e.targets !== 'allies' ? { x: n.p.x, y: n.p.y } : { x: m.x, y: m.y };
        if (HOLD.has(e.type)) m.hold = Math.max(m.hold, k.def.castTime);
        this.hooks.onCast?.(m, k.def, { x: k.target.x, y: k.target.y, r: e.radius ?? 0, ring: e.shape === 'ring' || e.type === 'aura' });
        if (k.t <= 0) { k.state = 'ready'; k.cd = k.cooldown; sk.casting = null; this.fire(m, k, n, events); }
      }
    }
    return events;
  }
  // ---------- điều kiện dùng kỹ năng ----------
  want(m, k, n, ratio) {
    const e = k.def.effect, d = n.d;
    switch (e.type) {
      case 'projectile': return d <= e.range && d >= 1.2;
      case 'debuff': if (e.pull) return d <= (e.range ?? 3) && d >= 1.0; return d < 14 && this.towersIn(m, (e.radius ?? 3) + 0.5);
      case 'transform': if (e.kind === 'fusion') return !m.sk.fused && d < 12 && this.fusePartners(m, e).length >= 1; return !m.sk.elemT && d < 12;
      case 'chain': return d <= 5 && d >= 1;
      case 'teleport': return d >= 3.5 && d <= 10;
      case 'zone': if (e.targets === 'allies') return [m, ...this.allies(m, e.radius ?? 2)].some((o) => o.hp < o.maxHp * 0.9); return e.shape === 'ring' ? d <= e.radius * 0.95 : d <= (e.radius ?? 2) + 3.5;
      case 'aura': if (e.targets === 'allies') return this.supportWanted(m, e, d); return d <= (e.radius ?? 1.5) + 1.5;
      case 'self': if (e.dashDist) return d <= e.dashDist + 1.2 && d >= 1.4; if (e.healPctPerSec) return m.hp < m.maxHp * 0.85 || m.status.has('burn') || m.status.has('poison');
      // fallthrough
      case 'buff': if (e.enemyTowerRateMul && this.towersIn(m, (e.radius ?? 3) + 0.5)) return true; if (e.targets === 'allies') return this.allies(m, e.radius ?? 3).length > 0 && d < 10; return !this.hasBuff(m, k.id) && (ratio < 0.7 || d < 5);
      case 'shield': return ratio < 0.95 && d < 9 && !m.status.get('shield');
      case 'summon': return d < 10 && !m.sk.owner && this.minionCount(m) < (e.cap ?? 6);
      case 'spawnSplit': return d < 10 && this.minionCount(m) < 8;
      case 'drain': if (e.target === 'towers') return this.towersIn(m, (e.radius ?? 3.5) + 0.5); if (e.target === 'player') return d <= (e.range ?? 2.5); return this.allies(m, e.radius ?? 2.5).length > 0;
    }
    return false;
  }
  allies(m, r) { return this.world.monsters.filter((o) => o !== m && o.v2 && !o.dying && !o.cfg.boss && dist(o, m) <= r); }
  // ---------- thực thi ----------
  fire(m, k, n, events) {
    const def = k.def, e = def.effect, world = this.world; this.hooks.onFire?.(m, def, k.target);
    switch (e.type) {
      case 'projectile': {
        if (!n) return; const base = Math.atan2(n.p.y - m.y, n.p.x - m.x), cnt = e.fan ?? 1, sp = e.speed ?? 6;
        for (let i = 0; i < cnt; i++) { const a = base + (i - (cnt - 1) / 2) * 0.28; this.projs.push({ x: m.x, y: m.y - 0.1, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: (e.range ?? 4) / sp + 0.25, r: 0.28, owner: m, def, splash: e.splash ?? 0 }); }
        return;
      }
      case 'zone': {
        const c = k.target ?? m, r = e.radius ?? 1.5;
        if (e.shape === 'ring' || !(def.duration > 0)) for (const p of this.playersNow) if (!p.dead && dist(p, c) <= r + (p.r ?? 0.3)) this.hurt(p, m, events);
        if (def.duration > 0) this.zones.push({ x: c.x, y: c.y, r, t: def.duration, tick: 0.5, acc: 0, owner: m, def, follow: false });
        return;
      }
      case 'aura': if (e.targets === 'allies' && !(def.duration > 0)) { this.support(m, e, def, m, 1); return; } this.zones.push({ x: m.x, y: m.y, r: e.radius ?? 1.2, t: def.duration, tick: 0.5, acc: 0, owner: m, def, follow: true }); return;
      case 'transform': if (e.kind === 'fusion') this.fuse(m, e); else this.shift(m, e, def); return;
      case 'debuff': if (e.pull) { if (n) this.pullPlayer(n.p, m, e.pull); return; } this.zones.push({ x: m.x, y: m.y, r: e.radius ?? 3, t: def.duration || 4, owner: m, def, follow: true, tower: { miss: e.missChance || 0, lock: !!e.disableBranchEffects, rate: 1 } }); return;
      case 'chain': if (n) { this.hooks.onChain?.(m, n.p); this.hurt(n.p, m, events); } return;
      case 'teleport': this.teleport(m, e.range ?? 4); return;
      case 'self': case 'buff': {
        if (e.dashDist) { this.dash(m, n, e, events); return; }
        const b = { armorAdd: (e.armorAdd || 0) + (e.reflectPct ? e.reflectPct * 0.5 : 0), speedMul: e.speedMul, scaleMul: e.scaleMul, dodge: e.dodgeChance, regen: e.healPctPerSec, invuln: !!e.invulnerable, elem: e.elements ? { list: e.elements, sec: e.cycleSec ?? 1.5, combo: !!e.combo, t: 0, i: 0 } : null, alpha: e.invisible ? e.alpha ?? 0.3 : 0 }; // phản sát thương: tháp không có máu ở chế độ này => quy đổi thành giáp
        if (e.enemyTowerRateMul) this.zones.push({ x: m.x, y: m.y, r: e.radius ?? 3, t: def.duration || 4, owner: m, def, follow: true, tower: { miss: 0, lock: false, rate: e.enemyTowerRateMul } });
        if (e.removeStatus) m.status.cleanse(e.removeStatus);
        if (e.targets === 'allies') { for (const o of [m, ...this.allies(m, e.radius ?? 3)]) this.addBuff(o, k.id, def.duration || 1, b); return; }
        this.addBuff(m, k.id, def.duration || 1, b); return;
      }
      case 'shield': m.status.apply('shield', { hp: m.maxHp * (e.absorbPctMaxHp ?? 0.25), dur: def.duration || 6 }); return;
      case 'summon': this.summon(m, e.count ?? 3, e.hpPct ?? e.minionHpPct ?? 0.8, e.kind === 'decoy', Array.isArray(e.minionPool) ? e.minionPool : null); return;
      case 'spawnSplit': this.summon(m, e.parts ?? 3, 0.8, false, e.childElements); if (e.mergeBack) m.sk.mergeT = def.duration || 4; return; // boss: "tách" ra đàn con cùng đội hộ tống
      case 'drain': {
        if (e.target === 'towers') { this.zones.push({ x: m.x, y: m.y, r: e.radius ?? 3.5, t: def.duration || 3, owner: m, def, follow: true, tower: { miss: 0, lock: false, rate: 1 - (e.slowFireRatePct ?? 0.3) } }); this.hooks.onSupport?.(m, def, m); return; }
        if (e.target === 'player') { if (n && n.d <= (e.range ?? 2.5) + 0.3) { this.hurt(n.p, m, events); m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.1 * (e.healPctOfDmg ?? 0.5)); } return; }
        const list = this.allies(m, e.radius ?? 2.5).slice(0, e.maxTargets ?? 3);
        for (const o of list) { o.reward = 0; world.damage(o, o.hp + 1, { silent: true }); m.hp = Math.min(m.maxHp, m.hp + m.maxHp * (e.gainHpPct ?? 0.2) * 0.25); }
        if (list.length) { const st = Math.min(e.maxStacks ?? 4, m.sk.drainStacks = (m.sk.drainStacks || 0) + 1); this.addBuff(m, 'absorb', Infinity, { scaleMul: 1 + (e.gainScale ?? 0.05) * st }); }
        return;
      }
    }
  }
  // Sinh quái con quanh chủ. Boss lấy loại từ đội hộ tống; slime thường sinh đúng loại của mình. Quái con mạnh ở mức wave hiện tại (không thừa hưởng máu boss).
  summon(m, count, hpPct = 0.8, decoy = false, custom = null) {
    const world = this.world, cfg = m.cfg, pool = (custom || (cfg.boss ? cfg.minions : [cfg.id])).filter(isRuntimeId); if (!pool?.length) return;
    for (let i = 0; i < count; i++) {
      if (world.active >= SLIME_V2.maxActiveHard) return; const id = pool[Math.floor(this.rng() * pool.length)], pos = this.walkableNear(m.x, m.y);
      const o = world.spawn(v2Type(id), pos.x, pos.y, m.hpMul * (decoy ? 0.05 : hpPct), 1, decoy ? 0 : 0.3); if (decoy) o.childScale = 0.9; o.noSplit = true; o.sk.owner = m; m.sk.minions.push(o);
      this.hooks.onSummon?.(m, o);
    }
  }
  // ---------- tác động lên tháp (vùng debuff đi theo quái) ----------
  towerCenter(t) { const f = this.world.towerFT ?? 2; return { x: t.x + f / 2, y: t.y + f / 2 }; }
  towersIn(m, r) { const ts = this.world.towers; if (!ts) return false; for (const t of ts) if (t.state !== 'building' && dist(this.towerCenter(t), m) <= r) return true; return false; }
  // Trả về hiệu ứng đang đè lên tháp t: {miss, lock, rate} — TowerSystem gọi khi bắn. Không có vùng => null (đường code cũ không đổi)
  towerDebuff(t) {
    if (!this.zones.length) return null; const c = this.towerCenter(t); let o = null;
    for (const z of this.zones) if (z.tower && dist(c, z) <= z.r) { o ||= { miss: 0, lock: false, rate: 1 }; o.miss = Math.max(o.miss, z.tower.miss); o.lock ||= z.tower.lock; o.rate = Math.min(o.rate, z.tower.rate); }
    return o;
  }
  // ---------- kỹ năng đặc biệt ----------
  fusePartners(m, e) { return this.allies(m, e.radius ?? 2.5).filter((o) => o.cfg.id === m.cfg.id && !o.sk?.owner).slice(0, e.partners ?? 2); }
  // Hợp nhất: hút các slime cùng loại ở gần thành một khối lớn (HP cộng dồn, tốc độ lấy mức cao nhất). Mỗi slime chỉ làm một lần.
  fuse(m, e) {
    const list = this.fusePartners(m, e); if (!list.length) return; m.sk.fused = true; let hp = 0, sp = m.speed;
    for (const o of list) { hp += o.hp; sp = Math.max(sp, o.speed); o.reward = 0; this.world.damage(o, o.hp * 10 + 1e6, { silent: true }); }
    m.maxHp += hp; m.hp += hp; m.speed = sp; m.childScale = Math.min(1.6, (m.childScale || 1) * (1 + 0.15 * list.length)); this.recalc(m); this.hooks.onFuse?.(m, list.length);
  }
  shift(m, e, def) {
    const pool = e.pool || ['fire', 'ice', 'thunder', 'poison', 'dark'], el = pool[Math.floor(this.rng() * pool.length)]; m.sk.elemT = def.duration || 8; m.tint = ELEM_TINT[el] || 0; this.hooks.onElement?.(m, el);
    this.addBuff(m, 'shift', def.duration || 8, { armorAdd: 0.1 });
  }
  absorb(m, cap, r) { const list = this.allies(m, r).slice(0, cap); for (const o of list) { o.reward = 0; this.world.damage(o, o.hp * 10 + 1e6, { silent: true }); m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.02); } if (list.length) this.hooks.onFuse?.(m, list.length); }
  // Hợp lại tinh thể: các mảnh còn sống lao về boss, hồi máu cho boss rồi biến mất
  mergeBack(m) { let n = 0; for (const o of m.sk.minions.slice()) if (o.alive && !o.dying && o.sk?.owner === m) { m.hp = Math.min(m.maxHp, m.hp + o.hp); o.reward = 0; this.world.damage(o, o.hp * 10 + 1e6, { silent: true }); n++; } if (n) this.hooks.onFuse?.(m, n); }
  // Kéo người chơi về phía quái, từng bước nhỏ và dừng khi gặp vật cản (không xuyên vật thể)
  pullPlayer(p, m, dist0) {
    const g = this.world.grid, d = dist(p, m) || 1, ux = (m.x - p.x) / d, uy = (m.y - p.y) / d, steps = 6, st = Math.min(dist0, Math.max(0, d - 0.9)) / steps;
    for (let i = 0; i < steps; i++) { const nx = p.x + ux * st, ny = p.y + uy * st; if (!g.isWalkable(Math.floor(nx), Math.floor(ny))) break; p.x = nx; p.y = ny; }
    this.hooks.onPull?.(m, p);
  }
  // Hỗ trợ đồng đội: hồi máu / giải trạng thái / tăng tốc. Tâm tại c (thân quái hoặc vùng), tick = hệ số thời gian (hồi theo giây).
  supportTargets(m, c, r) { return [m, ...this.world.monsters.filter((o) => o !== m && o.v2 && !o.dying && dist(o, c) <= r)].filter((o) => dist(o, c) <= r); }
  supportWanted(m, e, d) { const r = e.radius ?? 2.5, l = this.supportTargets(m, m, r); if (e.healPct) return l.some((o) => o.hp < o.maxHp * 0.85); if (e.removeStatus) return l.some((o) => e.removeStatus.some((s) => o.status.has(s))); return l.length > 1 && d < 10; }
  support(m, e, def, c, tick) {
    for (const o of this.supportTargets(m, c, e.radius ?? 2.5)) {
      if (e.healPct) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * e.healPct * (def.duration > 0 ? tick : 1) * o.status.healMul());
      if (e.removeStatus) o.status.cleanse(e.removeStatus);
      if (e.speedMul && o !== m || e.speedMul && def.duration > 0) this.addBuff(o, 'support:' + def.id, def.duration > 0 ? 1 : 4, { speedMul: e.speedMul });
    }
    this.hooks.onSupport?.(m, def, c);
  }
  // Dịch chuyển dọc đường đi tới đích (không xuyên vật thể): đi theo trường dẫn đường tối đa `range` ô
  teleport(m, range) {
    const w = this.world, g = w.grid, f = w.field; let x = Math.floor(m.x), y = Math.floor(m.y); const from = { x: m.x, y: m.y };
    for (let i = 0; i < range; i++) { const n = f.next(g, x, y); if (n < 0) break; x = n % f.w; y = (n / f.w) | 0; }
    if (g.isWalkable(x, y)) { m.x = x + 0.5; m.y = y + 0.5; m.hold = Math.max(m.hold, 0.25); this.hooks.onTeleport?.(m, from); }
  }
  dash(m, n, e, events) {
    if (!n) return; const g = this.world.grid, a = Math.atan2(n.p.y - m.y, n.p.x - m.x), steps = 8, st = Math.min(e.dashDist ?? 3, n.d) / steps; this.hooks.onDash?.(m, a);
    for (let i = 0; i < steps; i++) { const nx = m.x + Math.cos(a) * st, ny = m.y + Math.sin(a) * st; if (!g.isWalkable(Math.floor(nx), Math.floor(ny))) break; m.x = nx; m.y = ny; }
    if (dist(m, n.p) <= 1.1) this.hurt(n.p, m, events);
  }
  split(m, e) {
    const world = this.world, parts = e.parts ?? 3; m.noSplit = true;
    for (let i = 0; i < parts; i++) {
      if (world.active >= SLIME_V2.maxActiveHard) return; const pos = this.walkableNear(m.x, m.y), o = world.spawn(m.type, pos.x, pos.y, (m.maxHp * (e.childHpPct ?? 0.25)) / m.cfg.hp, 1, 0.3);
      o.noSplit = true; o.childScale = e.childScale ?? 0.6; this.recalc(o); o.sk.owner = m; m.sk.minions.push(o); this.hooks.onSummon?.(m, o);
    }
  }
}
