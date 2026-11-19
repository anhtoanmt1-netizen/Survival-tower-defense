import { TOWER_TYPES, BRANCHES, BRANCH_IDS, computeStats } from '../config/towers.js';
import { ECON } from '../config/economy.js';
const $ = (id) => document.getElementById(id);
const f = (n, d = 1) => Number(n.toFixed(d)).toString().replace('.', ',');
const ROWS = [
  ['Sát thương', (s) => f(s.damage)], ['Tốc độ bắn', (s) => f(s.fireRate, 2) + '/s'], ['Phạm vi', (s) => f(s.range, 2) + ' ô'],
  ['Mũi tên', (s) => String(s.arrows)], ['Chí mạng', (s) => Math.round(s.critChance * 100) + '% ×' + f(s.critMult)],
];
// Bảng thông tin tháp, bảng chọn nhánh, thông báo – dùng DOM để chữ rõ và nút đủ lớn trên điện thoại.
export class Panels {
  constructor(ctl) {
    this.ctl = ctl; this.t = null; this.sellArmed = false; this.toastTimer = null;
    $('tclose').onclick = () => ctl.close(); $('tup').onclick = () => this.onUp(); $('tsell').onclick = () => this.onSell();
    $('treset').onclick = () => ctl.reset(this.t); $('tpick').onclick = () => this.showSkill(this.t); $('smclose').onclick = () => this.hideSkill();
  }
  toast(msg, kind = 'err') { const el = $('toast'); el.textContent = msg; el.className = kind; el.hidden = false; clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => (el.hidden = true), 2600); }
  showTower(t) { this.t = t; this.sellArmed = false; $('tpanel').hidden = false; this.render(); }
  hide() { this.t = null; $('tpanel').hidden = true; this.hideSkill(); }
  destroy() { this.hide(); $('toast').hidden = true; }
  refresh() { if (this.t) this.render(); }
  render() {
    const t = this.t, ts = this.ctl.ts, eco = this.ctl.economy, T = TOWER_TYPES[t.type], up = ts.upgradeInfo(t), s = t.stats;
    $('tname').textContent = T.name; $('tlv').textContent = 'LV ' + t.level + (t.level >= T.maxLevel ? ' (tối đa)' : '');
    $('tstats').innerHTML = ROWS.map(([name, fn]) => {
      const a = fn(s), b = up.ok ? fn(up.after) : a; return `<div><span>${name}</span><b>${a}${b !== a ? ` <i>→ ${b}</i>` : ''}</b></div>`;
    }).join('') + `<div><span>Tổng đầu tư</span><b>${t.invested} 🪙</b></div>`;
    const sk = []; if (s.slowPct) sk.push(`❄️ Làm chậm ${Math.round(s.slowPct * 100)}% / ${f(s.slowDur)}s${s.slowRadius ? ', lan ' + f(s.slowRadius) + ' ô' : ''}`);
    if (s.burnDps) sk.push(`🔥 Cháy ${f(s.burnDps, 0)}/s trong ${f(s.burnDur)}s${s.spreadChance ? `, lan lửa ${Math.round(s.spreadChance * 100)}%` : ''}`);
    if (s.arrows > 1) sk.push(`🏹 ${s.arrows} mũi tên/loạt`);
    $('tbranches').innerHTML = (t.picks.length ? t.picks.map((id, i) => `<span class="chip" style="border-color:${BRANCHES[id].color}">${BRANCHES[id].icon} ${BRANCHES[id].name}</span>`).join('') : '<small>Chưa chọn nhánh kỹ năng (mở khóa ở LV' + T.milestones.join(', ') + ')</small>') + (sk.length ? `<div class="sk">${sk.join('<br>')}</div>` : '');
    const needPick = t.pending > 0, building = t.state === 'building';
    $('tpick').hidden = !needPick || building; $('treset').hidden = !t.picks.length || building; $('treset').textContent = `Đặt lại nhánh (${ECON.resetBranchCost} 🪙)`;
    const upBtn = $('tup'); upBtn.hidden = needPick;
    if (building) { upBtn.textContent = 'Đang xây…'; upBtn.disabled = true; } else if (!up.ok) { upBtn.textContent = up.message; upBtn.disabled = true; }
    else { upBtn.disabled = false; upBtn.textContent = `Nâng cấp LV${t.level + 1} · ${up.cost} 🪙${up.nextIsMilestone ? ' ★' : ''}`; upBtn.classList.toggle('poor', eco.gold < up.cost); }
    $('tpick').textContent = '★ Chọn nhánh kỹ năng'; const v = ts.sellValue(t);
    $('tsell').textContent = this.sellArmed ? `Xác nhận bán: +${v} 🪙` : `Bán tháp (+${v} 🪙)`; $('tsell').classList.toggle('warn', this.sellArmed);
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
      const B = BRANCHES[id], tier = (cur.tiers[id] ?? -1) + 1, full = tier >= B.tiers.length, after = full ? cur : computeStats(t.type, t.level, [...t.picks, id]);
      const c = document.createElement('button'); c.type = 'button'; c.className = 'card'; c.style.setProperty('--c', B.color); c.disabled = full;
      c.innerHTML = `<div class="ic">${B.icon}</div><b>${B.name}</b><small>${B.desc}</small><div class="tier">${full ? 'Đã tối đa' : `Bậc ${tier + 1}/${B.tiers.length}: ${B.tiers[tier].text}`}</div><div class="st"><span>Hiện: ${this.statLine(id, cur)}</span><span>Sau: ${this.statLine(id, after)}</span></div>`;
      c.onclick = () => this.ctl.pick(t, id); $('smcards').appendChild(c);
    }
    $('skillmodal').hidden = false; this.ctl.onModal(true);
  }
  hideSkill() { if (!$('skillmodal').hidden) { $('skillmodal').hidden = true; this.ctl.onModal(false); } }
}
