import Phaser from 'phaser';
import { FONT } from '../config/ui.js';
import { glassPanel } from './glass.js';
// HUD nhân vật (Modern Fantasy), tách khỏi UIScene cho gọn. Các lớp (depth tăng dần):
//   thẻ kính  ->  avatar (nền màu áo + chân dung nông dân cắt từ sprite sheet + viền màu nhận diện)  ->  tên (Montserrat)  ->  hàng tim  ->  các "chip" thông tin (vàng · đợt · quái) nối hàng tự động xuống dòng khi hẹp.
// Hoạt ảnh tinh tế, đều rẻ: avatar "thở" nhẹ khi khỏe, viền đỏ chớp khi vừa mất máu, tim nảy khi mất/hồi, số vàng nảy khi đổi. Phần tĩnh (khung kính) chỉ vẽ lại khi kích thước đổi.
// Chữ dùng bóng mờ thay vì viền đen dày để đọc rõ mà vẫn thanh thoát.
const TEXT = (size, weight = 700, color = '#fff') => ({ fontFamily: FONT, fontSize: size + 'px', fontStyle: String(weight), color, shadow: { offsetX: 0, offsetY: 1, blur: 3, color: '#000000cc', fill: true } });
const hexNum = (h) => Phaser.Display.Color.HexStringToColor(h).color;
const mix = (hex, to, k) => { const a = Phaser.Display.Color.HexStringToColor(hex), r = Math.round(a.red + (to - a.red) * k), g = Math.round(a.green + (to - a.green) * k), b = Math.round(a.blue + (to - a.blue) * k); return `rgb(${r},${g},${b})`; };
const AV = 128;   // cạnh texture avatar
// Vẽ avatar một lần: nền chuyển sắc theo màu áo, chân dung (nếu có sprite sheet), viền hai lớp (màu áo sáng + vàng mảnh).
export function createAvatarTexture(scene, shirt = '#d9534f') {
  const key = 'ui_avatar'; if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, AV, AV), c = tex.getContext(), C = AV / 2; c.imageSmoothingEnabled = true;
  const bg = c.createLinearGradient(0, 0, 0, AV); bg.addColorStop(0, mix(shirt, 0xffffff, 0.35)); bg.addColorStop(1, mix(shirt, 0x000000, 0.45));
  c.fillStyle = bg; c.beginPath(); c.arc(C, C, C - 5, 0, 6.2832); c.fill();
  if (scene.textures.exists('main_sheet')) { // khung "xuống" đầu tiên (ô 96x136): lấy vùng đầu + vai, cắt theo hình tròn
    c.save(); c.beginPath(); c.arc(C, C, C - 6, 0, 6.2832); c.clip(); const img = scene.textures.get('main_sheet').getSourceImage(); c.drawImage(img, 2, 0, 92, 92, 6, 12, AV - 12, AV - 12); c.restore();
  }
  const sh = c.createLinearGradient(0, 6, 0, C); sh.addColorStop(0, 'rgba(255,255,255,.28)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sh; c.beginPath(); c.ellipse(C, C - 28, C - 24, 26, 0, 0, 6.2832); c.fill();
  c.lineWidth = 5; c.strokeStyle = mix(shirt, 0xffffff, 0.15); c.beginPath(); c.arc(C, C, C - 4.5, 0, 6.2832); c.stroke();               // viền màu nhận diện
  const rg = c.createLinearGradient(0, 0, 0, AV); rg.addColorStop(0, 'rgba(255,244,200,.95)'); rg.addColorStop(1, 'rgba(200,150,55,.7)');
  c.lineWidth = 2; c.strokeStyle = rg; c.beginPath(); c.arc(C, C, C - 1.5, 0, 6.2832); c.stroke(); tex.refresh(); tex.setFilter(Phaser.Textures.FilterMode.LINEAR); return key;
}
export class PlayerHud {
  constructor(scene, { name, shirt, icons = {} }) {
    this.scene = scene; this.shirt = shirt; const S = (o) => o.setScrollFactor(0), add = scene.add;
    createAvatarTexture(scene, shirt);
    this.bg = S(add.graphics().setDepth(1000)); this.chipBg = S(add.graphics().setDepth(1000)); this.avatar = S(add.image(0, 0, 'ui_avatar').setDepth(1002)); this.flash = S(add.image(0, 0, 'ui_ring').setDepth(1003).setTint(0xff4040).setAlpha(0));
    this.tName = S(add.text(0, 0, name, TEXT(14, 800)).setDepth(1002)); this.tSub = S(add.text(0, 0, '', TEXT(10, 600, '#cfe0d2')).setDepth(1002));
    this.hearts = []; this.prevHp = -1; this.t = 0; this.hurtT = 0; this.bump = 0; this.lastGold = -1;
    const chip = (key, tint) => ({ ico: S(add.image(0, 0, 'ui_icon_' + key).setDepth(1002).setTint(tint)), tx: S(add.text(0, 0, '', TEXT(12.5, 800)).setDepth(1002)), w: 0, x: 0, y: 0 });
    this.chips = { gold: chip('coin', 0xffd24a), wave: chip('flag', 0x9ad8ff), mob: chip('slime', 0x8be07a) };
    this.tNext = S(add.text(0, 0, '', TEXT(11, 600, '#e8efe3')).setDepth(1002));
    this.x = 0; this.y = 0; this.maxRight = 300; this.sig = ''; this.goldRect = { x: -99, y: -99, w: 0, h: 0 }; this.bottom = 0;
  }
  layout(x, y, maxRight) { this.x = x; this.y = y; this.maxRight = maxRight; this.sig = ''; }
  setNext(t) { this.tNext.setText(t); }
  // st: {hp, maxHp, gold, wave, total, active, queue, dead, info}
  update(dt, st) {
    this.t += dt; const { x, y } = this, D = 52, ax = x + 6 + D / 2, ay = y + 6 + D / 2;
    while (this.hearts.length < st.maxHp) this.hearts.push(this.scene.add.image(0, 0, 'ui_icon_heart').setScrollFactor(0).setDepth(1002));
    if (this.prevHp >= 0 && st.hp !== this.prevHp) { if (st.hp < this.prevHp) this.hurtT = 0.55; this.heartPop = { i: Math.min(st.hp, this.prevHp), t: 0 }; } this.prevHp = st.hp;
    this.hurtT = Math.max(0, this.hurtT - dt); if (this.heartPop) { this.heartPop.t += dt; if (this.heartPop.t > 0.4) this.heartPop = null; }
    // avatar: thở nhẹ (±1.5%), chớp đỏ khi mất máu, mờ khi đã gục
    const breathe = st.dead ? 1 : 1 + Math.sin(this.t * 2.1) * 0.015, hs = this.hurtT > 0 ? 1 + 0.08 * Math.sin((0.55 - this.hurtT) * 40) * (this.hurtT / 0.55) : 1;
    this.avatar.setPosition(ax, ay).setDisplaySize(D * breathe * hs, D * breathe * hs).setAlpha(st.dead ? 0.5 : 1);
    this.flash.setPosition(ax, ay).setDisplaySize(D * 1.5, D * 1.5).setAlpha(this.hurtT > 0 ? 0.75 * (this.hurtT / 0.55) : 0);
    const tx0 = x + 6 + D + 10; this.tName.setPosition(tx0, y + 8); const hsz = 17, gap = 3, hy = y + 29;
    this.hearts.forEach((h, i) => { const full = i < st.hp, pop = this.heartPop && this.heartPop.i === i ? 1 + 0.35 * Math.sin(Math.PI * Math.min(1, this.heartPop.t / 0.4)) : 1;
      h.setPosition(tx0 + hsz / 2 + i * (hsz + gap), hy + hsz / 2).setDisplaySize(hsz * pop, hsz * pop).setTint(full ? 0xff6b6b : 0x3f4a44).setAlpha(full ? 1 : 0.55).setVisible(i < st.maxHp); });
    this.tSub.setPosition(tx0, y + 48).setText(st.info || '');
    const cardW = Math.max(tx0 - x + Math.max(st.maxHp * (hsz + gap), this.tName.width, this.tSub.width) + 12, 150), cardH = D + 12;
    // chip thông tin
    const goldTxt = String(st.gold), items = [['gold', goldTxt], ['wave', `Đợt ${st.wave}/${st.total}`], ['mob', `${st.active}${st.queue ? ' +' + st.queue : ''}`]];
    for (const [k, txt] of items) { const c = this.chips[k]; if (c.tx.text !== txt) c.tx.setText(txt); c.w = 8 + 16 + 4 + c.tx.width + 9; }
    const sig = [cardW, this.chips.gold.w, this.chips.wave.w, this.chips.mob.w, this.maxRight, x, y].join('|');
    if (sig !== this.sig) { this.sig = sig;
      this.bg.clear(); glassPanel(this.bg, x, y, cardW, cardH, 16, { alpha: 0.86, gloss: 0.08 });
      let cx = x, cy = y + cardH + 6; const h = 24, g = 6; this.chipBg.clear();
      for (const k of ['gold', 'wave', 'mob']) { const c = this.chips[k]; if (cx > x && cx + c.w > this.maxRight) { cx = x; cy += h + g; } c.x = cx; c.y = cy; glassPanel(this.chipBg, cx, cy, c.w, h, 12, { alpha: 0.82, gloss: 0.07, shadow: false }); cx += c.w + g; }
      this.bottom = cy + h; const gc = this.chips.gold; this.goldRect = { x: gc.x, y: gc.y, w: gc.w, h };
    }
    const bumpK = this.bump > 0 ? 1 + 0.18 * Math.sin(Math.PI * (1 - this.bump)) : 1; if (st.gold !== this.lastGold) { if (this.lastGold >= 0) this.bump = 1; this.lastGold = st.gold; } this.bump = Math.max(0, this.bump - dt * 4.5);
    for (const k of ['gold', 'wave', 'mob']) { const c = this.chips[k], sc = k === 'gold' ? bumpK : 1; c.ico.setPosition(c.x + 8 + 8, c.y + 12).setDisplaySize(16 * sc, 16 * sc); c.tx.setPosition(c.x + 8 + 16 + 4, c.y + 12).setOrigin(0, 0.5).setScale(sc); }
    this.chips.gold.tx.setColor(this.bump > 0 ? '#fff3b0' : '#ffffff');
    this.tNext.setPosition(x + 2, this.bottom + 6); this.bottom += 22;
  }
}
