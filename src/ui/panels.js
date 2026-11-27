import { TOWER_TYPES, BRANCHES, BRANCH_IDS, computeStats } from '../config/towers.js';
import { audio } from '../systems/Audio.js';
import { iconSvg, hydrateIcons } from './icons.js';
const $ = (id) => document.getElementById(id);
const f = (n, d = 1) => Number(n.toFixed(d)).toString().replace('.', ',');
const ROWS = [
  ['sword', 'Sát thương', (s) => f(s.damage)], ['speed', 'Tốc độ bắn', (s) => f(s.fireRate, 2) + '/s'], ['range', 'Phạm vi', (s) => f(s.range, 2) + ' ô'],
  ['arrows', 'Mũi tên', (s) => String(s.arrows)], ['star', 'Chí mạng', (s) => Math.round(s.critChance * 100) + '% ×' + f(s.critMult)],
];
const BRANCH_ICON = { volley: 'arrows', frost: 'snow', burn: 'flame' }, ic = (n, size = 15) => iconSvg(n, { size });
// Bảng thông tin tháp, bảng chọn nhánh, thông báo – dùng DOM để chữ rõ và nút đủ lớn trên điện thoại.
export class Panels {
  constructor(ctl) {
    this.ctl = ctl; this.t = null; this.sellArmed = false; this.toastTimer = null;
    $('tclose').onclick = () => ctl.close(); $('tup').onclick = () => this.onUp(); $('tsell').onclick = () => this.onSell();
    $('treset').onclick = () => ctl.reset(this.t); $('tpick').onclick = () => this.showSkill(this.t); $('smclose').onclick = () => this.hideSkill();
  }
  toast(msg, kind = 'err') { const el = $('toast'); $('tmsg').textContent = msg; el.className = kind; el.querySelector('.ti').dataset.icon = kind === 'err' ? 'close' : 'check'; hydrateIcons(el); el.hidden = false; if (kind === 'err') audio.play('error'); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => (el.hidden = true), 2600); }
  showTower(t) { this.t = t; this.sellArmed = false; $('tpanel').hidden = false; this.render(); }
  hide() { this.t = null; $('tpanel').hidden = true; this.hideSkill(); }
  destroy() { this.hide(); $('toast').hidden = true; }
  refresh() { if (this.t) this.render(); }
  // Chỉ ghi DOM khi giá trị thật sự đổi -> bảng không nhấp nháy/giật khi làm mới mỗi 0,4s
  put(id, k, v) { const e = $(id); if (e[k] !== v) e[k] = v; }
  render() {
    const put = (id, k, v) => this.put(id, k, v), t = this.t, ts = this.ctl.ts, eco = this.ctl.economy, T = TOWER_TYPES[t.type], up = ts.upgradeInfo(t), s = t.stats;
    put('tname', 'textContent', T.name); put('tlv', 'textContent', 'LV ' + t.level + (t.level >= T.maxLevel ? ' · MAX' : ''));
    put('tstats', 'innerHTML', ROWS.map(([icn, name, fn]) => {
      const a = fn(s), b = up.ok ? fn(up.after) : a; return `<div class="stat">${ic(icn)}<span>${name}</span><b>${a}</b>${b !== a ? `<i>→ ${b}</i>` : ''}</div>`;
    }).join('') + `<div class="stat wide">${ic('coin')}<span>Tổng đầu tư</span><b>${t.invested}</b></div>`);
    const sk = []; if (s.slowPct) sk.push(`${ic('snow', 12)} Làm chậm ${Math.round(s.slowPct * 100)}% / ${f(s.slowDur)}s${s.slowRadius ? ', lan ' + f(s.slowRadius) + ' ô' : ''}`);
    if (s.burnDps) sk.push(`${ic('flame', 12)} Cháy ${f(s.burnDps, 0)}/s trong ${f(s.burnDur)}s${s.spreadChance ? `, lan lửa ${Math.round(s.spreadChance * 100)}%` : ''}`);
    if (s.arrows > 1) sk.push(`${ic('arrows', 12)} ${s.arrows} mũi tên/loạt`);
    put('tbranches', 'innerHTML', (t.picks.length ? t.picks.map((id, i) => `<span class="bchip" style="--c:${BRANCHES[id].color}">${ic(BRANCH_ICON[id], 14)}${BRANCHES[id].name}</span>`).join('') : '<small>Chưa chọn nhánh kỹ năng (mở khóa ở LV' + T.milestones.join(', ') + ')</small>') + (sk.length ? `<div class="sk">${sk.join('<br>')}</div>` : ''));
    const needPick = t.pending > 0, building = t.state === 'building';
    put('tpick', 'hidden', !needPick || building); put('treset', 'hidden', !t.picks.length || building); put('treset', 'innerHTML', `${ic('refresh', 14)}Đặt lại · ${ts.diff.resetCost}`);
    const upBtn = $('tup'); put('tup', 'hidden', needPick);
    if (building) { put('tup', 'innerHTML', 'Đang xây…'); put('tup', 'disabled', true); upBtn.classList.add('busy'); } else if (!up.ok) { upBtn.classList.remove('busy'); put('tup', 'textContent', up.message); put('tup', 'disabled', true); }
    else { upBtn.classList.remove('busy'); put('tup', 'disabled', false); put('tup', 'innerHTML', `${ic('coin', 15)}Nâng cấp LV${t.level + 1} · ${up.cost}${up.nextIsMilestone ? ' ' + ic('star', 14) : ''}`); upBtn.classList.toggle('poor', eco.gold < up.cost); }
    put('tpick', 'innerHTML', `${ic('star', 15)}Chọn nhánh kỹ năng`); const v = ts.sellValue(t);
    put('tsell', 'innerHTML', this.sellArmed ? `${ic('check', 14)}Xác nhận · +${v}` : `${ic('coin', 14)}Bán · +${v}`); $('tsell').classList.toggle('warn', this.sellArmed);
  }
  onUp() { this.ctl.upgrade(this.t); }
  onSell() {
    if (!this.sellArmed) { this.sellArmed = true; this.render(); clearTimeout(this.armT); this.armT = setTimeout(() => { this.sellArmed = false; this.refresh(); }, 3000); return; }
    clearTimeout(this.armT); this.sellArmed = false; this.ctl.sell(this.t);
  }
  statLine(id, s) {
    if (id === 'volley') return `${s.arrows} mũi tên · ${f(s.fireRate, 2)}/s · chí mạng ${Math.round(s.critChance * 100)}% ×${f(s.critMult)}`;
    if (id === 'frost') return s.slowPct ? `Chậm ${Math.round(s.slowPct * 100)}% · ${f(s.slowDur)}s · lan ${f(s.slowRadius)} ô` : '—';
    return s.burnDps ? `Cháy ${f(s.burnDps, 0)}/s · ${f(s.burnDur)}s · lan ${Math.round(s.spreadChance * 100)}%` : '—';
  }
  showSkill(t) {
    if (!t || t.pending <= 0) return; this.t = t;
    $('smsub').textContent = `${TOWER_TYPES[t.type].name} LV${t.level}: chọn 1 nhánh (không thể đổi miễn phí).`;
    $('smcards').innerHTML = ''; const cur = t.stats;
    for (const id of BRANCH_IDS) {
      const B = BRANCHES[id], tier = (cur.tiers[id] ?? -1) + 1, full = tier >= B.tiers.length, after = full ? cur : computeStats(t.type, t.level, [...t.picks, id], this.ctl.ts.mods);
      const c = document.createElement('button'); c.type = 'button'; c.className = 'card pick'; c.style.setProperty('--c', B.color); c.disabled = full;
      c.innerHTML = `<div class="ic0">${iconSvg(BRANCH_ICON[id], { size: 22 })}</div><b>${B.name}</b><small>${B.desc}</small><div class="tier">${full ? 'Đã tối đa' : `Bậc ${tier + 1}/${B.tiers.length}: ${B.tiers[tier].text}`}</div><div class="st"><span>Hiện: ${this.statLine(id, cur)}</span><span>Sau: ${this.statLine(id, after)}</span></div>`;
      c.onclick = () => this.ctl.pick(t, id); $('smcards').appendChild(c);
    }
    $('skillmodal').hidden = false; this.ctl.onModal(true);
  }
  hideSkill() { if (!$('skillmodal').hidden) { $('skillmodal').hidden = true; this.ctl.onModal(false); } }
}
