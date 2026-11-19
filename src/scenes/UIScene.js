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
    this.fps = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '11px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setScrollFactor(0).setDepth(1000);
    this.time.addEvent({ delay: 500, loop: true, callback: () => this.fps.setText(Math.round(this.game.loop.actualFps) + ' FPS') });
    this.scale.on('resize', this.layout, this); this.layout();
  }
  layout() {
    const { width } = this.scale, ins = safeInsets();
    this.mmX = width - ins.right - 10; this.mmY = ins.top + 10;
    this.mmFrame.setPosition(this.mmX + 2, this.mmY - 2); this.mm.setPosition(this.mmX, this.mmY);
    this.fps.setPosition(ins.left + 10, ins.top + 46); this.joystick.layout();
  }
  isUiPointer(p) { return this.joystick.ownsPointer(p) || (p.x >= this.mmX - MM && p.x <= this.mmX && p.y >= this.mmY && p.y <= this.mmY + MM); }
  update() {
    const { map, player, camera: cam } = this.d, sx = MM / map.width, sy = MM / map.height, x0 = this.mmX - MM, y0 = this.mmY, ts = 32;
    this.dot.setPosition(x0 + player.x * sx, y0 + player.y * sy);
    const vw = cam.width / cam.zoom / ts, vh = cam.height / cam.zoom / ts; // vùng nhìn thấy, đơn vị ô
    this.view.setPosition(x0 + (cam.midPoint.x / ts - vw / 2) * sx, y0 + (cam.midPoint.y / ts - vh / 2) * sy).setSize(vw * sx, vh * sy);
  }
}
