import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { TOWER_TYPES, BRANCHES } from '../config/towers.js';
import { SKILLS, SPEED_UPGRADE, speedUpgradeCost } from '../config/skills.js';
import { WAVE_SETTINGS } from '../config/waves.js';
import { generateMap } from '../map/index.js';
import { Grid } from '../map/grid.js';
import { findPath } from '../core/pathfinding.js';
import { createTerrainTextures, bakeGround, spawnObjects } from '../render/textures.js';
import { createTowerTextures } from '../render/towerTextures.js';
import { Player } from '../entities/Player.js';
import { MonsterWorld } from '../sim/world.js';
import { WaveDirector, selectGates } from '../sim/director.js';
import { TowerSystem } from '../sim/towers.js';
import { Economy } from '../sim/economy.js';
import { MonsterRenderer } from '../systems/MonsterRenderer.js';
import { TowerRenderer } from '../systems/TowerRenderer.js';
import { Effects } from '../systems/Effects.js';
import { Panels } from '../ui/panels.js';
import { mulberry32 } from '../core/rng.js';
const TS = GAME_CONFIG.tileSize;
const KIND_COLOR = { arrow: 0xffffff, ice: 0x8fd0ff, fire: 0xff8a2a };
export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }
  init(data) { this.opts = data; }
  create() {
    const map = (this.map = generateMap(this.opts.mapId)); this.grid = new Grid(map);
    createTerrainTextures(this); createTowerTextures(this); bakeGround(this, map); spawnObjects(this, map);
    const rng = mulberry32((Date.now() ^ map.seed) >>> 0), s = map.playerStart;
    this.economy = new Economy(); this.fx = new Effects(this); this.renderer = new MonsterRenderer(this, this.fx);
    this.world = new MonsterWorld(this.grid, {
      onFree: (m) => this.renderer.release(m),
      onKill: (m) => { this.economy.add(m.reward); this.fx.float(m.x * TS, m.y * TS - 18, '+' + m.reward); this.fx.puff(m.x * TS, m.y * TS - 8, 0xffffff, 8, 50, 0.4); },
    }, rng);
    this.player = new Player(this, this.grid, s.x + 0.5, s.y + 0.5, { name: this.opts.name, shirt: this.opts.shirt });
    this.player.onPhaseEnd = (pl) => { this.fx.ring(pl.x * TS, pl.y * TS - 10, 0x9ad0ff, 6, 40, 0.4); this.fx.puff(pl.x * TS, pl.y * TS - 10, 0x9ad0ff, 8, 50, 0.4); this.panels.toast('Hết xuyên vật thể: đưa về ô hợp lệ gần nhất.', 'ok'); };
    this.activeGates = selectGates(map.gates, 1, rng); // 1 người = 1 cổng (multiplayer: n người = n cổng)
    this.director = new WaveDirector({ grid: this.grid, world: this.world, gates: this.activeGates, rng });
    for (const g of this.activeGates) {
      const o = this.add.ellipse(g.x * TS + 16, g.y * TS + 22, 64, 40, 0x8e44ff, 0.35).setStrokeStyle(2, 0xd2a8ff).setDepth(1);
      this.tweens.add({ targets: o, scale: 1.15, alpha: 0.6, yoyo: true, repeat: -1, duration: 700 });
    }
    this.ts = new TowerSystem({ grid: this.grid, world: this.world, economy: this.economy, gates: this.activeGates, rng, hooks: {
      onBuildStart: () => this.player.startBuild(),
      onBuilt: (t) => { this.fx.ring(t.x * TS + 16, t.y * TS + 16, 0xffffff, 8, 44, 0.5); this.fx.puff(t.x * TS + 16, t.y * TS + 16, 0xffe08a, 10, 60, 0.5); this.panels.refresh(); },
      onSold: (t) => { if (this.selected === t) this.select(null); },
      onProjFree: (p) => this.towerView.releaseArrow(p),
      onHitFx: (p, m) => {
        const x = m.x * TS, y = m.y * TS - 8;
        this.fx.puff(x, y, KIND_COLOR[p.kind], p.crit ? 10 : 4, 40, 0.3);
        if (p.crit) { this.fx.ring(x, y, 0xffd24a, 4, 22, 0.3); this.fx.float(x, y - 10, '!', '#ffd24a'); }
        if (p.slow && p.slow.radius > 0) this.fx.ring(x, y + 8, 0x8fd0ff, 6, p.slow.radius * TS, 0.4);
      },
    } });
    this.towerView = new TowerRenderer(this, this.ts, this.fx);
    this.selected = null; this.placing = null; this.paused = false; this.refT = 0; this.state = 'playing'; this.userPaused = false; this.playTime = 0; this.peeking = false;
    this.panels = new Panels({
      ts: this.ts, economy: this.economy, close: () => this.select(null), onModal: (open) => { this.paused = open; },
      upgrade: (t) => { const r = this.ts.upgrade(t); if (!r.ok) return this.panels.toast(r.message); this.fx.ring(t.x * TS + 16, t.y * TS + 16, 0xffd24a, 6, 34, 0.4); this.fx.float(t.x * TS + 16, t.y * TS - 12, 'LV' + t.level, '#ffffff'); this.panels.refresh(); if (t.pending > 0) this.panels.showSkill(t); },
      pick: (t, b) => { const r = this.ts.pickBranch(t, b); if (!r.ok) return this.panels.toast(r.message); this.panels.hideSkill(); this.fx.ring(t.x * TS + 16, t.y * TS + 16, parseInt(BRANCHES[b].color.slice(1), 16), 6, 40, 0.5); this.panels.refresh(); },
      reset: (t) => { const r = this.ts.resetPicks(t); if (!r.ok) this.panels.toast(r.message); this.panels.refresh(); },
      sell: (t) => { const x = t.x * TS + 16, y = t.y * TS; const r = this.ts.sell(t); if (r.ok) { this.fx.float(x, y, '+' + r.refund, '#ffd24a'); this.fx.puff(x, y + 16, 0xb89a6a, 10, 50, 0.4); this.select(null); } },
    });
    this.events.once('shutdown', () => this.panels.destroy()); this.events.once('destroy', () => this.panels.destroy());
    this.ghost = this.add.sprite(0, 0, 'tower_base').setOrigin(0.5, 1).setAlpha(0.6).setVisible(false).setDepth(7e5); this.ghostG = this.add.graphics().setDepth(6.9e5);
    const cam = this.cameras.main; cam.setBounds(0, 0, map.width * TS, map.height * TS); cam.setBackgroundColor('#1b2a1b'); cam.roundPixels = true;
    cam.startFollow(this.player.sprite, true, 0.15, 0.15);
    this.scale.on('resize', this.fitZoom, this); this.fitZoom();
    this.scene.launch('UI', { map, player: this.player, camera: cam, game: this });
    this.scene.bringToTop('UI'); // UI luôn nằm trên cùng, nhận chạm trước
    this.input.on('pointerdown', this.onTap, this);
    this.input.on('pointermove', (p) => { if (this.placing && p.id === this.placing.id) this.updateGhost(p); });
    this.input.on('pointerup', this.endPlacement, this); this.input.on('pointerupoutside', this.endPlacement, this);
    const k = this.input.keyboard; this.keys = k.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    if (this.opts.debug) { // phím debug cho dev: ?debug=1
      k.on('keydown-H', () => this.player.hurt()); k.on('keydown-B', () => this.player.startBuild()); k.on('keydown-K', () => this.player.die());
      k.on('keydown-X', () => { let b = null, bd = 1e9; for (const m of this.world.monsters) { if (m.dying) continue; const d = (m.x - this.player.x) ** 2 + (m.y - this.player.y) ** 2; if (d < bd) { bd = d; b = m; } } if (b) this.world.damage(b, 9999); });
      k.on('keydown-Z', () => this.director.queueDebug(20)); k.on('keydown-G', () => this.economy.add(500));
    }
    this.kv = new Phaser.Math.Vector2();
  }
  fitZoom() { this.cameras.main.setZoom(Phaser.Math.Clamp(Math.min(this.scale.width, this.scale.height) / (9 * TS), 0.8, 3)); }
  // --- kỹ năng, nâng tốc độ, xem bản đồ, tạm dừng, kết thúc ---
  useSkill(name) {
    if (this.state !== 'playing' || this.paused || this.userPaused || this.player.dead) return;
    const k = this.player.skills, cfg = SKILLS[name];
    if (!this.player.useSkill(name)) { const cd = Math.ceil(k.remainingCd(name)); this.panels.toast(`${cfg.name} đang hồi chiêu: ${Math.floor(cd / 60)}:${String(cd % 60).padStart(2, '0')}`); return; }
    const x = this.player.x * TS, y = this.player.y * TS - 16, c = name === 'invincible' ? 0xffe066 : 0x9ad0ff;
    this.fx.ring(x, y, c, 8, 48, 0.5); this.fx.puff(x, y, c, 12, 70, 0.5); this.panels.toast(`${cfg.icon} ${cfg.name}: ${cfg.duration}s`, 'ok');
  }
  upgradeSpeed() {
    if (this.state !== 'playing' || this.player.dead) return; const lv = this.player.speedLevel;
    if (lv >= SPEED_UPGRADE.maxLevel) return this.panels.toast('Tốc độ chạy đã tối đa.');
    const cost = speedUpgradeCost(lv); if (!this.economy.spend(cost)) return this.panels.toast(`Không đủ vàng (cần ${cost}).`);
    this.player.speedLevel++; this.fx.float(this.player.x * TS, this.player.y * TS - 40, '⚡ LV' + this.player.speedLevel, '#8dff8d'); this.panels.toast(`Tốc độ chạy LV${this.player.speedLevel} (+${Math.round(SPEED_UPGRADE.perLevel * this.player.speedLevel * 100)}%)`, 'ok');
  }
  peekAt(tx, ty) { const cam = this.cameras.main; cam.stopFollow(); cam.pan(tx * TS + 16, ty * TS + 16, 350, 'Sine.easeOut'); this.peeking = true; }
  followPlayer() { this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15); this.peeking = false; }
  togglePause() {
    if (this.state !== 'playing') return; this.userPaused = !this.userPaused; const el = document.getElementById('pauseov'); if (el) el.hidden = !this.userPaused;
  }
  checkEnd(dt) {
    if (this.state !== 'playing') return; this.playTime += dt; const d = this.director;
    if (this.player.dead) this.finish(false);
    else if (d.wave >= WAVE_SETTINGS.totalWaves && d.queue.length === 0 && this.world.active === 0) this.finish(true);
  }
  finish(won) {
    this.state = won ? 'won' : 'lost';
    const stats = { won, wave: this.director.wave, kills: this.world.kills, gold: this.economy.earned - this.ts.stats.refunded, towers: this.ts.stats.built, damage: Math.round(this.world.damageDealt), time: Math.round(this.playTime), mapId: this.opts.mapId };
    this.time.delayedCall(won ? 600 : 1400, () => this.opts.onEnd?.(stats));
  }
  select(t) { this.selected = t; if (t) this.panels.showTower(t); else this.panels.hide(); }
  // --- Kéo thả xây tháp: bắt đầu từ thẻ trong UIScene; ghost lệch lên trên ngón tay để không bị che ---
  beginPlacement(pointer) {
    if (this.player.dead) return; const cost = this.ts.buildCost();
    if (this.economy.gold < cost) { this.panels.toast(`Không đủ vàng (cần ${cost}).`); return; }
    this.select(null); this.placing = { id: pointer.id, key: '', tile: null, res: null }; this.updateGhost(pointer);
  }
  updateGhost(p) {
    const cam = this.cameras.main, w = p.positionToCamera(cam), tx = Math.floor(w.x / TS), ty = Math.floor((w.y - 56 / cam.zoom) / TS);
    const key = [tx, ty, this.grid.version, Math.floor(this.player.x), Math.floor(this.player.y)].join(',');
    if (key === this.placing.key) return; this.placing.key = key; this.placing.tile = { x: tx, y: ty };
    const r = this.ts.checkPlacement(tx, ty, [this.player], { ignoreGold: true }); this.placing.res = r;
    this.ghost.setPosition(tx * TS + 16, ty * TS + 32).setVisible(true).setTint(r.ok ? 0x7dff7d : 0xff6b6b);
    this.ghostG.clear().lineStyle(2, r.ok ? 0x7dff7d : 0xff6b6b, 0.7).strokeCircle(tx * TS + 16, ty * TS + 16, TOWER_TYPES.archer.base.range * TS).fillStyle(r.ok ? 0x7dff7d : 0xff6b6b, 0.08).fillCircle(tx * TS + 16, ty * TS + 16, TOWER_TYPES.archer.base.range * TS);
  }
  endPlacement(p) {
    const pl = this.placing; if (!pl || p.id !== pl.id) return;
    this.placing = null; this.ghost.setVisible(false); this.ghostG.clear();
    if (this.scene.get('UI').isUiPointer(p) || !pl.tile) return; // thả lên vùng giao diện = hủy
    const r = this.ts.build(pl.tile.x, pl.tile.y, [this.player]);
    if (!r.ok) this.panels.toast(r.message);
  }
  onTap(p) {
    const ui = this.scene.get('UI'); if (ui?.isUiPointer?.(p) || this.player.dead || this.placing || this.paused) return;
    const w = p.positionToCamera(this.cameras.main), tx = Math.floor(w.x / TS), ty = Math.floor(w.y / TS), fy = w.y / TS - ty;
    const tower = this.ts.towerAt(tx, ty) || (fy < 0.5 ? this.ts.towerAt(tx, ty + 1) : null); // thân tháp cao hơn 1 ô: chạm phần trên cũng chọn
    if (tower) { this.select(tower); return; }
    if (this.selected) this.select(null);
    const me = this.player.tile(), phasing = this.player.skills.isActive('phase');
    const path = phasing ? (this.grid.inBounds(tx, ty) ? [{ x: tx, y: ty }] : null) : findPath(this.grid, me.x, me.y, tx, ty); // đang xuyên vật thể: đi thẳng tới điểm chạm
    const m = this.add.circle(tx * TS + 16, ty * TS + 16, 11).setStrokeStyle(3, path ? 0xffffff : 0xff4444).setDepth(1e6);
    this.tweens.add({ targets: m, alpha: 0, scale: 1.7, duration: 500, onComplete: () => m.destroy() });
    if (path) this.player.setPath(path);
  }
  update(_, ms) {
    const dt = Math.min(0.05, ms / 1000), ui = this.scene.get('UI'), K = this.keys;
    let vec = ui?.joystick?.vec;
    const kx = (K.D.isDown || K.RIGHT.isDown ? 1 : 0) - (K.A.isDown || K.LEFT.isDown ? 1 : 0), ky = (K.S.isDown || K.DOWN.isDown ? 1 : 0) - (K.W.isDown || K.UP.isDown ? 1 : 0);
    if (kx || ky) { this.kv.set(kx, ky).normalize(); vec = this.kv; }
    if (!this.paused && !this.userPaused && this.state === 'playing') { // bảng chọn nhánh / tạm dừng / kết thúc: dừng mô phỏng
      this.player.update(dt, vec); this.director.update(dt);
      const events = this.world.update(dt, [this.player]); if (events.length) this.cameras.main.shake(120, 0.004);
      this.economy.update(dt, this.ts.towers.length, this.ts.buildCost()); this.ts.update(dt); this.checkEnd(dt);
    } else this.player.update(0, null);
    this.fx.update(dt); this.renderer.sync(this.world.monsters); this.towerView.sync(dt, this.selected);
    this.refT += dt; if (this.refT > 0.4) { this.refT = 0; this.panels.refresh(); }
  }
}
