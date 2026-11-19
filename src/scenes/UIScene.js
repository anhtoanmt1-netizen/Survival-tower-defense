import Phaser from 'phaser';
import { Joystick } from '../input/Joystick.js';
import { THEMES } from '../config/themes/index.js';
import { T } from '../map/tiles.js';
import { safeInsets } from '../ui/safeArea.js';
import { SKILLS, SPEED_UPGRADE, speedUpgradeCost } from '../config/skills.js';
import { WAVE_SETTINGS, waveSpec } from '../config/waves.js';
const fmtT = (s) => { const t = Math.ceil(s); return t >= 60 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : String(t); };
const TXT = { fontFamily: 'sans-serif', color: '#fff', stroke: '#000', strokeThickness: 4 };
export class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }
  init(data) { this.d = data; }
  create() {
    const game = this.d.game, { map } = this.d, pal = THEMES[map.theme].minimap;
    this.joystick = new Joystick(this);
    // --- minimap: texture địa hình tạo 1 lần; lớp động (người chơi, quái, tháp, cổng, vùng nhìn) vẽ mỗi khung ---
    const col = { [T.GRASS]: pal.grass, [T.DIRT]: pal.dirt, [T.TREE]: pal.tree, [T.ROCK]: pal.rock, [T.RIVER]: pal.water, [T.BUSH]: pal.bush };
    const rgb = Object.fromEntries(Object.entries(col).map(([k, h]) => { const n = parseInt(h.slice(1), 16); return [k, [n >> 16, (n >> 8) & 255, n & 255]]; }));
    if (this.textures.exists('minimap')) this.textures.remove('minimap');
    const tex = this.textures.createCanvas('minimap', map.width, map.height), ctx = tex.getContext(), img = ctx.createImageData(map.width, map.height);
    for (let i = 0; i < map.tiles.length; i++) { const c = rgb[map.tiles[i]]; img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255; }
    ctx.putImageData(img, 0, 0); tex.refresh(); tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.expanded = false; this.mmSize = 112;
    this.mmFrame = this.add.rectangle(0, 0, 116, 116, 0x000000, 0.6).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
    this.mm = this.add.image(0, 0, 'minimap').setOrigin(1, 0).setScrollFactor(0).setDepth(1001).setInteractive();
    this.mm.on('pointerdown', (p) => this.onMinimap(p));
    this.mmG = this.add.graphics().setScrollFactor(0).setDepth(1002);
    const btnStyle = { ...TXT, strokeThickness: 0, fontSize: '13px', backgroundColor: '#14221bee', padding: { x: 9, y: 7 } };
    this.mmBack = this.add.text(0, 0, '◎ Về nhân vật', btnStyle).setOrigin(1, 0).setScrollFactor(0).setDepth(1003).setInteractive().setVisible(false);
    this.mmShrink = this.add.text(0, 0, '⤡ Thu nhỏ', btnStyle).setOrigin(1, 0).setScrollFactor(0).setDepth(1003).setInteractive().setVisible(false);
    this.mmBack.on('pointerdown', () => game.followPlayer());
    this.mmShrink.on('pointerdown', () => { this.expanded = false; this.layout(); });
    // --- HUD chữ ---
    this.hud = this.add.text(0, 0, '', { ...TXT, fontSize: '15px', lineSpacing: 3 }).setScrollFactor(0).setDepth(1000);
    this.banner = this.add.text(0, 0, '', { ...TXT, fontSize: '26px', fontStyle: 'bold', strokeThickness: 6, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(1100).setAlpha(0);
    this.warn = this.add.text(0, 0, '', { ...TXT, fontSize: '18px', fontStyle: 'bold', color: '#ffd24a', align: 'center' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1100).setVisible(false);
    this.lastWave = 0; this.fpsT = 0; this.fpsText = '';
    // --- nút XÂY + thẻ tháp ---
    this.buildOpen = false; this.cardTxt = '';
    this.btn = this.add.circle(0, 0, 36, 0xe0b13a, 0.95).setStrokeStyle(4, 0xffffff, 0.9).setScrollFactor(0).setDepth(1000).setInteractive();
    this.btnT = this.add.text(0, 0, 'XÂY', { fontFamily: 'sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#2b1f06' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.card = this.add.rectangle(0, 0, 184, 64, 0x14221b, 0.96).setStrokeStyle(2, 0xffffff, 0.5).setScrollFactor(0).setDepth(1000).setVisible(false).setInteractive();
    this.cardT = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#fff', align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setVisible(false);
    this.btn.on('pointerdown', () => { this.buildOpen = !this.buildOpen; this.card.setVisible(this.buildOpen); this.cardT.setVisible(this.buildOpen); });
    this.card.on('pointerdown', (p) => { this.buildOpen = false; this.card.setVisible(false); this.cardT.setVisible(false); game.beginPlacement(p); });
    // --- nút kỹ năng + nâng tốc độ ---
    this.sk = {}; this.pos = {};
    const mk = (key, color, onTap) => {
      const circ = this.add.circle(0, 0, 30, color, 0.92).setStrokeStyle(3, 0xffffff, 0.85).setScrollFactor(0).setDepth(1000).setInteractive();
      const ico = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '22px' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
      const sub = this.add.text(0, 0, '', { ...TXT, fontSize: '12px', fontStyle: 'bold', strokeThickness: 3 }).setOrigin(0.5).setScrollFactor(0).setDepth(1003);
      circ.on('pointerdown', onTap); this.sk[key] = { circ, ico, sub };
    };
    mk('invincible', 0xc9a227, () => game.useSkill('invincible')); mk('phase', 0x4a78b8, () => game.useSkill('phase')); mk('speed', 0x3f8f4f, () => game.upgradeSpeed());
    this.sk.invincible.ico.setText(SKILLS.invincible.icon); this.sk.phase.ico.setText(SKILLS.phase.icon);
    this.cdG = this.add.graphics().setScrollFactor(0).setDepth(1002);
    this.scale.on('resize', this.layout, this); this.layout();
  }
  onMinimap(p) {
    if (!this.expanded) { this.expanded = true; this.layout(); return; }
    const s = this.mmSize, { map } = this.d, lx = (p.x - (this.mmX - s)) / s, ly = (p.y - this.mmY) / s;
    this.d.game.peekAt(Math.floor(lx * map.width), Math.floor(ly * map.height)); // chạm minimap = xem khu vực đó trên bản đồ lớn
  }
  layout() {
    const { width, height } = this.scale, ins = safeInsets();
    this.mmSize = this.expanded ? Math.min(300, Math.floor(Math.min(width, height) * 0.72)) : 112;
    const S = this.mmSize; this.mmX = width - ins.right - 10; this.mmY = ins.top + 10;
    this.mmFrame.setPosition(this.mmX + 2, this.mmY - 2).setSize(S + 4, S + 4); this.mm.setPosition(this.mmX, this.mmY).setDisplaySize(S, S);
    this.mmBack.setPosition(this.mmX, this.mmY + S + 6); this.mmShrink.setPosition(this.mmX - this.mmBack.width - 8, this.mmY + S + 6);
    this.hud.setPosition(ins.left + 10, ins.top + 48); this.banner.setPosition(width / 2, height * 0.3); this.warn.setPosition(width / 2, ins.top + 52 + (this.expanded ? 0 : 0));
    this.joystick.layout();
    this.btnX = width - ins.right - 24 - 34; this.btnY = height - ins.bottom - 24 - 34; const bx = this.btnX, by = this.btnY;
    this.btn.setPosition(bx, by); this.btnT.setPosition(bx, by);
    this.pos = { invincible: [bx - 80, by + 10, 30], phase: [bx - 62, by - 62, 30], speed: [bx + 4, by - 88, 26] };
    for (const [k, [x, y, r]] of Object.entries(this.pos)) { const o = this.sk[k]; o.circ.setPosition(x, y).setRadius(r); o.ico.setPosition(x, y - 6); o.sub.setPosition(x, y + 14); }
    this.cardX = bx + 34 - 92; this.cardY = by - 88 - 26 - 12 - 32; this.card.setPosition(this.cardX, this.cardY); this.cardT.setPosition(this.cardX, this.cardY);
  }
  isUiPointer(p) {
    const inR = (x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h, near = (x, y, r) => Math.hypot(p.x - x, p.y - y) <= r + 8, S = this.mmSize;
    return this.joystick.ownsPointer(p) || inR(this.mmX - S, this.mmY, S, S) || near(this.btnX, this.btnY, 36) || Object.values(this.pos).some(([x, y, r]) => near(x, y, r))
      || (this.buildOpen && inR(this.cardX - 92, this.cardY - 32, 184, 64)) || [this.mmBack, this.mmShrink].some((b) => b.visible && b.getBounds().contains(p.x, p.y));
  }
  update(_, ms) {
    const { map, player, camera: cam, game } = this.d, S = this.mmSize, sx = S / map.width, sy = S / map.height, x0 = this.mmX - S, y0 = this.mmY, ts = 32;
    const dir = game.director, world = game.world, k = player.skills;
    // minimap động
    const g = this.mmG; g.clear();
    g.fillStyle(0x4aa3f0, 1); for (const t of game.ts.towers) g.fillRect(x0 + t.x * sx - 1, y0 + t.y * sy - 1, Math.max(3, sx * 1.6), Math.max(3, sy * 1.6));
    g.fillStyle(0xb06cff, 1); for (const gt of game.activeGates) g.fillRect(x0 + gt.x * sx - 3, y0 + gt.y * sy - 3, 6, 6);
    g.fillStyle(0xff3b30, 1); for (const m of world.monsters) if (!m.dying) g.fillRect(x0 + m.x * sx - 1, y0 + m.y * sy - 1, Math.max(2, sx), Math.max(2, sy));
    const vw = cam.width / cam.zoom / ts, vh = cam.height / cam.zoom / ts;
    g.lineStyle(1, 0xffffff, 0.85).strokeRect(x0 + (cam.midPoint.x / ts - vw / 2) * sx, y0 + (cam.midPoint.y / ts - vh / 2) * sy, vw * sx, vh * sy);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(player.shirt).color, 1).fillCircle(x0 + player.x * sx, y0 + player.y * sy, this.expanded ? 4 : 3).lineStyle(1, 0xffffff, 1).strokeCircle(x0 + player.x * sx, y0 + player.y * sy, this.expanded ? 4 : 3);
    this.mmBack.setVisible(this.expanded || game.peeking); this.mmShrink.setVisible(this.expanded);
    // nút kỹ năng
    const cg = this.cdG; cg.clear();
    for (const key of ['invincible', 'phase']) {
      const [x, y, r] = this.pos[key], o = this.sk[key], act = k.isActive(key), cd = k.remainingCd(key);
      if (act) { cg.lineStyle(5, 0xfff08a, 1).strokeCircle(x, y, r + 3); o.sub.setText(String(Math.ceil(k.remainingActive(key)))).setColor('#fff08a'); }
      else if (cd > 0) { cg.fillStyle(0x000000, 0.62).beginPath().slice(x, y, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (cd / SKILLS[key].cooldown), false).fillPath(); o.sub.setText(fmtT(cd)).setColor('#ffffff'); }
      else o.sub.setText('SẴN SÀNG').setColor('#8dff8d');
      o.circ.setAlpha(player.dead ? 0.3 : 0.92);
    }
    const sp = this.sk.speed, lv = player.speedLevel, max = lv >= SPEED_UPGRADE.maxLevel, cost = speedUpgradeCost(lv);
    sp.ico.setText('⚡' + lv); sp.sub.setText(max ? 'TỐI ĐA' : cost + '🪙'); sp.circ.setAlpha(max || game.economy.gold < cost ? 0.5 : 0.95);
    // thẻ xây + chữ HUD
    const bc = game.ts.buildCost(), txt = `🏹 Tháp cung tên\n🪙 ${bc} · kéo ra bản đồ`; if (txt !== this.cardTxt) { this.cardTxt = txt; this.cardT.setText(txt); }
    this.card.setAlpha(game.economy.gold >= bc ? 1 : 0.55); this.btn.setAlpha(player.dead ? 0.3 : 0.95);
    this.fpsT += ms; if (this.fpsT > 500) { this.fpsT = 0; this.fpsText = Math.round(this.game.loop.actualFps) + ' FPS'; }
    const hearts = '♥'.repeat(player.hp) + '♡'.repeat(player.maxHp - player.hp), total = WAVE_SETTINGS.totalWaves, cdn = Math.ceil(Math.max(0, dir.countdown));
    const nextWave = dir.wave + 1, next = dir.wave >= total ? 'Đã xuất hiện đủ ' + total + ' đợt – diệt hết để thắng' : `${dir.wave === 0 ? 'Đợt đầu' : 'Đợt ' + nextWave} sau ${cdn}s (${waveSpec(nextWave).count} slime${waveSpec(nextWave).boss ? ', THỬ THÁCH' : ''})`;
    this.hud.setText(`${hearts}   🪙 ${game.economy.gold}\nĐợt ${dir.wave}/${total}   Slime: ${world.active}${dir.queue.length ? ' (+' + dir.queue.length + ' chờ)' : ''}\n${next}   ${this.fpsText}`);
    if (dir.wave < total && cdn <= 5 && cdn > 0) this.warn.setText(`⚠ ĐỢT ${nextWave} SẮP TỚI: ${cdn}s`).setVisible(true).setScale(1 + 0.06 * Math.sin(this.time.now / 90)); else this.warn.setVisible(false);
    if (dir.wave !== this.lastWave) { this.lastWave = dir.wave; const s = dir.currentSpec; this.banner.setText(`ĐỢT ${dir.wave}${s.boss ? ' – THỬ THÁCH' : ''}\n${s.count} slime`).setAlpha(1); this.tweens.add({ targets: this.banner, alpha: 0, delay: 1500, duration: 600 }); }
    if (player.dead) this.banner.setText('BẠN ĐÃ BỊ HẠ').setAlpha(1);
  }
}
