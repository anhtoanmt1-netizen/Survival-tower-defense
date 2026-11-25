import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { BRANCHES } from '../config/towers.js';
import { SKILLS, SPEED_UPGRADE, speedUpgradeCost } from '../config/skills.js';
import { createTerrainTextures, bakeGround, spawnObjects } from '../render/textures.js';
import { createTowerTextures } from '../render/towerTextures.js';
import { Player } from '../entities/Player.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';
import { MonsterRenderer } from '../systems/MonsterRenderer.js';
import { TowerRenderer } from '../systems/TowerRenderer.js';
import { WallRenderer } from '../systems/WallRenderer.js';
import { Effects } from '../systems/Effects.js';
import { Panels } from '../ui/panels.js';
import { MirrorSkills } from '../net/mirror.js';
import { audio } from '../systems/Audio.js';
import { GameScene } from './GameScene.js';
const TS = GAME_CONFIG.tileSize, KIND_COLOR = { arrow: 0xffffff, ice: 0x8fd0ff, fire: 0xff8a2a };
// Chế độ nhiều người: KHÔNG mô phỏng gì cục bộ. Hiển thị trạng thái do server gửi (qua Mirror) và gửi lệnh lên server.
// Chỉ nhân vật của chính mình được dự đoán cục bộ (di chuyển) và gửi vị trí để server kiểm tra.
export class NetGameScene extends GameScene {
  constructor() { super(); this.scene_key = 'Game'; }
  create() {
    const S = (this.session = this.opts.session), mir = (this.mir = S.mirror), map = mir.map; this.map = map; this.grid = mir.grid;
    createTerrainTextures(this); createTowerTextures(this); bakeGround(this, map); spawnObjects(this, map);
    this.fx = new Effects(this); this.renderer = new MonsterRenderer(this, this.fx);
    this.world = mir.world; this.director = mir.director; this.economy = mir.economy; this.ts = mir.ts; this.activeGates = mir.activeGates;
    this.towerView = new TowerRenderer(this, this.ts, this.fx);
    this.wallView = new WallRenderer(this, this.ts, this.fx); this.wallArm = null;
    const me = mir.me; this.player = new Player(this, this.grid, me.tx, me.ty, { name: me.name, shirt: me.color }); this.player.skills = new MirrorSkills(me);
    this.remotes = new Map(); for (const p of mir.players.values()) if (p.id !== mir.you) this.remotes.set(p.id, new RemotePlayer(this, p));
    for (const g of this.activeGates) { const o = this.add.ellipse(g.x * TS + 16, g.y * TS + 22, 64, 40, 0x8e44ff, 0.35).setStrokeStyle(2, 0xd2a8ff).setDepth(1); this.tweens.add({ targets: o, scale: 1.15, alpha: 0.6, yoyo: true, repeat: -1, duration: 700 }); }
    this.selected = null; this.placing = null; this.paused = false; this.userPaused = false; this.state = 'playing'; this.refT = 0; this.peeking = false; this.wantSkill = null; this.sendT = 0; this.lastSent = null;
    this.panels = new Panels({
      ts: this.ts, economy: this.economy, close: () => this.select(null), onModal: () => {}, // nhiều người: không tạm dừng
      upgrade: (t) => this.cmd('upgrade', { tid: t.id }, (r) => { if (r.ok) { this.fx.ring(t.x * TS + TS, t.y * TS + TS, 0xffd24a, 6, 34, 0.4); this.wantSkill = t.id; } }),
      pick: (t, b) => this.cmd('pick', { tid: t.id, branch: b }, (r) => { if (r.ok) this.panels.hideSkill(); }),
      reset: (t) => this.cmd('reset', { tid: t.id }), sell: (t) => this.cmd('sell', { tid: t.id }, (r) => { if (r.ok) this.select(null); }),
    });
    this.events.once('shutdown', () => this.panels.destroy()); this.events.once('destroy', () => this.panels.destroy());
    S.sh = {
      onFree: (m) => this.renderer.release(m), onProjFree: (p) => this.towerView.releaseArrow(p), onTowerRemoved: (t) => { if (this.selected === t) this.select(null); },
      onWallAdded: () => audio.play('build_done'), onWallRemoved: () => { audio.play('sell'); },
      onHurt: (p) => { if (p.id === mir.you) { this.player.hurt(); this.player.invuln = GAME_CONFIG.player.invulnTime; this.cameras.main.shake(120, 0.004); } },
      onEvent: (ev) => this.onNetEvent(ev),
    };
    S.on('pos', (m) => { this.player.x = m.x; this.player.y = m.y; this.player.path = null; }).on('end', (st) => this.time.delayedCall(800, () => this.opts.onEnd?.(st)));
    this.ghost = this.add.sprite(0, 0, 'tower_base').setOrigin(0.5, 1).setAlpha(0.6).setVisible(false).setDepth(7e5); this.ghostG = this.add.graphics().setDepth(6.9e5);
    const cam = this.cameras.main; cam.setBounds(0, 0, map.width * TS, map.height * TS); cam.setBackgroundColor('#1b2a1b'); cam.roundPixels = true; cam.startFollow(this.player.sprite, true, 0.15, 0.15);
    this.scale.on('resize', this.fitZoom, this); this.fitZoom();
    this.scene.launch('UI', { map, player: this.player, camera: cam, game: this }); this.scene.bringToTop('UI');
    this.input.on('pointerdown', this.onTap, this);
    this.input.on('pointermove', (p) => { if (this.placing && p.id === this.placing.id) this.updateGhost(p); });
    this.input.on('pointerup', this.endPlacement, this); this.input.on('pointerupoutside', this.endPlacement, this);
    const k = this.input.keyboard; this.keys = k.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT'); this.kv = new Phaser.Math.Vector2();
  }
  cmd(op, args, cb) { this.session.c.cmd(op, args, (r) => { if (!r.ok && r.message) this.panels.toast(r.message); cb?.(r); }); }
  requestBuild(x, y) { this.cmd('build', { x, y }); }
  // Nhiều người: server quyết định. Thả tháp/tường => gửi lệnh; kết quả (hoặc lỗi) về qua 'res', đối tượng mới xuất hiện qua sự kiện 'tw'/'wl'.
  endPlacement(p) {
    const pl = this.placing; if (!pl || p.id !== pl.id) return;
    this.placing = null; this.ghost.setVisible(false); this.ghostG.clear();
    if (this.scene.get('UI').isUiPointer(p) || !pl.tile) return;
    this.cmd(pl.kind === 'wall' ? 'wall' : 'build', { x: pl.tile.x, y: pl.tile.y });
  }
  tapWall(w) {
    if (this.wallArm === w.id) { const x = w.x * TS + TS, y = w.y * TS - 6; this.disarmWall(); this.cmd('sellwall', { wid: w.id }, (r) => { if (r.ok) this.fx.float(x, y, '+' + this.ts.wallRefund(), '#ffd24a'); }); return; }
    this.wallArm = w.id; this.wallView.arm(w); this.panels.toast(`Chạm tường lần nữa để phá (hoàn ${this.ts.wallRefund()} vàng).`); this.wallTimer?.remove(); this.wallTimer = this.time.delayedCall(2500, () => this.disarmWall());
  }
  useSkill(name) {
    if (this.player.dead) return; const k = this.player.skills;
    if (!k.can(name)) { const cd = Math.ceil(k.remainingCd(name)); return this.panels.toast(`${SKILLS[name].name} đang hồi chiêu: ${Math.floor(cd / 60)}:${String(cd % 60).padStart(2, '0')}`); }
    this.cmd('skill', { name });
  }
  upgradeSpeed() {
    const lv = this.player.speedLevel; if (lv >= SPEED_UPGRADE.maxLevel) return this.panels.toast('Tốc độ chạy đã tối đa.');
    this.cmd('speed', {}, (r) => { if (r.ok) this.fx.float(this.player.x * TS, this.player.y * TS - 40, '⚡', '#8dff8d'); });
  }
  togglePause() {}
  placementPlayers() { return [...this.mir.players.values()].map((p) => (p.id === this.mir.you ? { x: this.player.x, y: this.player.y, r: 0.3, dead: p.dead } : { x: p.tx, y: p.ty, r: 0.3, dead: p.dead })); }
  mapPlayers() { return [...this.mir.players.values()].map((p) => (p.id === this.mir.you ? { x: this.player.x, y: this.player.y, color: p.color, dead: p.dead } : { x: p.x, y: p.y, color: p.color, dead: p.dead })); }
  netInfo() { return `${this.session.c.rtt || '…'}ms · ${[...this.mir.players.values()].filter((p) => p.conn).length}/${this.mir.players.size} người`; }
  deadNote() { return this.session.room?.opts?.respawn ? 'BẠN ĐÃ BỊ HẠ – chờ hồi sinh' : 'BẠN ĐÃ BỊ HẠ'; }
  pname(id) { return this.mir.players.get(id)?.name || 'Người chơi'; }
  onNetEvent(ev) {
    const [k] = ev, fx = this.fx;
    if (k === 'k') { fx.float(ev[2] * TS, ev[3] * TS - 18, '+' + ev[4]); fx.puff(ev[2] * TS, ev[3] * TS - 8, 0xffffff, 8, 50, 0.4); }
    else if (k === 'h') { const m = this.mir.byId.get(ev[1]); if (m) { const x = m.x * TS, y = m.y * TS - 8, kind = ['arrow', 'ice', 'fire'][ev[2]]; fx.puff(x, y, KIND_COLOR[kind], ev[3] ? 10 : 4, 40, 0.3); if (ev[3]) { fx.ring(x, y, 0xffd24a, 4, 22, 0.3); fx.float(x, y - 10, '!', '#ffd24a'); } if (ev[4] > 0) fx.ring(x, y + 8, 0x8fd0ff, 6, ev[4] * TS, 0.4); } }
    else if (k === 'tb') { const t = this.ts.towers.find((x) => x.id === ev[1]); if (t) { fx.ring(t.x * TS + TS, t.y * TS + TS, 0xffffff, 8, 44, 0.5); fx.puff(t.x * TS + TS, t.y * TS + TS, 0xffe08a, 10, 60, 0.5); } this.panels.refresh(); }
    else if (k === 'tw') { this.panels.refresh(); if (ev[1] === 'upd' && this.wantSkill === ev[2].id) { const t = this.ts.towers.find((x) => x.id === ev[2].id); this.wantSkill = null; if (t && t.pending > 0) this.panels.showSkill(t); } }
    else if (k === 'sk') { const p = ev[1] === this.mir.you ? this.player : this.mir.players.get(ev[1]); if (p) { const c = ev[2] === 'invincible' ? 0xffe066 : 0x9ad0ff; fx.ring(p.x * TS, p.y * TS - 16, c, 8, 48, 0.5); fx.puff(p.x * TS, p.y * TS - 16, c, 12, 70, 0.5); } if (ev[1] === this.mir.you) this.panels.toast(`${SKILLS[ev[2]].icon} ${SKILLS[ev[2]].name}: ${SKILLS[ev[2]].duration}s`, 'ok'); }
    else if (k === 'pe') { fx.ring(ev[2] * TS, ev[3] * TS - 10, 0x9ad0ff, 6, 40, 0.4); if (ev[1] === this.mir.you) this.panels.toast('Hết xuyên vật thể: đưa về ô hợp lệ gần nhất.', 'ok'); }
    else if (k === 'dd') this.panels.toast(`${this.pname(ev[1])} đã bị hạ.`);
    else if (k === 'rs') { fx.ring(ev[2] * TS, ev[3] * TS - 10, 0x8dff8d, 6, 40, 0.5); this.panels.toast(`${this.pname(ev[1])} đã hồi sinh.`, 'ok'); }
    else if (k === 'dc') this.panels.toast(`${this.pname(ev[1])} mất kết nối.`);
    else if (k === 'rc') this.panels.toast(`${this.pname(ev[1])} đã quay lại.`, 'ok');
    else if (k === 'lv') { this.panels.toast(`${this.pname(ev[1])} đã rời phòng.`); const r = this.remotes.get(ev[1]); if (r) { r.destroy(); this.remotes.delete(ev[1]); } }
  }
  update(_, ms) {
    const dt = Math.min(0.05, ms / 1000), ui = this.scene.get('UI'), K = this.keys, mir = this.mir, me = mir.me; let vec = ui?.joystick?.vec;
    const kx = (K.D.isDown || K.RIGHT.isDown ? 1 : 0) - (K.A.isDown || K.LEFT.isDown ? 1 : 0), ky = (K.S.isDown || K.DOWN.isDown ? 1 : 0) - (K.W.isDown || K.UP.isDown ? 1 : 0);
    if (kx || ky) { this.kv.set(kx, ky).normalize(); vec = this.kv; }
    const pl = this.player; pl.hp = me.hp; pl.speedLevel = me.speedLevel;
    if (me.dead && !pl.dead) pl.die(); else if (!me.dead && pl.dead) pl.revive(pl.x, pl.y);
    pl.update(me.dead ? 0 : dt, me.dead ? null : vec);
    this.sendT += dt; // gửi vị trí 20 lần/giây khi có thay đổi; server kiểm tra tốc độ + va chạm và kéo về nếu sai
    if (!me.dead && this.sendT >= 0.05 && this.session.c.status === 'open') {
      this.sendT = 0; const x = Math.round(pl.x * 100) / 100, y = Math.round(pl.y * 100) / 100, key = x + ',' + y + ',' + (pl.facingLeft ? 1 : 0);
      if (key !== this.lastSent) { this.lastSent = key; this.session.c.send({ t: 'mv', x, y, f: pl.facingLeft ? 1 : 0 }); }
    }
    mir.smooth(dt); for (const r of this.remotes.values()) r.update();
    this.fx.update(dt); this.renderer.sync(this.world.monsters); this.towerView.sync(dt, this.selected); this.wallView.sync(dt);
    this.refT += dt; if (this.refT > 0.4) { this.refT = 0; this.panels.refresh(); }
  }
}
