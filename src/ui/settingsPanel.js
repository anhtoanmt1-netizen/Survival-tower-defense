import { settings, VIEW_PRESETS, VIEW_RANGE, viewPresetOf } from '../config/settings.js';
import { GRADE_DEFAULT, isIdentity } from '../render/mapGrade.js';
import { VISUAL } from '../config/visual.js';
import { orientationNote } from './screen.js';
import { hydrateIcons, iconSvg } from './icons.js';
import { audio } from '../systems/Audio.js';
const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const TABS = [['play', 'Lối chơi', 'sword'], ['audio', 'Âm thanh', 'speaker'], ['screen', 'Màn hình', 'screen'], ['visual', 'Hình ảnh', 'eye']];
// Menu Cài đặt thống nhất, chia 4 tab (không bị dài): mỗi nhóm có icon + tiêu đề + mô tả; thay đổi áp dụng ngay và được lưu.
export function initSettingsPanel({ onToggle, onCopy, onPause, onMenu }) {
  const body = $('setbody'), tabsEl = $('settabs'), redraws = [], panes = {}; let open = false, cur = 'play';
  const group = (icon, title, desc) => { const g = el('section', 'group'); g.innerHTML = `<header><span class="badge" data-icon="${icon}"></span><div><h3>${title}</h3>${desc ? `<small>${desc}</small>` : ''}</div></header>`; return g; };
  const seg = (items, get, set) => { const w = el('div', 'seg'); for (const [v, label, ic] of items) { const b = el('button', 'btn', (ic ? `<span data-icon="${ic}"></span>` : '') + label); b.type = 'button'; b.dataset.v = v; b.onclick = () => { set(v); audio.play('click'); }; w.appendChild(b); } w.redraw = () => [...w.children].forEach((b) => b.classList.toggle('sel', b.dataset.v === get())); redraws.push(w.redraw); return w; };
  const toggle = (icon, title, desc, get, set) => { const r = el('div', 'set'), sw = el('button', 'switch'); sw.type = 'button'; sw.setAttribute('role', 'switch'); r.innerHTML = `<span class="si" data-icon="${icon}"></span><div>${title}<small>${desc}</small></div>`; r.appendChild(sw);
    sw.onclick = () => { set(!get()); audio.unlock(); audio.play(!get() ? 'close' : 'open'); }; redraws.push(() => { sw.classList.toggle('on', !!get()); sw.setAttribute('aria-checked', !!get()); }); r.sw = sw; return r; };
  const slider = (icon, title, min, max, step, get, set, fmt, { peek = false, mini = false } = {}) => {
    const r = el('div', 'set slider' + (mini ? ' mini' : '')), inp = el('input'), out = el('output'); inp.type = 'range'; Object.assign(inp, { min, max, step });
    r.innerHTML = mini ? '' : `<span class="si" data-icon="${icon}"></span><div class="tx">${title}</div>`; r.append(out, inp);
    const paint = () => { inp.value = get(); inp.style.setProperty('--p', ((inp.value - min) / (max - min)) * 100 + '%'); out.textContent = fmt(+inp.value); }; inp.oninput = () => { set(+inp.value); paint(); }; redraws.push(paint); r.inp = inp;
    if (peek) { const g = () => r.closest('.group'); const on = () => { g()?.classList.add('active'); $('settings').classList.add('peek'); }, off = () => { $('settings').classList.remove('peek'); g()?.classList.remove('active'); }; inp.addEventListener('pointerdown', on); inp.addEventListener('touchstart', on, { passive: true }); for (const ev of ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'blur', 'change']) inp.addEventListener(ev, off); }
    return r; };
  const setAudio = (o) => settings.set({ audio: o }), A = () => settings.data.audio;
  // ---------- tab Lối chơi ----------
  const run = el('section', 'group'); run.hidden = true; const runInfo = el('small'), runId = el('div'); runId.id = 'runid'; const cp = el('button', 'btn', '<span data-icon="copy"></span>Chép mã'); cp.type = 'button';
  cp.onclick = () => { cp.classList.add('busy'); Promise.resolve(onCopy?.()).then(() => { cp.classList.remove('busy'); cp.classList.add('done'); cp.innerHTML = iconSvg('check') + 'Đã chép'; setTimeout(() => { cp.classList.remove('done'); cp.innerHTML = '<span data-icon="copy"></span>Chép mã'; hydrateIcons(cp); }, 1200); }); };
  const rb = el('div', 'grid2'), bp = el('button', 'btn', '<span data-icon="pause"></span>Tạm dừng'), bm = el('button', 'btn danger', '<span data-icon="home"></span>Về menu'); bp.type = bm.type = 'button';
  bp.onclick = () => { setOpen(false); onPause?.(); }; bm.onclick = () => { if (confirm('Thoát về menu? Ván hiện tại sẽ mất.')) { setOpen(false); onMenu?.(); } }; rb.append(bp, bm);
  run.innerHTML = '<header><span class="badge" data-icon="map"></span><div><h3>Ván đang chơi</h3></div></header>'; run.append(runInfo, runId, cp, rb);
  const gp = group('sword', 'Trong trận', 'Cách game xử lý thời gian khi bạn nâng cấp.');
  gp.append(toggle('pause', 'Tự động tạm dừng khi nâng cấp', 'Dừng thời gian khi mở bảng tháp hoặc chọn nhánh kỹ năng. Tắt = game vẫn chạy trong lúc bạn chọn.', () => settings.data.gameplay.autoPause, (v) => settings.set({ gameplay: { autoPause: v } })));
  panes.play = el('div', 'pane'); panes.play.append(gp, run);
  // ---------- tab Âm thanh ----------
  const ga = group('music', 'Nhạc nền', 'Nhạc tự đổi theo nhịp trận đấu.'); ga.append(toggle('music', 'Bật nhạc nền', 'Menu · yên tĩnh · cao trào', () => A().music, (v) => setAudio({ music: v })), slider('speaker', 'Âm lượng nhạc', 0, 100, 1, () => Math.round(A().musicVol * 100), (v) => { setAudio({ musicVol: v / 100 }); audio.unlock(); }, (v) => v + '%'));
  const gs = group('speaker', 'Hiệu ứng âm thanh', 'Chiến đấu, kỹ năng, giao diện.'); gs.append(toggle('bolt', 'Bật hiệu ứng', 'Bắn, trúng đòn, quái, sự kiện', () => A().sfx, (v) => setAudio({ sfx: v })), slider('speaker', 'Âm lượng hiệu ứng', 0, 100, 1, () => Math.round(A().sfxVol * 100), (v) => { setAudio({ sfxVol: v / 100 }); audio.unlock(); audio.play('hit'); }, (v) => v + '%'));
  panes.audio = el('div', 'pane'); panes.audio.append(ga, gs);
  // ---------- tab Màn hình ----------
  const gd = group('screen', 'Hướng màn hình', 'Dọc, ngang hoặc tự xoay theo thiết bị.'); const orient = seg([['portrait', 'Dọc'], ['landscape', 'Ngang'], ['auto', 'Tự xoay']], () => settings.data.display.orientation, (v) => { settings.set({ display: { orientation: v } }); refresh(); });
  const ratioLbl = el('small', '', 'Tỷ lệ khung khi chơi ngang'), ratio = seg([['19.5:9', '19.5:9'], ['16:9', '16:9'], ['full', 'Toàn màn hình']], () => settings.data.display.ratio, (v) => settings.set({ display: { ratio: v } })), note = el('small'); note.style.color = '#ffcf6b'; gd.append(orient, ratioLbl, ratio, note);
  const gc = group('eye', 'Tầm nhìn camera', 'Số ô nhìn thấy theo cạnh ngắn màn hình.'); const presets = seg([['near', 'Gần'], ['far', 'Xa'], ['wide', 'Rộng']], () => viewPresetOf(settings.data.display.view), (v) => { settings.set({ display: { view: VIEW_PRESETS[v] } }); refresh(); });
  gc.append(presets, slider('eye', 'Tầm nhìn', VIEW_RANGE.min, VIEW_RANGE.max, VIEW_RANGE.step, () => settings.data.display.view, (v) => { settings.set({ display: { view: v } }); presets.redraw(); }, (v) => v.toFixed(1) + ' ô', { mini: true }));
  panes.screen = el('div', 'pane'); panes.screen.append(gd, gc);
  // ---------- tab Hình ảnh ----------
  const gf = group('water', 'Hiệu ứng môi trường', 'Tắt để tiết kiệm pin; hình nền tĩnh vẫn được giữ.'); gf.append(
    toggle('water', 'Hiệu ứng nước', 'Gợn sóng và ánh phản chiếu trên sông, hồ, biển', () => settings.data.fx.water, (v) => settings.set({ fx: { water: v } })),
    toggle('grass', 'Hiệu ứng cỏ', 'Cỏ lay theo gió, nghiêng khi nhân vật bước qua', () => settings.data.fx.grass, (v) => settings.set({ fx: { grass: v } })));
  const gg = group('palette', 'Màu sắc bản đồ', 'Chỉ ảnh hưởng cảnh quan, không đổi giao diện/nhân vật. Giữ thanh kéo để nhìn bản đồ.'), G = VISUAL.grade, pc = (v) => Math.round(v * 100);
  const gset = (k) => (v) => settings.set({ grade: { [k]: v } }), reset = el('button', 'btn', '<span data-icon="refresh"></span>Khôi phục mặc định'); reset.type = 'button'; reset.onclick = () => { settings.set({ grade: { ...GRADE_DEFAULT } }); audio.play('close'); };
  gg.append(slider('sun', 'Độ sáng', G.brightness.min, G.brightness.max, 0.01, () => settings.data.grade.brightness, gset('brightness'), (v) => (v > 0 ? '+' : '') + pc(v) + '%', { peek: true }),
    slider('contrast', 'Độ tương phản', G.contrast.min, G.contrast.max, 0.01, () => settings.data.grade.contrast, gset('contrast'), (v) => pc(v) + '%', { peek: true }),
    slider('palette', 'Độ bão hòa màu', G.saturation.min, G.saturation.max, 0.01, () => settings.data.grade.saturation, gset('saturation'), (v) => pc(v) + '%', { peek: true }), reset);
  redraws.push(() => { reset.disabled = isIdentity(settings.data.grade); });
  panes.visual = el('div', 'pane'); panes.visual.append(gf, gg);
  // ---------- tab điều hướng ----------
  tabsEl.style.setProperty('--n', TABS.length); TABS.forEach(([id, label, ic], i) => { const b = el('button', 'tab', `<span data-icon="${ic}"></span>${label}`); b.type = 'button'; b.dataset.tab = id; b.setAttribute('role', 'tab'); b.onclick = () => go(id, i); tabsEl.appendChild(b); });
  function go(id, i = TABS.findIndex((t) => t[0] === id), instant = false) { const old = TABS.findIndex((t) => t[0] === cur), pane = panes[id]; pane.classList.toggle('left', i < old); pane.style.animation = 'none'; void pane.offsetWidth; pane.style.animation = instant ? 'none' : ''; cur = id;
    body.replaceChildren(pane); tabsEl.style.setProperty('--i', i); [...tabsEl.children].forEach((b) => { b.classList.toggle('sel', b.dataset.tab === id); b.setAttribute('aria-selected', b.dataset.tab === id); }); body.scrollTop = 0; if (!instant) audio.play('click'); }
  function refresh() { redraws.forEach((f) => f()); orient.redraw(); ratio.redraw(); presets.redraw(); const land = settings.data.display.orientation !== 'portrait'; ratioLbl.hidden = ratio.hidden = !land; note.textContent = orientationNote(); note.hidden = !note.textContent; }
  hydrateIcons($('settings')); settings.on(refresh); refresh(); go('play', 0, true);
  const setOpen = (v) => { open = v; $('settings').hidden = !v; if (!v) $('settings').classList.remove('peek'); if (v) { refresh(); audio.play('open'); } else audio.play('close'); onToggle?.(v); };
  $('setclose').onclick = () => setOpen(false); $('settings').addEventListener('pointerdown', (e) => { if (e.target === $('settings')) setOpen(false); });
  const setRun = (id, info = '') => { run.hidden = !id; runId.textContent = id || ''; runInfo.textContent = info ? 'Chủ đề: ' + info : 'Mã bản đồ'; if (!id && cur === 'play') go('play', 0, true); };
  return { setRun, open: () => setOpen(true), close: () => setOpen(false), isOpen: () => open };
}
