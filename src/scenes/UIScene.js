import Phaser from 'phaser';
import { Joystick } from '../input/Joystick.js';
import { ActionButton } from '../ui/ActionButton.js';
import { createUiTextures } from '../render/uiTextures.js';
import { THEMES } from '../config/themes/index.js';
import { T } from '../map/tiles.js';
import { previewBuffer, previewScale } from '../ui/mapPreview.js';
import { safeInsets } from '../ui/safeArea.js';
import { SKILLS, SPEED_UPGRADE, speedUpgradeCost } from '../config/skills.js';
import { WAVE_SETTINGS } from '../config/waves.js';
import { FONT } from '../config/ui.js';
import { audio } from '../systems/Audio.js';
import { getDifficulty } from '../config/difficulty.js';
const fmtT = (s) => { const t = Math.ceil(s); return t >= 60 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : String(t); };
const TXT = { fontFamily: FONT, fontStyle: '700', color: '#fff', stroke: '#000', strokeThickness: 4 };
export class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }
  init(data) { this.d = data; }
  create() {
    const game = this.d.game, { map } = this.d, pal = THEMES[map.theme].minimap, S = (o) => o.setScrollFactor(0);
    createUiTextures(this); this.joystick = new Joystick(this); this.u = 1;
    for (const [n, c] of Object.entries(game.opts.icons || {})) if (!this.textures.exists('ui_icon_' + n)) this.textures.addCanvas('ui_icon_' + n, c); // icon vector đã rasterize (cùng bộ với DOM)
    // --- minimap: texture địa hình tạo 1 lần; lớp động (người chơi, quái, tháp, cổng, vùng nhìn) vẽ mỗi khung ---
    const col = { [T.GRASS]: pal.grass, [T.DIRT]: pal.dirt, [T.TREE]: pal.tree, [T.ROCK]: pal.rock, [T.RIVER]: pal.water, [T.BUSH]: pal.bush };
    const rgb = Object.fromEntries(Object.entries(col).map(([k, h]) => { const n = parseInt(h.slice(1), 16); return [k, [n >> 16, (n >> 8) & 255, n & 255]]; }));
    if (this.textures.exists('minimap')) this.textures.remove('minimap');
    const tex = this.textures.createCanvas('minimap', map.width, map.height), ctx = tex.getContext(), img = ctx.createImageData(map.width, map.height);
    for (let i = 0; i < map.tiles.length; i++) { const c = rgb[map.tiles[i]]; img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255; }
    ctx.putImageData(img, 0, 0); tex.refresh(); tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    // Sau khung đầu tiên: thay bằng bản đồ dựng bằng CHÍNH bộ ghép của màn xem trước (cùng màu, bờ nước, cây, vách) => minimap và bản xem trước đồng bộ phong cách
    this.time.delayedCall(40, () => this.richMinimap());
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
    const T14 = { ...TXT, fontStyle: '800', fontSize: '15px', strokeThickness: 4 }, T11 = { ...TXT, fontStyle: '700', fontSize: '11px', strokeThickness: 3, color: '#e8efe3' }, I = (k, tint) => S(this.add.image(0, 0, 'ui_icon_' + k).setDepth(1000).setTint(tint));
    this.hearts = []; this.icoCoin = I('coin', 0xffd24a); this.txGold = S(this.add.text(0, 0, '', T14).setDepth(1000)); this.icoFlag = I('flag', 0x9ad8ff); this.txWave = S(this.add.text(0, 0, '', T14).setDepth(1000)); this.icoSlime = I('slime', 0x8be07a); this.txSlime = S(this.add.text(0, 0, '', T14).setDepth(1000)); this.txNext = S(this.add.text(0, 0, '', T11).setDepth(1000)); this.txInfo = S(this.add.text(0, 0, '', T11).setDepth(1000));
    this.pillBg = S(this.add.graphics().setDepth(1050)); this.pillIco = I('pause', 0xffffff).setDepth(1051); this.pillTx = S(this.add.text(0, 0, 'Tạm dừng khi nâng cấp', { ...TXT, fontSize: '11px', fontStyle: '700', strokeThickness: 3 }).setDepth(1051)); this.pillShown = false;
    this.setBtn = new ActionButton(this, { color: 0x3a5a48, iconKey: 'ui_icon_gear', onTap: () => { audio.play('open'); game.opts.openSettings?.(); } });
    this.banner = S(this.add.text(0, 0, '', { ...TXT, fontSize: '26px', fontStyle: '800', strokeThickness: 6, align: 'center' }).setOrigin(0.5).setDepth(1100).setAlpha(0));
    this.warn = S(this.add.text(0, 0, '', { ...TXT, fontSize: '18px', color: '#ffd24a', align: 'center' }).setOrigin(0.5, 0).setDepth(1100).setVisible(false));
    this.lastWave = 0; this.fpsT = 0; this.fpsText = ''; this.lastWarn = -1;
    // --- nút XÂY + thẻ tháp ---
    this.buildOpen = false; this.cardTxt = '';
    this.btn = new ActionButton(this, { color: 0xe0b13a, iconKey: 'ui_icon_hammer', onTap: () => { audio.play(this.buildOpen ? 'close' : 'open'); this.setBuildOpen(!this.buildOpen); } });
    this.btnT = S(this.add.text(0, 0, 'XÂY', { fontFamily: FONT, fontSize: '11px', fontStyle: '800', color: '#2b1f06' }).setOrigin(0.5).setDepth(1010));
    this.buildMenu(game);
    // --- nút kỹ năng + nâng tốc độ ---
    this.sk = {
      invincible: new ActionButton(this, { color: 0xc9a227, iconKey: 'ui_icon_shield', onTap: () => game.useSkill('invincible') }),
      phase: new ActionButton(this, { color: 0x4a78b8, iconKey: 'ui_icon_dash', onTap: () => game.useSkill('phase') }),
      speed: new ActionButton(this, { color: 0x3f8f4f, iconKey: 'ui_icon_bolt', onTap: () => game.upgradeSpeed() }),
    };
    this.scale.on('resize', this.layout, this); this.layout();
  }
  // ---- BẢNG XÂY DỰNG: 2 thẻ có ICON (Tháp / Tường), kéo thẻ ra bản đồ để đặt. Mở/đóng có hoạt ảnh trượt + phóng (so le từng thẻ). ----
  buildMenu(game) {
    const S = (o) => o.setScrollFactor(0), W = 94, H = 96, GAP = 8; this.MW = W * 2 + GAP + 16; this.MH = H + 16; this.mCards = [];
    this.menu = S(this.add.container(0, 0).setDepth(1001).setVisible(false).setAlpha(0)); this.menuBg = S(this.add.graphics()); this.menu.add(this.menuBg);
    const defs = [
      { kind: 'tower', name: 'Tháp cung tên', tex: 'tower_0', h: 50, accent: 0xe0b13a, cost: () => game.ts.buildCost() },
      { kind: 'wall', name: 'Tường', tex: 'wall', h: 40, accent: 0xd35a4a, cost: () => game.ts.wallCost() },
    ];
    defs.forEach((d, i) => {
      const c = S(this.add.container((i - 0.5) * (W + GAP), 0)), bg = S(this.add.graphics()), icon = S(this.add.image(0, -8, d.tex)).setOrigin(0.5, 0.5);
      icon.setScale(d.h / icon.height); const name = S(this.add.text(0, H / 2 - 30, d.name, { fontFamily: FONT, fontSize: '10.5px', fontStyle: '800', color: '#fff' }).setOrigin(0.5)), coin = S(this.add.image(-14, H / 2 - 13, 'ui_icon_coin').setDisplaySize(15, 15).setTint(0xffd24a));
      const price = S(this.add.text(-4, H / 2 - 13, '', { fontFamily: FONT, fontSize: '13px', fontStyle: '800', color: '#ffe9a0' }).setOrigin(0, 0.5)), zone = S(this.add.rectangle(0, 0, W, H, 0x000000, 0.001).setInteractive());
      const paint = (hot) => { bg.clear().fillStyle(hot ? 0x2c4636 : 0x203528, 1).fillRoundedRect(-W / 2, -H / 2, W, H, 11).lineStyle(2, d.accent, hot ? 1 : 0.8).strokeRoundedRect(-W / 2, -H / 2, W, H, 11); bg.fillStyle(d.accent, 0.16).fillRoundedRect(-W / 2 + 3, -H / 2 + 3, W - 6, 30, { tl: 8, tr: 8, bl: 0, br: 0 }); };
      paint(false); c.add([bg, icon, name, coin, price, zone]);
      zone.on('pointerover', () => { paint(true); this.tweens.add({ targets: c, scale: 1.05, duration: 120 }); }).on('pointerout', () => { paint(false); this.tweens.add({ targets: c, scale: 1, duration: 120 }); });
      zone.on('pointerdown', (p) => { if (!this.buildOpen) return; audio.play('click'); this.tweens.add({ targets: c, scale: 0.94, duration: 70, yoyo: true }); this.setBuildOpen(false); game.beginPlacement(p, d.kind); });
      this.menu.add(c); this.mCards.push({ d, c, price, name, coin, icon, last: -1, ok: true });
    });
  }
  layoutMenu() { // đặt bảng ngay phía trên cụm nút kỹ năng; vẽ khung nền
    const { MW, MH } = this; this.menuX = this.mx0; this.menuY = this.my0; this.menu.setPosition(this.menuX, this.menuY + (this.buildOpen ? 0 : 14));
    this.menuBg.clear().fillStyle(0x0c1710, 0.5).fillRoundedRect(-MW / 2 - 3, -MH / 2 + 3, MW + 6, MH + 3, 16).fillStyle(0x14221b, 0.97).fillRoundedRect(-MW / 2, -MH / 2, MW, MH, 14).lineStyle(2, 0xe0b13a, 0.95).strokeRoundedRect(-MW / 2, -MH / 2, MW, MH, 14);
  }
  setBuildOpen(v) {
    if (v === this.buildOpen && this.menu.visible === v) return; this.buildOpen = v; this.menuTween?.stop(); const m = this.menu, y = this.menuY;
    this.mCards.forEach((o, i) => { this.tweens.killTweensOf(o.c); o.c.setScale(1); });
    if (v) {   // mở: trượt lên + phóng to (back-out), từng thẻ nảy so le
      m.setVisible(true).setAlpha(0).setScale(0.82).setY(y + 22); this.menuTween = this.tweens.add({ targets: m, alpha: 1, scale: 1, y, duration: 220, ease: 'Back.easeOut' });
      this.mCards.forEach((o, i) => { o.c.setAlpha(0).setScale(0.85); this.tweens.add({ targets: o.c, alpha: 1, scale: 1, duration: 200, delay: 60 + i * 55, ease: 'Back.easeOut' }); });
    } else {   // đóng: thu nhỏ + mờ dần rồi ẩn hẳn
      this.menuTween = this.tweens.add({ targets: m, alpha: 0, scale: 0.9, y: y + 14, duration: 150, ease: 'Quad.easeIn', onComplete: () => { if (!this.buildOpen) m.setVisible(false); } });
    }
  }
  richMinimap() {
    try {
      const { map } = this.d, ids = ['grass', 'flower', 'dirt', 'sand', 'shallow', 'deep', 'pave'], m = {}, c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
      for (const n of ids) { const im = this.textures.get('fill_' + n).getSourceImage(); c.width = im.width; c.height = im.height; x.clearRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0); m['fill_' + n] = { w: im.width, h: im.height, data: x.getImageData(0, 0, im.width, im.height).data }; }
      const buf = previewBuffer(map, { get: (id) => m[id] }, previewScale(map.width)); if (!this.scene.isActive()) return;
      if (this.textures.exists('minimap_rich')) this.textures.remove('minimap_rich');
      const tex = this.textures.createCanvas('minimap_rich', buf.w, buf.h); tex.getContext().putImageData(new ImageData(buf.data, buf.w, buf.h), 0, 0); tex.refresh(); tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.mm.setTexture('minimap_rich'); this.layout();
    } catch (e) { console.warn('Minimap: giữ bản màu phẳng', e); }
  }
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
    this.hx = ins.left + 12; this.hy = ins.top + 10; this.banner.setPosition(width / 2, height * 0.3); this.warn.setPosition(width / 2, ins.top + 12);
    const rs = 17 * u; this.setBtn.layout(this.mmX - Z - 8 - rs - 2, this.mmY + rs + 2, rs, -1, 0); // nút cài đặt nằm ngay cạnh minimap
    this.joystick.layout(u);
    const rb = 36 * u, bx = width - ins.right - 24 - rb, by = height - ins.bottom - 24 - rb;
    this.btn.layout(bx, by, rb, -5 * u, 0); this.btnT.setPosition(bx, by + 17 * u);
    this.sk.invincible.layout(bx - 80 * u, by + 10 * u, 30 * u); this.sk.phase.layout(bx - 62 * u, by - 62 * u, 30 * u); this.sk.speed.layout(bx + 4 * u, by - 88 * u, 26 * u, -7 * u, 14 * u);
    this.mx0 = Math.min(bx + rb - this.MW / 2, width - ins.right - 8 - this.MW / 2); this.my0 = by - 88 * u - 26 * u - 14 - this.MH / 2; this.layoutMenu();
  }
  isUiPointer(p) {
    const inR = (x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h, near = (b) => Math.hypot(p.x - b.hit.x, p.y - b.hit.y) <= b.hit.r + 8, S = this.mmSize;
    return this.joystick.ownsPointer(p) || inR(this.mmX - S, this.mmY, S, S) || near(this.btn) || near(this.setBtn) || Object.values(this.sk).some(near)
      || (this.buildOpen && inR(this.menuX - this.MW / 2, this.menuY - this.MH / 2, this.MW, this.MH)) || [this.mmBack, this.mmShrink].some((b) => b.visible && b.getBounds().contains(p.x, p.y));
  }
  update(_, ms) {
    const { map, player, camera: cam, game } = this.d, S = this.mmSize, sx = S / map.width, sy = S / map.height, x0 = this.mmX - S, y0 = this.mmY, ts = 32;
    const dir = game.director, world = game.world, k = player.skills, diff = game.diff;
    // minimap động
    const g = this.mmG; g.clear();
    g.fillStyle(0x4aa3f0, 1); for (const t of game.ts.towers) g.fillRect(x0 + t.x * sx - 1, y0 + t.y * sy - 1, Math.max(3, sx * 1.6), Math.max(3, sy * 1.6));
    g.fillStyle(0xc9b88a, 1); for (const w of game.ts.walls) g.fillRect(x0 + w.x * sx, y0 + w.y * sy, Math.max(2, sx), Math.max(2, sy));
    for (const gt of game.activeGates) { const gx = x0 + (gt.x + 0.5) * sx, gy = y0 + (gt.y + 0.5) * sy; g.fillStyle(0xb06cff, 1).fillCircle(gx, gy, 3.4).lineStyle(1.5, 0xffffff, 1).strokeCircle(gx, gy, 4.6); }
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
    this.sk.speed.setBadge(lv > 0 ? 'Lv' + lv : ''); this.sk.speed.setState({ alpha: max || poor ? 0.55 : 1, sub: max ? 'TỐI ĐA' : String(cost), subColor: !max && !poor ? '#ffe9a0' : '#ffffff', ready: !max && !poor });
    // thẻ xây + chữ HUD
    const bc = game.ts.buildCost(), gold = game.economy.gold;
    for (const o of this.mCards) { const cost = o.d.cost(), ok = gold >= cost; if (o.last !== cost) { o.last = cost; o.price.setText(String(cost)); } if (o.ok !== ok) { o.ok = ok; o.price.setColor(ok ? '#ffe9a0' : '#ff7b7b'); } o.icon.setAlpha(ok ? 1 : 0.45); o.name.setAlpha(ok ? 1 : 0.6); o.coin.setAlpha(ok ? 1 : 0.6); }
    this.btn.setState({ alpha: player.dead ? 0.3 : 1, active: this.buildOpen, activeFrac: 1, ready: !player.dead && !this.buildOpen && game.economy.gold >= Math.min(bc, game.ts.wallCost()) }); this.btnT.setAlpha(player.dead ? 0.3 : 1);
    this.fpsT += ms; if (this.fpsT > 500) { this.fpsT = 0; this.fpsText = Math.round(this.game.loop.actualFps) + ' FPS'; }
    const total = WAVE_SETTINGS.totalWaves, cdn = Math.ceil(Math.max(0, dir.countdown));
    const nextWave = dir.wave + 1, ns = dir.wave < total ? dir.specFor(nextWave) : null, next = ns ? `${dir.wave === 0 ? 'Đợt đầu' : 'Đợt ' + nextWave} sau ${cdn}s (${ns.count} slime${ns.boss ? ', THỬ THÁCH' : ''})` : 'Đã xuất hiện đủ ' + total + ' đợt – diệt hết để thắng';
    // HUD: icon vector + số (nền trong suốt, chữ có viền)
    while (this.hearts.length < player.maxHp) this.hearts.push(this.add.image(0, 0, 'ui_icon_heart').setScrollFactor(0).setDepth(1000));
    const hx = this.hx, hy = this.hy, hs = 21; this.hearts.forEach((h, i) => { const full = i < player.hp; h.setPosition(hx + hs / 2 + i * (hs + 2), hy + hs / 2).setDisplaySize(hs, hs).setTint(full ? 0xff5a5a : 0x4a4a4a).setAlpha(full ? 1 : 0.5); });
    const gx = hx + player.maxHp * (hs + 2) + 10; this.icoCoin.setPosition(gx + 10, hy + 11).setDisplaySize(21, 21); this.txGold.setPosition(gx + 24, hy + 1).setText(String(game.economy.gold));
    this.icoFlag.setPosition(hx + 10, hy + 36).setDisplaySize(19, 19); this.txWave.setPosition(hx + 24, hy + 27).setText(`Đợt ${dir.wave}/${total}`);
    const slx = hx + 24 + this.txWave.width + 14; this.icoSlime.setPosition(slx + 10, hy + 36).setDisplaySize(19, 19); this.txSlime.setPosition(slx + 24, hy + 27).setText(`${world.active}${dir.queue.length ? ' +' + dir.queue.length : ''}`);
    this.txNext.setPosition(hx + 2, hy + 51).setText(next); this.txInfo.setPosition(hx + 2, hy + 65).setText(`${diff.name} · ${this.fpsText}`);
    // nhãn gợi ý khi game đang tự tạm dừng vì bảng nâng cấp
    const showPill = game.pause.onlyAuto && game.state === 'playing'; if (showPill !== this.pillShown) { this.pillShown = showPill; this.pillBg.clear(); this.pillIco.setVisible(showPill); this.pillTx.setVisible(showPill); if (showPill) { const { width } = this.scale, w = this.pillTx.width + 38, x = width / 2 - w / 2, y = this.hy + 28; this.pillBg.fillStyle(0x14221b, 0.9).fillRoundedRect(x, y, w, 24, 12).lineStyle(1.5, 0xe0b13a, 0.9).strokeRoundedRect(x, y, w, 24, 12); this.pillIco.setPosition(x + 14, y + 12).setDisplaySize(14, 14); this.pillTx.setPosition(x + 26, y + 5); } }
    this.setBtn.setState({ alpha: 1 });
    if (dir.wave < total && cdn <= 5 && cdn > 0) { this.warn.setText(`⚠ ĐỢT ${nextWave} SẮP TỚI: ${cdn}s`).setVisible(true).setScale(1 + 0.06 * Math.sin(this.time.now / 90)); if (cdn !== this.lastWarn) { this.lastWarn = cdn; audio.play('warn'); } } else { this.warn.setVisible(false); this.lastWarn = -1; }
    if (dir.wave !== this.lastWave) { this.lastWave = dir.wave; const s = dir.currentSpec; this.banner.setText(`ĐỢT ${dir.wave}${s.boss ? ' – THỬ THÁCH' : ''}\n${s.count} slime`).setAlpha(1); this.tweens.add({ targets: this.banner, alpha: 0, delay: 1500, duration: 600 }); audio.play(s.boss ? 'wave_boss' : 'wave_start'); }
    if (player.dead) this.banner.setText('BẠN ĐÃ BỊ HẠ').setAlpha(1);
  }
}
