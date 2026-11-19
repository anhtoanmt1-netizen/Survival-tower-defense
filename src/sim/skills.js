import { SKILLS } from '../config/skills.js';
export class SkillSet {
  constructor(cfg = SKILLS) { this.cfg = cfg; this.s = {}; for (const k of Object.keys(cfg)) this.s[k] = { active: 0, cd: 0 }; }
  can(k) { const s = this.s[k]; return s.active <= 0 && s.cd <= 0; }
  use(k) { if (!this.can(k)) return false; this.s[k].active = this.cfg[k].duration; this.s[k].cd = this.cfg[k].cooldown; return true; }
  isActive(k) { return this.s[k].active > 0; }
  remainingActive(k) { return this.s[k].active; }
  remainingCd(k) { return this.s[k].cd; }
  update(dt, onEnd) {
    for (const k of Object.keys(this.s)) {
      const s = this.s[k];
      if (s.active > 0) { s.active -= dt; if (s.active <= 0) { s.active = 0; onEnd?.(k); } }
      if (s.cd > 0) s.cd = Math.max(0, s.cd - dt);
    }
  }
}
