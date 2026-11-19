import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { generateMap } from '../map/index.js';
import { Grid } from '../map/grid.js';
import { findPath } from '../core/pathfinding.js';
import { createTerrainTextures, bakeGround, spawnObjects } from '../render/textures.js';
import { Player } from '../entities/Player.js';
import { MonsterWorld } from '../sim/world.js';
import { WaveDirector, selectGates } from '../sim/director.js';
import { MonsterRenderer } from '../systems/MonsterRenderer.js';
import { mulberry32 } from '../core/rng.js';
const TS = GAME_CONFIG.tileSize;
export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }
  init(data) { this.opts = data; }
  create() {
    const map = (this.map = generateMap(this.opts.mapId)); this.grid = new Grid(map);
    createTerrainTextures(this); bakeGround(this, map); spawnObjects(this, map);
    const s = map.playerStart;
    this.player = new Player(this, this.grid, s.x + 0.5, s.y + 0.5, { name: this.opts.name, shirt: this.opts.shirt });
    const cam = this.cameras.main; cam.setBounds(0, 0, map.width * TS, map.height * TS); cam.setBackgroundColor('#1b2a1b'); cam.roundPixels = true;
    this.renderer = new MonsterRenderer(this);
    this.world = new MonsterWorld(this.grid, { onFree: (m) => this.renderer.release(m), onSpawn: () => {} });
    const rng = mulberry32((Date.now() ^ map.seed) >>> 0);
    this.activeGates = selectGates(map.gates, 1, rng); // 1 người chơi = 1 cổng (multiplayer: n người = n cổng)
    this.director = new WaveDirector({ grid: this.grid, world: this.world, gates: this.activeGates, rng });
    for (const g of this.activeGates) { // cổng xuất hiện: vòng sáng nhấp nháy
      const o = this.add.ellipse(g.x * TS + 16, g.y * TS + 22, 64, 40, 0x8e44ff, 0.35).setStrokeStyle(2, 0xd2a8ff).setDepth(1);
      this.tweens.add({ targets: o, scale: 1.15, alpha: 0.6, yoyo: true, repeat: -1, duration: 700 });
    }
    cam.startFollow(this.player.sprite, true, 0.15, 0.15);
    this.scale.on('resize', this.fitZoom, this); this.fitZoom();
    this.scene.launch('UI', { map, player: this.player, camera: cam, game: this });
    this.input.on('pointerdown', this.onTap, this);
    const k = this.input.keyboard; this.keys = k.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    if (this.opts.debug) { // phím debug cho dev: ?debug=1
      k.on('keydown-H', () => this.player.hurt()); k.on('keydown-B', () => this.player.startBuild()); k.on('keydown-K', () => this.player.die());
      k.on('keydown-X', () => { let b = null, bd = 1e9; for (const m of this.world.monsters) { if (m.dying) continue; const d = (m.x - this.player.x) ** 2 + (m.y - this.player.y) ** 2; if (d < bd) { bd = d; b = m; } } if (b) this.world.damage(b, 9999); });
      k.on('keydown-Z', () => this.director.queueDebug(20));
    }
    this.kv = new Phaser.Math.Vector2();
  }
  fitZoom() { this.cameras.main.setZoom(Phaser.Math.Clamp(Math.min(this.scale.width, this.scale.height) / (9 * TS), 0.8, 3)); }
  onTap(p) {
    const ui = this.scene.get('UI'); if (ui?.isUiPointer?.(p) || this.player.dead) return;
    const w = p.positionToCamera(this.cameras.main), tx = Math.floor(w.x / TS), ty = Math.floor(w.y / TS), me = this.player.tile();
    const path = findPath(this.grid, me.x, me.y, tx, ty);
    const m = this.add.circle(tx * TS + 16, ty * TS + 16, 11).setStrokeStyle(3, path ? 0xffffff : 0xff4444).setDepth(1e6);
    this.tweens.add({ targets: m, alpha: 0, scale: 1.7, duration: 500, onComplete: () => m.destroy() });
    if (path) this.player.setPath(path);
  }
  update(_, ms) {
    const dt = Math.min(0.05, ms / 1000), ui = this.scene.get('UI'), K = this.keys;
    let vec = ui?.joystick?.vec;
    const kx = (K.D.isDown || K.RIGHT.isDown ? 1 : 0) - (K.A.isDown || K.LEFT.isDown ? 1 : 0), ky = (K.S.isDown || K.DOWN.isDown ? 1 : 0) - (K.W.isDown || K.UP.isDown ? 1 : 0);
    if (kx || ky) { this.kv.set(kx, ky).normalize(); vec = this.kv; }
    this.player.update(dt, vec);
    this.director.update(dt);
    const events = this.world.update(dt, [this.player]);
    if (events.length) this.cameras.main.shake(120, 0.004);
    this.renderer.sync(this.world.monsters);
  }
}
