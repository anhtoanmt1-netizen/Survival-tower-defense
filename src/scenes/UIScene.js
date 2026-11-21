import Phaser from 'phaser';
import { Joystick } from '../input/Joystick.js';
import { ActionButton } from '../ui/ActionButton.js';
import { createUiTextures } from '../render/uiTextures.js';
import { THEMES } from '../config/themes/index.js';
import { T } from '../map/tiles.js';
import { safeInsets } from '../ui/safeArea.js';
import { SKILLS, SPEED_UPGRADE, speedUpgradeCost } from '../config/skills.js';
import { WAVE_SETTINGS } from '../config/waves.js';
import { FONT } from '../config/ui.js';
import { audio } from '../systems/Audio.js';
const fmtT = (s) => { const t = Math.ceil(s); return t >= 60 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : String(t); };
const TXT = { fontFamily: FONT, fontStyle: '700', color: '#fff', stroke: '#000', strokeThickness: 4 };
export class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }
  init(data) { this.d = data; }
  create() {
    const game = this.d.game, { map } = this.d, pal = THEMES[map.theme].minimap, S = (o) => o.setScrollFactor(0);
    createUiTextures(this); this.joystick = new Joystick(this); this.u = 1;
    // --- minimap: texture địa hình tạo 1 lần; lớp động (người chơi, quái, tháp, cổng, vùng nhìn) vẽ mỗi khung ---
    const col = { [T.GRASS]: pal.grass, [T.DIRT]: pal.dirt, [T.TREE]: pal.tree, [T.ROCK]: pal.rock, [T.RIVER]: pal.water, [T.BUSH]: pal.bush };
    const rgb = Object.fromEntries(Object.entries(col).map(([k, h]) => { const n = parseInt(h.slice(1), 16); return [k, [n >> 16, (n >> 8) & 255, n & 255]]; }));
    if (this.textures.exists('minimap')) this.textures.remove('minimap');
    const tex = this.textures.createCanvas('minimap', map.width, map.height), ctx = tex.getContext(), img = ctx.createImageData(map.width, map.height);
    for (let i = 0; i < map.tiles.length; i++) { const c = rgb[map.tiles[i]]; img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255; }
    ctx.putImageData(img, 0, 0); tex.refresh(); tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.expanded = false; this.mmSize = 112;
    this.mmFrame = S(this.add.graphics().setDepth(1000)); this.mm = S(this.add.image(0, 0, 'minimap').setOrigin(1, 0).setDepth(1001).setInteractive());
    this.mm.on('pointerdown', (p) => { audio.play('click'); this.onMinimap(p); });
    this.mmG = S(this.add.graphics().setDepth(1002));
    const btnStyle = { fontFamily: FONT, fontStyle: '700', color: '#fff', fontSize: '12px', backgroundColor: '#14221bee', padding: { x: 9, y: 7 } };
    this.mmBack = S(this.add.text(0, 0, '◎ Về nhân vật', btnStyle).setOrigin(1, 0).setDepth(1003).setInteractive().setVisible(false));
    this.mmShrink = S(this.add.text(0, 0, '⤡ Thu nhỏ', btnStyle).setOrigin(1, 0).setDepth(1003).setInteractive().setVisible(false));
    this.mmBack.on('pointerdown', () => { audio.play('click'); game.followPlayer(); }); this.mmShrink.on('pointerdown', () => { audio.play('close'); this.expanded = false; this.layout(); });
    // --- HUD: khung nền bo góc + chữ + thanh đếm ngược đợt ---
    // HUD: chỉ chữ, nền trong suốt (viền chữ đen giữ cho dễ đọc trên mọi nền)
    this.hud = S(this.add.text(0, 0, '', { ...TXT, fontStyle: '700', fontSize: '14px', lineSpacing: 5, strokeThickness: 4 }).setDepth(1000));
    this.setBtn = new ActionButton(this, { color: 0x3a5a48, icon: '⚙', iconSize: 18, onTap: () => { audio.play('open'); game.opts.openSettings?.(); } });
    this.banner = S(this.add.text(0, 0, '', { ...TXT, fontSize: '26px', fontStyle: '800', strokeThickness: 6, align: 'center' }).setOrigin(0.5).setDepth(1100).setAlpha(0));
    this.warn = S(this.add.text(0, 0, '', { ...TXT, fontSize: '18px', color: '#ffd24a', align: 'center' }).setOrigin(0.5, 0).setDepth(1100).setVisible(false));
    this.lastWave = 0; this.fpsT = 0; this.fpsText = ''; this.lastWarn = -1;
    // --- nút XÂY + thẻ tháp ---
    this.buildOpen = false; this.cardTxt = '';
    this.btn = new ActionButton(this, { color: 0xe0b13a, icon: '🔨', iconSize: 22, onTap: () => { audio.play(this.buildOpen ? 'close' : 'open'); this.setBuildOpen(!this.buildOpen); } });
    this.btnT = S(this.add.text(0, 0, 'XÂY', { fontFamily: FONT, fontSize: '11px', fontStyle: '800', color: '#2b1f06' }).setOrigin(0.5).setDepth(1010));
    this.cardG = S(this.add.graphics().setDepth(1000).setVisible(false));
    this.card = S(this.add.rectangle(0, 0, 196, 64, 0x000000, 0.001).setDepth(1001).setVisible(false).setInteractive());
    this.cardT = S(this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '12px', fontStyle: '600', color: '#fff', align: 'center', lineSpacing: 3 }).setOrigin(0.5).setDepth(1002).setVisible(false));
    this.card.on('pointerdown', (p) => { this.setBuildOpen(false); game.beginPlacement(p); });
    // --- nút kỹ năng + nâng tốc độ ---
    this.sk = {
      invincible: new ActionButton(this, { color: 0xc9a227, icon: SKILLS.invincible.icon, onTap: () => game.useSkill('invincible') }),
      phase: new ActionButton(this, { color: 0x4a78b8, icon: SKILLS.phase.icon, onTap: () => game.useSkill('phase') }),
      speed: new ActionButton(this, { color: 0x3f8f4f, icon: '⚡', iconSize: 19, onTap: () => game.upgradeSpeed() }),
    };
    this.scale.on('resize', this.layout, this); this.layout();
  }
  setBuildOpen(v) { this.buildOpen = v; this.card.setVisible(v); this.cardT.setVisible(v); this.cardG.setVisible(v); }
  onMinimap(p) {
    if (!this.expanded) { this.expanded = true; this.layout(); return; }
    const s = this.mmSize, { map } = this.d, lx = (p.x - (this.mmX - s)) / s, ly = (p.y - this.mmY) / s;
    this.d.game.peekAt(Math.floor(lx * map.width), Math.floor(ly * map.height)); // chạm minimap = xem khu vực đó trên bản đồ lớn
  }
  layout() {
    const { width, height } = this.scale, ins = safeInsets(), u = (this.u = Phaser.Math.Clamp(Math.min(width, height) / 420, 0.78, 1.25)), land = width > height;
    this.mmSize = this.expanded ? Math.min(300, Math.floor(Math.min(width, height) * 0.72)) : Math.round((land ? 96 : 112) * u);
    const Z = this.mmSize; this.mmX = width - ins.right - 10; this.mmY = ins.top + 10;
    this.mmFrame.clear().fillStyle(0x10180f, 0.8).fillRoundedRect(this.mmX - Z - 4, this.mmY - 4, Z + 8, Z + 8, 6).lineStyle(2, 0xe0b13a, 0.95).strokeRoundedRect(this.mmX - Z - 4, this.mmY - 4, Z + 8, Z + 8, 6);
    this.mm.setPosition(this.mmX, this.mmY).setDisplaySize(Z, Z);
    this.mmBack.setPosition(this.mmX, this.mmY + Z + 8); this.mmShrink.setPosition(this.mmX - this.mmBack.width - 8, this.mmY + Z + 8);
    this.hud.setPosition(ins.left + 12, ins.top + 10); this.banner.setPosition(width / 2, height * 0.3); this.warn.setPosition(width / 2, ins.top + 12);
    const rs = 17 * u; this.setBtn.layout(this.mmX - Z - 8 - rs - 2, this.mmY + rs + 2, rs, -1, 0); // nút cài đặt nằm ngay cạnh minimap
    this.joystick.layout(u);
    const rb = 36 * u, bx = width - ins.right - 24 - rb, by = height - ins.bottom - 24 - rb;
    this.btn.layout(bx, by, rb, -5 * u, 0); this.btnT.setPosition(bx, by + 17 * u);
    this.sk.invincible.layout(bx - 80 * u, by + 10 * u, 30 * u); this.sk.phase.layout(bx - 62 * u, by - 62 * u, 30 * u); this.sk.speed.layout(bx + 4 * u, by - 88 * u, 26 * u, -7 * u, 14 * u);
    this.cardX = bx + rb - 98; this.cardY = by - 88 * u - 26 * u - 12 - 32; this.card.setPosition(this.cardX, this.cardY); this.cardT.setPosition(this.cardX, this.cardY);
    this.cardG.clear().fillStyle(0x14221b, 0.96).fillRoundedRect(this.cardX - 98, this.cardY - 32, 196, 64, 10).lineStyle(2, 0xe0b13a, 0.95).strokeRoundedRect(this.cardX - 98, this.cardY - 32, 196, 64, 10);
  }
  isUiPointer(p) {
    const inR = (x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h, near = (b) => Math.hypot(p.x - b.hit.x, p.y - b.hit.y) <= b.hit.r + 8, S = this.mmSize;
    return this.joystick.ownsPointer(p) || inR(this.mmX - S, this.mmY, S, S) || near(this.btn) || near(this.setBtn) || Object.values(this.sk).some(near)
      || (this.buildOpen && inR(this.cardX - 98, this.cardY - 32, 196, 64)) || [this.mmBack, this.mmShrink].some((b) => b.visible && b.getBounds().contains(p.x, p.y));
  }
  update(_, ms) {
    const { map, player, camera: cam, game } = this.d, S = this.mmSize, sx = S / map.width, sy = S / map.height, x0 = this.mmX - S, y0 = this.mmY, ts = 32;
    const dir = game.director, world = game.world, k = player.skills, diff = game.diff;
    // minimap động
    const g = this.mmG; g.clear();
    g.fillStyle(0x4aa3f0, 1); for (const t of game.ts.towers) g.fillRect(x0 + t.x * sx - 1, y0 + t.y * sy - 1, Math.max(3, sx * 1.6), Math.max(3, sy * 1.6));
    g.fillStyle(0xb06cff, 1); for (const gt of game.activeGates) g.fillRect(x0 + gt.x * sx - 3, y0 + gt.y * sy - 3, 6, 6);
    g.fillStyle(0xff3b30, 1); for (const m of world.monsters) if (!m.dying) g.fillRect(x0 + m.x * sx - 1, y0 + m.y * sy - 1, Math.max(2, sx), Math.max(2, sy));
    const vw = cam.width / cam.zoom / ts, vh = cam.height / cam.zoom / ts;
    g.lineStyle(1, 0xffffff, 0.85).strokeRect(x0 + (cam.midPoint.x / ts - vw / 2) * sx, y0 + (cam.midPoint.y / ts - vh / 2) * sy, vw * sx, vh * sy);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(player.shirt).color, 1).fillCircle(x0 + player.x * sx, y0 + player.y * sy, this.expanded ? 4 : 3).lineStyle(1, 0xffffff, 1).strokeCircle(x0 + player.x * sx, y0 + player.y * sy, this.expanded ? 4 : 3);
    this.mmBack.setVisible(this.expanded || game.peeking); this.mmShrink.setVisible(this.expanded);
    // nút kỹ năng: sẵn sàng (nhấp nháy nhẹ) / đang kích hoạt (vòng sáng + đếm ngược) / hồi chiêu (quạt tối + thời gian)
    for (const key of ['invincible', 'phase']) {
      const o = this.sk[key], act = k.isActive(key), cd = k.remainingCd(key), cfg = k.cfg[key], a = player.dead ? 0.3 : 1;
      if (act) o.setState({ alpha: a, active: true, activeFrac: k.remainingActive(key) / cfg.duration, sub: String(Math.ceil(k.remainingActive(key))), subColor: '#fff08a' });
      else if (cd > 0) o.setState({ alpha: a * 0.85, cd, cdFrac: cd / cfg.cooldown, sub: fmtT(cd) });
      else o.setState({ alpha: a, ready: !player.dead, sub: 'SẴN SÀNG', subColor: '#8dff8d' });
    }
    const lv = player.speedLevel, max = lv >= SPEED_UPGRADE.maxLevel, cost = Math.round(speedUpgradeCost(lv) * diff.upgradeMul), poor = game.economy.gold < cost;
    this.sk.speed.ico.setText('⚡' + lv); this.sk.speed.setState({ alpha: max || poor ? 0.55 : 1, sub: max ? 'TỐI ĐA' : cost + '🪙', subColor: !max && !poor ? '#ffe9a0' : '#ffffff', ready: !max && !poor });
    // thẻ xây + chữ HUD
    const bc = game.ts.buildCost(), txt = `🏹 Tháp cung tên\n🪙 ${bc} · kéo ra bản đồ`; if (txt !== this.cardTxt) { this.cardTxt = txt; this.cardT.setText(txt); }
    this.card.setAlpha(1); this.cardT.setAlpha(game.economy.gold >= bc ? 1 : 0.5); this.cardG.setAlpha(game.economy.gold >= bc ? 1 : 0.6);
    this.btn.setState({ alpha: player.dead ? 0.3 : 1, active: this.buildOpen, activeFrac: 1, ready: !player.dead && !this.buildOpen && game.economy.gold >= bc }); this.btnT.setAlpha(player.dead ? 0.3 : 1);
    this.fpsT += ms; if (this.fpsT > 500) { this.fpsT = 0; this.fpsText = Math.round(this.game.loop.actualFps) + ' FPS'; }
    const hearts = '♥'.repeat(player.hp) + '♡'.repeat(player.maxHp - player.hp), total = WAVE_SETTINGS.totalWaves, cdn = Math.ceil(Math.max(0, dir.countdown));
    const nextWave = dir.wave + 1, ns = dir.wave < total ? dir.specFor(nextWave) : null, next = ns ? `${dir.wave === 0 ? 'Đợt đầu' : 'Đợt ' + nextWave} sau ${cdn}s (${ns.count} slime${ns.boss ? ', THỬ THÁCH' : ''})` : 'Đã xuất hiện đủ ' + total + ' đợt – diệt hết để thắng';
    const text = `${hearts}   🪙 ${game.economy.gold}   ${diff.icon} ${diff.name}\nĐợt ${dir.wave}/${total}   Slime: ${world.active}${dir.queue.length ? ' (+' + dir.queue.length + ' chờ)' : ''}\n${next}\n${this.fpsText}`;
    if (text !== this.hud.text) this.hud.setText(text);
    this.setBtn.setState({ alpha: 1 });
    if (dir.wave < total && cdn <= 5 && cdn > 0) { this.warn.setText(`⚠ ĐỢT ${nextWave} SẮP TỚI: ${cdn}s`).setVisible(true).setScale(1 + 0.06 * Math.sin(this.time.now / 90)); if (cdn !== this.lastWarn) { this.lastWarn = cdn; audio.play('warn'); } } else { this.warn.setVisible(false); this.lastWarn = -1; }
    if (dir.wave !== this.lastWave) { this.lastWave = dir.wave; const s = dir.currentSpec; this.banner.setText(`ĐỢT ${dir.wave}${s.boss ? ' – THỬ THÁCH' : ''}\n${s.count} slime`).setAlpha(1); this.tweens.add({ targets: this.banner, alpha: 0, delay: 1500, duration: 600 }); audio.play(s.boss ? 'wave_boss' : 'wave_start'); }
    if (player.dead) this.banner.setText('BẠN ĐÃ BỊ HẠ').setAlpha(1);
  }
}
