import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { generateMap } from '../map/index.js';
import { Grid } from '../map/grid.js';
import { findPath } from '../core/pathfinding.js';
import { createTerrainTextures, bakeGround, spawnObjects } from '../render/textures.js';
import { Player } from '../entities/Player.js';
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
    cam.startFollow(this.player.sprite, true, 0.15, 0.15);
    this.scale.on('resize', this.fitZoom, this); this.fitZoom();
    this.scene.launch('UI', { map, player: this.player, camera: cam });
    this.input.on('pointerdown', this.onTap, this);
    const k = this.input.keyboard; this.keys = k.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    if (this.opts.debug) { // phím debug cho dev: ?debug=1
      k.on('keydown-H', () => this.player.hurt()); k.on('keydown-B', () => this.player.startBuild()); k.on('keydown-K', () => this.player.die());
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
  }
}
