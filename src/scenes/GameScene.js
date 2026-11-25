import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { TOWER_TYPES, BRANCHES } from '../config/towers.js';
import { SKILLS, SPEED_UPGRADE, speedUpgradeCost } from '../config/skills.js';
import { WAVE_SETTINGS } from '../config/waves.js';
import { generateMap, parseMapId } from '../map/index.js';
import { Grid } from '../map/grid.js';
import { preloadWorldAssets, smoothWorldTextures, ObjectLayer, Ambient } from '../render/world.js';
import { WaterFx, createWaterTextures } from '../render/waterFx.js';
import { GrassLayer, GRASS_KEYS, createGrassTextures } from '../render/grassLayer.js';
import { TextureGrader, isIdentity } from '../render/mapGrade.js';
import { createFxTextures } from '../render/towerTextures.js';
import { TerrainRenderer } from '../render/terrainView.js';
import { getDifficulty } from '../config/difficulty.js';
import { ECON } from '../config/economy.js';
import { settings } from '../config/settings.js';
import { audio } from '../systems/Audio.js';
import { FX } from '../config/fx.js';
import { PauseState } from '../systems/PauseState.js';
import { Player } from '../entities/Player.js';
import { MonsterWorld } from '../sim/world.js';
import { WaveDirector, selectGates } from '../sim/director.js';
import { TowerSystem } from '../sim/towers.js';
import { Economy } from '../sim/economy.js';
import { MonsterRenderer } from '../systems/MonsterRenderer.js';
import { TowerRenderer } from '../systems/TowerRenderer.js';
import { WallRenderer } from '../systems/WallRenderer.js';
import { TOWER_DISPLAY, WALL_DISPLAY } from '../config/art.js';
import { Effects } from '../systems/Effects.js';
import { Panels } from '../ui/panels.js';
import { mulberry32 } from '../core/rng.js';
const TS = GAME_CONFIG.tileSize;
const KIND_COLOR = { arrow: 0xe8e4d8, ice: 0x8fd0ff, fire: 0xff8a2a };
export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }
  init(data) { this.opts = data; }
  preload() { preloadWorldAssets(this); }
  create() {
    const diff = (this.diff = getDifficulty(this.opts.difficulty)), map = (this.map = generateMap(this.opts.mapId)); this.grid = new Grid(map);
    smoothWorldTextures(this); createFxTextures(this); createWaterTextures(this); createGrassTextures(this); this.grader = new TextureGrader(this);
    this.ground = new TerrainRenderer(this, map, settings.data.grade); this.objects = new ObjectLayer(this, map); this.ambient = new Ambient(this, this.objects); this.water = new WaterFx(this, map); this.grass = new GrassLayer(this, map);
    const rng = mulberry32((Date.now() ^ map.seed) >>> 0), s = map.playerStart;
    this.economy = new Economy({ ...ECON, startGold: diff.startGold, safetyIncome: diff.safetyIncome }); this.fx = new Effects(this); this.renderer = new MonsterRenderer(this, this.fx);
    this.world = new MonsterWorld(this.grid, {
      onFree: (m) => this.renderer.release(m),
      onSpawn: () => audio.play('slime_spawn'),
      onKill: (m) => { this.economy.add(m.reward); this.fx.float(m.x * TS, m.y * TS - 26, '+' + m.reward); this.fx.puff(m.x * TS, m.y * TS - 8, 0xffffff, 8, 50, 0.4); audio.play('slime_die', { pitch: 1.5 - m.cfg.scale * 0.5 }); audio.play('coin'); },
      onBurnTick: (m, n) => { this.fx.damage(m.x * TS, m.y * TS - 26 * m.cfg.scale, n, false, 'burn'); },
    }, rng, { contactDamage: diff.contactDamage });
    this.player = new Player(this, this.grid, s.x + 0.5, s.y + 0.5, { name: this.opts.name, shirt: this.opts.shirt, hp: diff.playerHp, skillCdMul: diff.skillCdMul });
    this.player.onPhaseEnd = (pl) => { this.fx.ring(pl.x * TS, pl.y * TS - 10, 0x9ad0ff, 6, 40, 0.4); this.fx.puff(pl.x * TS, pl.y * TS - 10, 0x9ad0ff, 8, 50, 0.4); this.panels.toast('Hết xuyên vật thể: đưa về ô hợp lệ gần nhất.', 'ok'); audio.play('phase_end'); };
    this.activeGates = selectGates(map.gates, 1, rng); // 1 người = 1 cổng (multiplayer: n người = n cổng)
    this.director = new WaveDirector({ grid: this.grid, world: this.world, gates: this.activeGates, rng, diff, maxActive: diff.maxActive,
      settings: { ...WAVE_SETTINGS, firstWaveDelay: diff.firstWaveDelay, interval: diff.waveInterval, spawnPerSecond: diff.spawnPerSecond } });
    for (const g of this.activeGates) {
      const o = this.add.ellipse(g.x * TS + 16, g.y * TS + 22, 64, 40, 0x8e44ff, 0.35).setStrokeStyle(2, 0xd2a8ff).setDepth(1);
      this.tweens.add({ targets: o, scale: 1.15, alpha: 0.6, yoyo: true, repeat: -1, duration: 700 });
    }
    this.ts = new TowerSystem({ grid: this.grid, world: this.world, economy: this.economy, gates: this.activeGates, rng, diff, hooks: {
      onBuildStart: () => { this.player.startBuild(); audio.play('build_start'); },
      onBuilt: (t) => { this.fx.ring(t.x * TS + TS, t.y * TS + TS, 0xffffff, 8, 44, 0.5); this.fx.puff(t.x * TS + TS, t.y * TS + TS, 0xffe08a, 10, 60, 0.5); this.fx.glow(t.x * TS + TS, t.y * TS, 0xffe9a0, 90, 0.5); audio.play('build_done'); this.panels.refresh(); },
      onEvolve: (t) => { this.towerView.evolve(t); const x = t.x * TS + TS, y = t.y * TS; this.fx.ring(x, y + 10, 0xffffff, 10, 70, 0.7); this.fx.ring(x, y + 10, 0xffd24a, 6, 50, 0.9); this.fx.glow(x, y, 0xffe9a0, 130, 0.8); this.fx.spark(x, y, 0xffe9a0, 14, 90, 0.9, 1.2); this.cameras.main.flash(180, 255, 245, 200, true); audio.play('evolve'); this.panels.toast(`Tháp tiến hóa! (LV${t.level})`, 'ok'); },
      onShoot: (t) => { const c = t.stats.kind, F = FX.kinds[c]; audio.play('shoot_' + c); if (this.fx.flashes < FX.flashMax) { this.fx.flashes++; this.fx.glow(t.x * TS + TS, t.y * TS - 12, F.glow, 34, 0.14, 0.7); } },
      onSold: (t) => { audio.play('sell'); if (this.selected === t) this.select(null); },
      onWallBuilt: (w) => { audio.play('build_done'); this.panels.refresh(); },
      onWallSold: () => { audio.play('sell'); },
      onProjFree: (p) => this.towerView.releaseArrow(p),
      onHitFx: (p, m) => { // va chạm theo hệ: tên = bụi + tia lửa, băng = mảnh băng + vòng sương, lửa = than hồng + chớp; chí mạng = chớp lớn + sao
        const x = m.x * TS, y = m.y * TS - 8 * m.cfg.scale, F = FX.kinds[p.kind], big = p.crit;
        this.fx.puff(x, y, KIND_COLOR[p.kind], big ? 9 : 4, p.kind === 'fire' ? 55 : 40, 0.3);
        if (p.kind === 'ice') this.fx.spark(x, y, 0xbfeaff, big ? 6 : 3, 60, 0.35, 0.8); else if (p.kind === 'fire') this.fx.spark(x, y, 0xffc060, big ? 6 : 3, 55, 0.5, 0.7); else this.fx.spark(x, y, 0xfff1c9, big ? 5 : 2, 55, 0.25, 0.7);
        this.fx.glow(x, y, F.glow, big ? 56 : 30, 0.2, big ? 1 : 0.7);
        if (big) { this.fx.ring(x, y, 0xffd24a, 4, 26, 0.32); this.fx.spark(x, y, 0xffd24a, 6, 90, 0.5, 1.1); }
        if (p.slow && p.slow.radius > 0) this.fx.ring(x, y + 8, 0x8fd0ff, 6, p.slow.radius * TS, 0.4);
        this.fx.damage(x, y - 14 * m.cfg.scale, p.dmg, big, p.kind); audio.play(big ? 'crit' : 'hit');
      },
    } });
    this.towerView = new TowerRenderer(this, this.ts, this.fx); this.wallView = new WallRenderer(this, this.ts, this.fx); this.wallArm = null;
    this.selected = null; this.placing = null; this.pause = new PauseState(() => settings.data.gameplay.autoPause); this.refT = 0; this.state = 'playing'; this.playTime = 0; this.peeking = false;
    this.panels = new Panels({
      ts: this.ts, economy: this.economy, close: () => this.select(null), onModal: (open) => { this.pause.set('skill', open); },
      upgrade: (t) => { const r = this.ts.upgrade(t); if (!r.ok) return this.panels.toast(r.message); audio.play('upgrade'); this.fx.ring(t.x * TS + TS, t.y * TS + TS, 0xffd24a, 6, 34, 0.4); this.fx.float(t.x * TS + TS, t.y * TS - 26, 'LV' + t.level, '#ffffff'); this.panels.refresh(); if (t.pending > 0) this.panels.showSkill(t); },
      pick: (t, b) => { const r = this.ts.pickBranch(t, b); if (!r.ok) return this.panels.toast(r.message); this.panels.hideSkill(); audio.play('pick'); this.fx.ring(t.x * TS + TS, t.y * TS + TS, parseInt(BRANCHES[b].color.slice(1), 16), 6, 40, 0.5); this.panels.refresh(); },
      reset: (t) => { const r = this.ts.resetPicks(t); if (!r.ok) this.panels.toast(r.message); this.panels.refresh(); },
      sell: (t) => { const x = t.x * TS + TS, y = t.y * TS - 20; const r = this.ts.sell(t); if (r.ok) { this.fx.float(x, y, '+' + r.refund, '#ffd24a'); this.fx.puff(x, y + 16, 0xb89a6a, 10, 50, 0.4); this.select(null); } },
    });
    this.events.once('shutdown', () => this.panels.destroy()); this.events.once('destroy', () => this.panels.destroy());
    this.ghost = this.add.sprite(0, 0, 'tower_0').setOrigin(0.5, 1).setAlpha(0.6).setVisible(false).setDepth(7e5); this.ghostG = this.add.graphics().setDepth(6.9e5);
    const cam = this.cameras.main; cam.setBounds(0, 0, map.width * TS, map.height * TS); cam.setBackgroundColor('#1b2a1b'); cam.roundPixels = true;
    cam.startFollow(this.player.sprite, true, 0.15, 0.15);
    this.scale.on('resize', this.fitZoom, this); this.fitZoom(); this.unsub = settings.on((d, keys) => { if (keys.includes('display')) this.fitZoom(); if (keys.includes('grade')) this.queueGrade(); });
    this.applyGrade(); // áp cài đặt màu đã lưu ngay khi vào bản đồ
    this.events.once('shutdown', () => this.unsub?.()); this.events.once('destroy', () => this.unsub?.());
    audio.setMusic('calm'); this.musicT = 0;
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
  // Tầm nhìn: số ô thấy được theo cạnh NGẮN của màn hình (Gần 9 = như cũ). Cùng công thức cho dọc/ngang/mọi tỷ lệ -> không nhảy khung.
  fitZoom() { this.cameras.main.setZoom(Phaser.Math.Clamp(Math.min(this.scale.width, this.scale.height) / (settings.data.display.view * TS), 0.3, 3)); }
  // --- kỹ năng, nâng tốc độ, xem bản đồ, tạm dừng, kết thúc ---
  useSkill(name) {
    if (this.state !== 'playing' || this.pause.frozen || this.player.dead) return;
    const k = this.player.skills, cfg = SKILLS[name];
    if (!this.player.useSkill(name)) { const cd = Math.ceil(k.remainingCd(name)); this.panels.toast(`${cfg.name} đang hồi chiêu: ${Math.floor(cd / 60)}:${String(cd % 60).padStart(2, '0')}`); return; }
    const x = this.player.x * TS, y = this.player.y * TS - 16, c = name === 'invincible' ? 0xffe066 : 0x9ad0ff;
    this.fx.ring(x, y, c, 8, 48, 0.5); this.fx.puff(x, y, c, 12, 70, 0.5); this.fx.glow(x, y, c, 80, 0.5); audio.play('skill_' + name); this.panels.toast(`${cfg.icon} ${cfg.name}: ${cfg.duration}s`, 'ok');
  }
  upgradeSpeed() {
    if (this.state !== 'playing' || this.player.dead) return; const lv = this.player.speedLevel;
    if (lv >= SPEED_UPGRADE.maxLevel) return this.panels.toast('Tốc độ chạy đã tối đa.');
    const cost = Math.round(speedUpgradeCost(lv) * this.diff.upgradeMul); if (!this.economy.spend(cost)) return this.panels.toast(`Không đủ vàng (cần ${cost}).`);
    this.player.speedLevel++; audio.play('speed'); this.fx.float(this.player.x * TS, this.player.y * TS - 40, 'Tốc độ LV' + this.player.speedLevel, '#8dff8d'); this.panels.toast(`Tốc độ chạy LV${this.player.speedLevel} (+${Math.round(SPEED_UPGRADE.perLevel * this.player.speedLevel * 100)}%)`, 'ok');
  }
  peekAt(tx, ty) { const cam = this.cameras.main; cam.stopFollow(); cam.pan(tx * TS + 16, ty * TS + 16, 350, 'Sine.easeOut'); this.peeking = true; }
  followPlayer() { this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15); this.peeking = false; }
  // Chỉnh màu cảnh quan: gộp nhiều lần kéo thanh trượt (120ms) rồi ghép lại nền + đổi texture vật thể. UI/nhân vật/tháp/quái KHÔNG bị ảnh hưởng.
  queueGrade() { this.gradeTimer?.remove(); this.gradeTimer = this.time.delayedCall(90, () => this.applyGrade()); }
  applyGrade() {
    const g = settings.data.grade, ids = new Set([...this.objects.ids, ...GRASS_KEYS]); this.ground.setGrade(g);
    if (isIdentity(g)) { this.objects.retexture(this.grader, g); this.grass.regrade(this.grader, g); this.grader.update(ids, g); } // về gốc: đổi texture TRƯỚC khi gỡ bản đã chỉnh
    else { this.grader.update(ids, g); this.objects.retexture(this.grader, g); this.grass.regrade(this.grader, g); }
  }
  setSettingsOpen(v) { this.pause.set('settings', v); }
  togglePause() {
    if (this.state !== 'playing') return; const on = !this.pause.wanted.has('user'); this.pause.set('user', on); const el = document.getElementById('pauseov'); if (el) el.hidden = !on;
  }
  checkEnd(dt) {
    if (this.state !== 'playing') return; this.playTime += dt; const d = this.director;
    if (this.player.dead) this.finish(false);
    else if (d.wave >= WAVE_SETTINGS.totalWaves && d.queue.length === 0 && this.world.active === 0) this.finish(true);
  }
  finish(won) {
    this.state = won ? 'won' : 'lost'; audio.stopMusic(0.6); setTimeout(() => audio.play(won ? 'win' : 'lose'), 500);
    const stats = { won, wave: this.director.wave, difficulty: this.diff.id, kills: this.world.kills, gold: this.economy.earned - this.ts.stats.refunded, towers: this.ts.stats.built, damage: Math.round(this.world.damageDealt), time: Math.round(this.playTime), mapId: this.opts.mapId };
    this.time.delayedCall(won ? 600 : 1400, () => this.opts.onEnd?.(stats));
  }
  select(t) { this.selected = t; this.pause.set('tower', !!t); if (t) this.panels.showTower(t); else this.panels.hide(); }
  // --- Kéo thả xây tháp: bắt đầu từ thẻ trong UIScene; ghost lệch lên trên ngón tay để không bị che ---
  // kind: 'tower' | 'wall' (Build UI chọn loại trước khi kéo ra bản đồ)
  beginPlacement(pointer, kind = 'tower') {
    if (this.player.dead) return; const cost = kind === 'wall' ? this.ts.wallCost() : this.ts.buildCost();
    if (this.economy.gold < cost) { this.panels.toast(`Không đủ vàng (cần ${cost}).`); return; }
    this.select(null); this.disarmWall(); this.placing = { id: pointer.id, key: '', tile: null, res: null, kind }; this.updateGhost(pointer);
  }
  updateGhost(p) {
    const cam = this.cameras.main, F = ECON.footprint[this.placing.kind], w = p.positionToCamera(cam), tx = Math.round(w.x / TS) - F / 2, ty = Math.round((w.y - 56 / cam.zoom) / TS) - F / 2; // (tx,ty) = ô TRÊN-TRÁI của khối F x F, tâm khối nằm tại điểm chạm
    const key = [tx, ty, this.grid.version, Math.floor(this.player.x), Math.floor(this.player.y)].join(',');
    if (key === this.placing.key) return; this.placing.key = key; this.placing.tile = { x: tx, y: ty };
    const wall = this.placing.kind === 'wall', r = this.ts.checkPlacement(tx, ty, [this.player], { ignoreGold: true, kind: wall ? 'wall' : 'tower' }), col = r.ok ? 0x7dff7d : 0xff6b6b; this.placing.res = r;
    this.ghost.setTexture(wall ? 'wall' : 'tower_0'); this.ghost.setScale((wall ? WALL_DISPLAY.width : TOWER_DISPLAY.widths[0]) / this.ghost.width);
    this.ghost.setPosition((tx + F / 2) * TS, (ty + F) * TS + 2).setVisible(true).setTint(col);
    this.ghostG.clear().lineStyle(2, col, 0.9).strokeRect(tx * TS + 1, ty * TS + 1, F * TS - 2, F * TS - 2).fillStyle(col, 0.16).fillRect(tx * TS + 1, ty * TS + 1, F * TS - 2, F * TS - 2); // khối xây (2x2 ô) luôn hiện rõ
    if (!wall) this.ghostG.lineStyle(2, col, 0.7).strokeCircle((tx + F / 2) * TS, (ty + F / 2) * TS, TOWER_TYPES.archer.base.range * TS).fillStyle(col, 0.08).fillCircle((tx + F / 2) * TS, (ty + F / 2) * TS, TOWER_TYPES.archer.base.range * TS);
  }
  endPlacement(p) {
    const pl = this.placing; if (!pl || p.id !== pl.id) return;
    this.placing = null; this.ghost.setVisible(false); this.ghostG.clear();
    if (this.scene.get('UI').isUiPointer(p) || !pl.tile) return; // thả lên vùng giao diện = hủy
    const r = pl.kind === 'wall' ? this.ts.buildWall(pl.tile.x, pl.tile.y, [this.player]) : this.ts.build(pl.tile.x, pl.tile.y, [this.player]);
    if (!r.ok) this.panels.toast(r.message);
  }
  onTap(p) {
    const ui = this.scene.get('UI'); if (ui?.isUiPointer?.(p) || this.player.dead || this.placing || this.pause.modalOpen) return;
    const w = p.positionToCamera(this.cameras.main), tx = Math.floor(w.x / TS), ty = Math.floor(w.y / TS), fy = w.y / TS - ty;
    const tower = this.ts.towerAt(tx, ty) || (fy > 0.45 ? this.ts.towerAt(tx, ty + 1) : null); // ngọn tháp nhô lên ~½ ô phía trên khối 2x2: chạm phần ngọn cũng chọn
    if (tower) { this.disarmWall(); this.select(tower); return; }
    const wall = this.ts.wallAt(tx, ty); if (wall) { this.tapWall(wall); return; }
    this.disarmWall();
    if (this.selected) this.select(null); // chạm bản đồ KHÔNG còn tạo lệnh di chuyển (chỉ joystick / WASD)
  }
  // Phá tường: chạm lần 1 = đánh dấu (nhấp nháy đỏ + thông báo hoàn vàng), chạm lần 2 trong 2,5s = bán. Tránh phá nhầm.
  tapWall(w) {
    if (this.wallArm === w.id) { const x = w.x * TS + TS, y = w.y * TS - 6, r = this.ts.sellWall(w); this.disarmWall(); if (r.ok) this.fx.float(x, y, '+' + r.refund, '#ffd24a'); return; }
    this.wallArm = w.id; this.wallView.arm(w); this.panels.toast(`Chạm tường lần nữa để phá (hoàn ${this.ts.wallRefund()} vàng).`); this.wallTimer?.remove(); this.wallTimer = this.time.delayedCall(2500, () => this.disarmWall());
  }
  disarmWall() { this.wallArm = null; this.wallView?.arm(null); this.wallTimer?.remove(); }
  update(_, ms) {
    const dt = Math.min(0.05, ms / 1000), ui = this.scene.get('UI'), K = this.keys;
    let vec = ui?.joystick?.vec;
    const kx = (K.D.isDown || K.RIGHT.isDown ? 1 : 0) - (K.A.isDown || K.LEFT.isDown ? 1 : 0), ky = (K.S.isDown || K.DOWN.isDown ? 1 : 0) - (K.W.isDown || K.UP.isDown ? 1 : 0);
    if (kx || ky) { this.kv.set(kx, ky).normalize(); vec = this.kv; }
    const frozen = this.pause.frozen;
    if (!frozen && this.state === 'playing') { // bảng chọn nhánh / tạm dừng / kết thúc: dừng mô phỏng
      this.player.update(dt, vec); this.director.update(dt);
      const events = this.world.update(dt, [this.player]); if (events.length) { this.cameras.main.shake(120, 0.004); audio.play(this.player.dead ? 'player_die' : 'player_hurt'); }
      this.economy.update(dt, this.ts.towers.length, this.ts.buildCost()); this.ts.update(dt); this.checkEnd(dt);
    } else this.player.update(0, null);
    const cam = this.cameras.main, F2 = settings.data.fx; this.fx.flashes = 0; this.ground.update(cam);
    this.objects.update(dt, cam); this.ambient.update(dt, this.fx.density); this.water.update(dt, cam, F2.water, this.fx.density); this.grass.update(dt, cam, frozen ? null : this.player, F2.grass); // cảnh quan luôn sống động kể cả khi tạm dừng; cỏ chỉ nghiêng khi nhân vật đang chạy
    this.fx.update(dt); this.renderer.sync(this.world.monsters, frozen ? 0 : dt, cam); this.towerView.sync(frozen ? 0 : dt, this.selected); this.wallView.sync(frozen ? 0 : dt);
    this.musicT -= dt; if (this.musicT <= 0 && this.state === 'playing') { this.musicT = 1; const hot = this.world.active > 22 || this.director.currentSpec?.boss && this.world.active > 6; audio.setMusic(hot ? 'battle' : 'calm'); }
    this.refT += dt; if (this.refT > 0.4) { this.refT = 0; this.panels.refresh(); }
  }
}
