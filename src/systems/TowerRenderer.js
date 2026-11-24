import { GAME_CONFIG } from '../config/gameConfig.js';
import { ECON } from '../config/economy.js';
import { BRANCHES } from '../config/towers.js';
import { TOWER_DISPLAY } from '../config/art.js';
import { FONT } from '../config/ui.js';
import { FX } from '../config/fx.js';
import { VISUAL } from '../config/visual.js';
import Phaser from 'phaser';
const TS = GAME_CONFIG.tileSize, NONE = 0xfff0c0, BASE = TOWER_DISPLAY.texScale;
const hexOf = (h) => parseInt(h.slice(1), 16);
// Hình tháp theo mốc tiến hóa (stage 0..5 = Tower.png #1..#6), hào quang theo nhánh kỹ năng chính + cấp, giàn giáo khi xây.
export class TowerRenderer {
  constructor(scene, sys, fx) {
    this.scene = scene; this.sys = sys; this.fx = fx; this.views = new Map(); this.arrows = []; this.glows = []; this.t = 0;
    this.barG = scene.add.graphics().setDepth(9e5); this.rangeG = scene.add.graphics().setDepth(5e5);
  }
  acquireArrow(p) {
    const s = (this.arrows.pop() || this.scene.add.image(0, 0, 'arrow_arrow').setOrigin(0.85, 0.5)).setTexture('arrow_' + p.kind).setVisible(true).setScale(p.crit ? 1.35 : 1);
    if (p.kind !== 'arrow' || p.crit) { const g = (this.glows.pop() || this.scene.add.image(0, 0, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD)).setVisible(true).setTint(p.crit ? 0xffd24a : FX.kinds[p.kind].glow).setScale(p.crit ? 0.7 : 0.5).setAlpha(0.8); p.glowView = g; }
    return s;
  }
  releaseArrow(p) { if (p.view) { p.view.setVisible(false); this.arrows.push(p.view); p.view = null; } if (p.glowView) { p.glowView.setVisible(false); this.glows.push(p.glowView); p.glowView = null; } }
  create(t) {
    const x = t.x * TS + 16, yb = t.y * TS + 34, d = t.y * TS + 30, S = this.scene;
    const [sw, sh, sa] = VISUAL.shadow.tower, v = {
      shadow: S.add.image(x, t.y * TS + 30, 'fx_shadow').setDepth(0.6).setDisplaySize(sw, sh).setAlpha(sa), // bóng tiếp đất: tháp đứng vững trên nền
      pool: S.add.image(x, t.y * TS + 27, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(d - 1).setScale(1.5, 0.6).setAlpha(0),
      base: S.add.image(x, yb, 'tower_' + t.stage).setOrigin(0.5, 1).setScale(BASE).setDepth(d), scaf: S.add.image(x, yb, 'tower_scaffold').setOrigin(0.5, 1).setDepth(d + 1),
      crown: S.add.image(x, t.y * TS - 14, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(d + 2).setAlpha(0),
      label: S.add.text(x, t.y * TS - 30, 'LV1', { fontFamily: FONT, fontSize: '10px', fontStyle: '700', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(9e5).setResolution(2),
      stage: t.stage, puffT: 0, sparkT: Math.random(), text: '', evT: 0, x, yb,
    };
    this.views.set(t.id, v); return v;
  }
  evolve(t) { const v = this.views.get(t.id); if (v) v.evT = 0.8; }
  dominant(t) { if (!t.picks.length) return null; const c = {}; for (const b of t.picks) c[b] = (c[b] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; }
  sync(dt, selected) {
    this.t += dt; const sys = this.sys, g = this.barG, alive = new Set(), now = this.t; g.clear();
    for (const t of sys.towers) {
      alive.add(t.id); const v = this.views.get(t.id) || this.create(t), building = t.state === 'building', p = building ? 1 - t.buildT / ECON.buildTime : 1;
      if (v.stage !== t.stage) { v.stage = t.stage; v.base.setTexture('tower_' + t.stage); }
      const top = this.dominant(t), col = top ? hexOf(BRANCHES[top].color) : NONE;
      if (building) {
        const fr = v.base.frame; v.base.setCrop(0, fr.realHeight * (1 - p), fr.realWidth, fr.realHeight * p); v.scaf.setVisible(true); v.pool.setAlpha(0); v.crown.setAlpha(0);
        g.fillStyle(0x000000, 0.65).fillRect(t.x * TS + 2, t.y * TS - 6, 28, 6); g.fillStyle(0xffd24a, 1).fillRect(t.x * TS + 3, t.y * TS - 5, 26 * Math.max(0, p), 4);
        v.puffT -= dt; if (v.puffT <= 0) { v.puffT = 0.22; this.fx.puff(t.x * TS + 16, t.y * TS + 28, 0xb89a6a, 3, 25, 0.35); }
      } else {
        if (v.base.isCropped) v.base.setCrop(); v.scaf.setVisible(false);
        t.flash = Math.max(0, (t.flash || 0) - dt * 7); const lv = t.level, st = t.stage, ph = 0.75 + 0.25 * Math.sin(now * 2.2 + t.id), fl = t.flash;
        let k = 1 + 0.045 * fl; if (v.evT > 0) { v.evT = Math.max(0, v.evT - dt); const e = 1 - v.evT / 0.8; k *= 1 + 0.22 * Math.sin(Math.PI * e); v.base.setTintFill(e < 0.35 ? 0xffffff : col); if (e >= 0.35) v.base.clearTint(); if (v.evT === 0) v.base.clearTint(); }
        v.base.setScale(BASE * k);
        // ánh sáng: vệt sáng dưới chân (mạnh theo cấp) + quầng trên đỉnh (từ stage 2) cùng màu nhánh; chớp mạnh khi bắn
        v.pool.setTint(col).setAlpha(Math.min(0.5, 0.1 + lv * 0.03) * ph);
        v.crown.setTint(col).setScale(0.55 + st * 0.12 + fl * 0.25).setAlpha(st >= 2 ? Math.min(0.7, 0.22 + st * 0.08) * ph + fl * 0.5 : fl * 0.45);
        v.sparkT -= dt; if (st >= 3 && v.sparkT <= 0) { v.sparkT = 0.55 - st * 0.07; this.fx.spark(v.x + (Math.random() - 0.5) * 22, t.y * TS - 6 + Math.random() * 16, col, 1, 22, 0.8, 0.6); }
      }
      const txt = `LV${t.level}${t.pending > 0 ? ' ★' : ''}`; if (txt !== v.text) { v.text = txt; v.label.setText(txt); }
      v.label.setColor(top ? BRANCHES[top].color : '#ffffff').setVisible(!building);
    }
    for (const [id, v] of this.views) if (!alive.has(id)) { for (const k of ['shadow', 'pool', 'base', 'scaf', 'crown', 'label']) v[k].destroy(); this.views.delete(id); }
    for (const p of sys.projectiles) {
      const s = p.view || (p.view = this.acquireArrow(p)), x = p.x * TS, y = p.y * TS; s.setPosition(x, y).setRotation(Math.atan2(p.vy, p.vx)).setDepth(p.y * TS + 40);
      if (p.glowView) p.glowView.setPosition(x, y).setDepth(p.y * TS + 39);
      p.trailT = (p.trailT ?? 0) - dt; if (p.trailT <= 0) { p.trailT = p.kind === 'arrow' ? 0.07 : 0.04; const c = p.crit ? 0xffd24a : FX.kinds[p.kind].color; this.fx.trail(x, y, c, p.crit ? 1 : 0.8); }
    }
    this.rangeG.clear();
    if (selected && sys.towers.includes(selected)) { this.rangeG.lineStyle(2, 0xffffff, 0.5).strokeCircle(selected.x * TS + 16, selected.y * TS + 16, selected.stats.range * TS); this.rangeG.fillStyle(0xffffff, 0.06).fillCircle(selected.x * TS + 16, selected.y * TS + 16, selected.stats.range * TS); }
  }
}
