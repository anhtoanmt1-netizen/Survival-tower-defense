import { settings, VIEW_PRESETS, VIEW_RANGE, viewPresetOf } from '../config/settings.js';
import { orientationNote } from './screen.js';
import { audio } from '../systems/Audio.js';
const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
// Menu Cài đặt thống nhất: Âm thanh · Màn hình (hướng, tỷ lệ) · Tầm nhìn camera · Font. Thay đổi áp dụng ngay và được lưu.
export function initSettingsPanel({ onToggle, onCopy, onPause, onMenu }) {
  const body = $('setbody'); let open = false;
  const seg = (items, get, set) => { const w = el('div', 'seg'); const draw = () => [...w.children].forEach((b) => b.classList.toggle('sel', b.dataset.v === get())); for (const [v, label] of items) { const b = el('button', '', label); b.type = 'button'; b.dataset.v = v; b.onclick = () => { set(v); draw(); }; w.appendChild(b); } w.redraw = draw; draw(); return w; };
  const slider = (min, max, step, get, set, fmt) => {
    const wrap = el('div', 'line'), r = el('input'), out = el('output'); r.type = 'range'; Object.assign(r, { min, max, step, value: get() });
    const paint = () => { r.style.setProperty('--p', ((r.value - min) / (max - min)) * 100 + '%'); out.textContent = fmt(+r.value); }; r.oninput = () => { set(+r.value); paint(); }; r.redraw = () => { r.value = get(); paint(); }; paint(); return { r, out, paint, redraw: r.redraw };
  };
  const rows = [];
  const toggleRow = (label, key, volKey) => {
    const sec = el('div'); const head = el('div', 'line'); head.style.gridTemplateColumns = '1fr auto'; head.appendChild(el('span', '', label));
    const sw = el('button', 'switch'); sw.type = 'button'; sw.setAttribute('role', 'switch'); sw.onclick = () => { settings.set({ audio: { [key]: !settings.data.audio[key] } }); audio.unlock(); audio.play('click'); }; head.appendChild(sw);
    const sl = slider(0, 100, 1, () => Math.round(settings.data.audio[volKey] * 100), (v) => { settings.set({ audio: { [volKey]: v / 100 } }); audio.unlock(); if (volKey === 'sfxVol') audio.play('hit'); }, (v) => v + '%'), { r, out } = sl;
    const line = el('div', 'line'); line.style.gridTemplateColumns = '1fr auto'; line.append(r, out); sec.append(head, line);
    rows.push(() => { const on = settings.data.audio[key]; sw.classList.toggle('on', on); sw.setAttribute('aria-checked', on); r.disabled = !on; r.style.opacity = on ? 1 : 0.4; sl.redraw(); }); return sec;
  };
  const s1 = el('section'); s1.append(el('h3', '', '🔊 Âm thanh'), toggleRow('Nhạc nền', 'music', 'musicVol'), toggleRow('Hiệu ứng âm thanh', 'sfx', 'sfxVol'));
  // màn hình
  const s2 = el('section'); s2.appendChild(el('h3', '', '📱 Màn hình'));
  const orient = seg([['portrait', '▯ Dọc'], ['landscape', '▭ Ngang'], ['auto', '⟳ Tự xoay']], () => settings.data.display.orientation, (v) => { settings.set({ display: { orientation: v } }); audio.play('click'); refresh(); });
  const ratioLabel = el('div', 'hint', 'Tỷ lệ khung khi chơi ngang:'); const ratio = seg([['19.5:9', '19.5:9'], ['16:9', '16:9'], ['full', 'Toàn màn hình']], () => settings.data.display.ratio, (v) => { settings.set({ display: { ratio: v } }); audio.play('click'); });
  const note = el('div', 'hint warn'); s2.append(orient, ratioLabel, ratio, note);
  // camera
  const s3 = el('section'); s3.appendChild(el('h3', '', '🎥 Tầm nhìn camera'));
  const presets = seg([['near', 'Gần'], ['far', 'Xa'], ['wide', 'Rộng']], () => viewPresetOf(settings.data.display.view), (v) => { settings.set({ display: { view: VIEW_PRESETS[v] } }); audio.play('click'); refresh(); });
  const view = slider(VIEW_RANGE.min, VIEW_RANGE.max, VIEW_RANGE.step, () => settings.data.display.view, (v) => { settings.set({ display: { view: v } }); presets.redraw(); }, (v) => v.toFixed(1) + ' ô');
  const vl = el('div', 'line'); vl.style.gridTemplateColumns = '1fr auto'; vl.append(view.r, view.out); s3.append(presets, vl, el('div', 'hint', 'Số ô nhìn thấy theo cạnh ngắn màn hình. Gần = mặc định; Rộng = bao quát bản đồ.'));
  const s4 = el('section'); s4.append(el('h3', '', '🔤 Phông chữ'), el('div', 'hint', 'Montserrat – đồng bộ cho toàn bộ giao diện, thông báo, chỉ số và nút.'));
  // Ván đang chơi: mã bản đồ, tạm dừng, về menu (chỉ hiện khi đang trong ván)
  const s0 = el('section'); s0.hidden = true; const run = el('div', 'run'), idEl = el('span'); idEl.id = 'runid'; const cp = el('button', '', 'Chép mã'); cp.type = 'button';
  cp.onclick = () => Promise.resolve(onCopy?.()).then(() => { cp.textContent = 'Đã chép'; setTimeout(() => (cp.textContent = 'Chép mã'), 1200); }); run.append(idEl, cp);
  const bar = el('div', 'seg'), bp = el('button', '', '⏸ Tạm dừng'), bm = el('button', '', '⌂ Về menu'); bp.type = bm.type = 'button';
  bp.onclick = () => { setOpen(false); onPause?.(); }; bm.onclick = () => { if (confirm('Thoát về menu? Ván hiện tại sẽ mất.')) { setOpen(false); onMenu?.(); } }; bar.append(bp, bm);
  const hint0 = el('div', 'hint', 'Mã bản đồ'); s0.append(el('h3', '', '🎮 Ván đang chơi'), hint0, run, bar);
  body.append(s0, s1, s2, s3, s4);
  function refresh() {
    rows.forEach((f) => f()); orient.redraw(); ratio.redraw(); presets.redraw(); view.r.redraw();
    const land = settings.data.display.orientation !== 'portrait'; ratioLabel.hidden = ratio.hidden = !land; note.textContent = orientationNote(); note.hidden = !note.textContent;
  }
  settings.on(refresh); refresh();
  const setOpen = (v) => { open = v; $('settings').hidden = !v; if (v) { refresh(); audio.play('open'); } else audio.play('close'); onToggle?.(v); };
  $('setclose').onclick = () => setOpen(false); $('settings').addEventListener('pointerdown', (e) => { if (e.target === $('settings')) setOpen(false); });
  const setRun = (id, info = '') => { s0.hidden = !id; idEl.textContent = id || ''; hint0.textContent = info ? 'Chủ đề: ' + info : 'Mã bản đồ'; };
  return { setRun, open: () => setOpen(true), close: () => setOpen(false), isOpen: () => open };
}
