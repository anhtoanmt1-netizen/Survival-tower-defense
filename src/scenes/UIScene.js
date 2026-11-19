import Phaser from 'phaser';
import { Joystick } from '../input/Joystick.js';
import { THEMES } from '../config/themes/index.js';
import { T } from '../map/tiles.js';
import { safeInsets } from '../ui/safeArea.js';
const MM = 112; // kích thước minimap (px màn hình)
export class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }
  init(data) { this.d = data; }
  create() {
    this.joystick = new Joystick(this);
    const { map } = this.d, pal = THEMES[map.theme].minimap;
    const col = { [T.GRASS]: pal.grass, [T.DIRT]: pal.dirt, [T.TREE]: pal.tree, [T.ROCK]: pal.rock, [T.RIVER]: pal.water, [T.BUSH]: pal.bush };
    const rgb = Object.fromEntries(Object.entries(col).map(([k, h]) => { const n = parseInt(h.slice(1), 16); return [k, [n >> 16, (n >> 8) & 255, n & 255]]; }));
    if (this.textures.exists('minimap')) this.textures.remove('minimap');
    const tex = this.textures.createCanvas('minimap', map.width, map.height), ctx = tex.getContext(), img = ctx.createImageData(map.width, map.height);
    for (let i = 0; i < map.tiles.length; i++) { const c = rgb[map.tiles[i]]; img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255; }
    ctx.putImageData(img, 0, 0); tex.refresh(); tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.mmFrame = this.add.rectangle(0, 0, MM + 4, MM + 4, 0x000000, 0.6).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
    this.mm = this.add.image(0, 0, 'minimap').setOrigin(1, 0).setDisplaySize(MM, MM).setScrollFactor(0).setDepth(1001);
    this.view = this.add.rectangle(0, 0, 10, 10).setStrokeStyle(1, 0xffffff, 0.8).setOrigin(0).setScrollFactor(0).setDepth(1002);
    this.dot = this.add.circle(0, 0, 3, Phaser.Display.Color.HexStringToColor(this.d.player.shirt).color).setStrokeStyle(1, 0xffffff).setScrollFactor(0).setDepth(1003);
    this.mmG = this.add.graphics().setScrollFactor(0).setDepth(1002);
    this.hud = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#fff', stroke: '#000', strokeThickness: 4, lineSpacing: 3 }).setScrollFactor(0).setDepth(1000);
    this.banner = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '26px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 6, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(1100).setAlpha(0);
    this.lastWave = 0; this.fpsT = 0; this.fpsText = '';
    // Nút XÂY (góc dưới-phải) + thẻ tháp kéo ra bản đồ
    const game = this.d.game;
    this.buildOpen = false; this.cardTxt = '';
    this.btn = this.add.circle(0, 0, 36, 0xe0b13a, 0.95).setStrokeStyle(4, 0xffffff, 0.9).setScrollFactor(0).setDepth(1000).setInteractive();
    this.btnT = this.add.text(0, 0, 'XÂY', { fontFamily: 'sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#2b1f06' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.card = this.add.rectangle(0, 0, 184, 64, 0x14221b, 0.96).setStrokeStyle(2, 0xffffff, 0.5).setScrollFactor(0).setDepth(1000).setVisible(false).setInteractive();
    this.cardT = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#fff', align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setVisible(false);
    this.btn.on('pointerdown', () => { this.buildOpen = !this.buildOpen; this.card.setVisible(this.buildOpen); this.cardT.setVisible(this.buildOpen); });
    this.card.on('pointerdown', (p) => { this.buildOpen = false; this.card.setVisible(false); this.cardT.setVisible(false); game.beginPlacement(p); });
    this.scale.on('resize', this.layout, this); this.layout();
  }
  layout() {
    const { width } = this.scale, ins = safeInsets();
    this.mmX = width - ins.right - 10; this.mmY = ins.top + 10;
    this.mmFrame.setPosition(this.mmX + 2, this.mmY - 2); this.mm.setPosition(this.mmX, this.mmY);
    this.hud.setPosition(ins.left + 10, ins.top + 48); this.banner.setPosition(this.scale.width / 2, this.scale.height * 0.3); this.joystick.layout();
    const { height } = this.scale; this.btnX = width - ins.right - 24 - 34; this.btnY = height - ins.bottom - 24 - 34;
    this.btn.setPosition(this.btnX, this.btnY); this.btnT.setPosition(this.btnX, this.btnY);
    this.cardX = this.btnX + 34 - 92; this.cardY = this.btnY - 34 - 10 - 32; this.card.setPosition(this.cardX, this.cardY); this.cardT.setPosition(this.cardX, this.cardY);
  }
  isUiPointer(p) {
    const inR = (x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
    return this.joystick.ownsPointer(p) || inR(this.mmX - MM, this.mmY, MM, MM) || Math.hypot(p.x - this.btnX, p.y - this.btnY) <= 40 || (this.buildOpen && inR(this.cardX - 92, this.cardY - 32, 184, 64));
  }
  update(_, ms) {
    const { map, player, camera: cam, game } = this.d, sx = MM / map.width, sy = MM / map.height, x0 = this.mmX - MM, y0 = this.mmY, ts = 32;
    const dir = game.director, world = game.world;
    this.dot.setPosition(x0 + player.x * sx, y0 + player.y * sy);
    const vw = cam.width / cam.zoom / ts, vh = cam.height / cam.zoom / ts; // vùng nhìn thấy, đơn vị ô
    this.view.setPosition(x0 + (cam.midPoint.x / ts - vw / 2) * sx, y0 + (cam.midPoint.y / ts - vh / 2) * sy).setSize(vw * sx, vh * sy);
    const g = this.mmG; g.clear(); g.fillStyle(0xb06cff, 1);
    for (const gt of game.activeGates) g.fillRect(x0 + gt.x * sx - 2, y0 + gt.y * sy - 2, 5, 5);
    g.fillStyle(0xff3b30, 1); for (const m of world.monsters) if (!m.dying) g.fillRect(x0 + m.x * sx - 1, y0 + m.y * sy - 1, 2, 2);
    this.fpsT += ms; if (this.fpsT > 500) { this.fpsT = 0; this.fpsText = Math.round(this.game.loop.actualFps) + ' FPS'; }
    const hearts = '♥'.repeat(player.hp) + '♡'.repeat(player.maxHp - player.hp);
    const cost = game.ts.buildCost(), txt = `🏹 Tháp cung tên\n🪙 ${cost} · kéo ra bản đồ`; if (txt !== this.cardTxt) { this.cardTxt = txt; this.cardT.setText(txt); }
    this.card.setAlpha(game.economy.gold >= cost ? 1 : 0.55); this.btn.setAlpha(player.dead ? 0.3 : 0.92);
    const total = 100, next = dir.wave >= total ? 'Đã xuất hiện đủ 100 đợt' : (dir.wave === 0 ? 'Đợt đầu sau ' : 'Đợt ' + (dir.wave + 1) + ' sau ') + Math.ceil(Math.max(0, dir.countdown)) + 's';
    this.hud.setText(`${hearts}   🪙 ${game.economy.gold}\nĐợt ${dir.wave}/${total}   Slime: ${world.active}${dir.queue.length ? ' (+' + dir.queue.length + ' chờ)' : ''}\n${next}   ${this.fpsText}`);
    if (dir.wave !== this.lastWave) { this.lastWave = dir.wave; const s = dir.currentSpec; this.banner.setText(`ĐỢT ${dir.wave}${s.boss ? ' – THỬ THÁCH' : ''}\n${s.count} slime`).setAlpha(1); this.tweens.add({ targets: this.banner, alpha: 0, delay: 1500, duration: 600 }); }
    if (player.dead) this.banner.setText('BẠN ĐÃ BỊ HẠ\n(màn hình thất bại sẽ có ở Giai đoạn 4)').setAlpha(1);
  }
}
