import { GAME_CONFIG } from '../config/gameConfig.js';
import { ECON } from '../config/economy.js';
import { BRANCHES } from '../config/towers.js';
const TS = GAME_CONFIG.tileSize;
export class TowerRenderer {
  constructor(scene, sys, fx) {
    this.scene = scene; this.sys = sys; this.fx = fx; this.views = new Map(); this.arrows = [];
    this.barG = scene.add.graphics().setDepth(9e5); this.rangeG = scene.add.graphics().setDepth(5e5);
  }
  acquireArrow(kind) { const s = this.arrows.pop() || this.scene.add.image(0, 0, 'arrow_arrow').setOrigin(0.85, 0.5); return s.setTexture('arrow_' + kind).setVisible(true); }
  releaseArrow(p) { if (p.view) { p.view.setVisible(false); this.arrows.push(p.view); p.view = null; } }
  create(t) {
    const x = t.x * TS + 16, yb = t.y * TS + 32, d = t.y * TS + 30, S = this.scene;
    const v = { base: S.add.sprite(x, yb, 'tower_base').setOrigin(0.5, 1).setDepth(d), scaf: S.add.image(x, yb, 'tower_scaffold').setOrigin(0.5, 1).setDepth(d + 1),
      bow: S.add.image(x, t.y * TS + 3, 'bow').setDepth(d + 1), puffT: 0, text: '',
      label: S.add.text(x, t.y * TS - 14, 'LV1', { fontFamily: 'sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(9e5).setResolution(2) };
    this.views.set(t.id, v); return v;
  }
  sync(dt, selected) {
    const sys = this.sys, g = this.barG, alive = new Set(); g.clear();
    for (const t of sys.towers) {
      alive.add(t.id); const v = this.views.get(t.id) || this.create(t), building = t.state === 'building', p = building ? 1 - t.buildT / ECON.buildTime : 1;
      if (building) {
        v.base.setCrop(0, 48 * (1 - p), 32, 48 * p); v.scaf.setVisible(true); v.bow.setVisible(false);
        g.fillStyle(0x000000, 0.65).fillRect(t.x * TS + 2, t.y * TS - 12, 28, 6); g.fillStyle(0xffd24a, 1).fillRect(t.x * TS + 3, t.y * TS - 11, 26 * Math.max(0, p), 4);
        v.puffT -= dt; if (v.puffT <= 0) { v.puffT = 0.22; this.fx.puff(t.x * TS + 16, t.y * TS + 28, 0xb89a6a, 3, 25, 0.35); }
      } else { if (v.base.isCropped) v.base.setCrop(); v.scaf.setVisible(false); v.bow.setVisible(true).setRotation(t.angle); }
      const top = t.picks.length ? Object.entries(t.picks.reduce((a, b) => ((a[b] = (a[b] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1])[0][0] : null;
      const txt = `LV${t.level}${t.pending > 0 ? ' ★' : ''}`; if (txt !== v.text) { v.text = txt; v.label.setText(txt); }
      v.label.setColor(top ? BRANCHES[top].color : '#ffffff').setVisible(!building);
    }
    for (const [id, v] of this.views) if (!alive.has(id)) { v.base.destroy(); v.scaf.destroy(); v.bow.destroy(); v.label.destroy(); this.views.delete(id); }
    for (const p of sys.projectiles) { const s = p.view || (p.view = this.acquireArrow(p.kind)); s.setPosition(p.x * TS, p.y * TS).setRotation(Math.atan2(p.vy, p.vx)).setDepth(p.y * TS + 40); }
    this.rangeG.clear();
    if (selected && sys.towers.includes(selected)) { this.rangeG.lineStyle(2, 0xffffff, 0.5).strokeCircle(selected.x * TS + 16, selected.y * TS + 16, selected.stats.range * TS); this.rangeG.fillStyle(0xffffff, 0.06).fillCircle(selected.x * TS + 16, selected.y * TS + 16, selected.stats.range * TS); }
  }
}
