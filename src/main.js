import Phaser from 'phaser';
import '@fontsource/montserrat/400.css'; import '@fontsource/montserrat/500.css'; import '@fontsource/montserrat/600.css'; import '@fontsource/montserrat/700.css'; import '@fontsource/montserrat/800.css';
import { GAME_CONFIG } from './config/gameConfig.js';
import { FONT_FILES } from './config/ui.js';
import { settings } from './config/settings.js';
import { DIFFICULTY_LIST, DIFF_ICON, getDifficulty } from './config/difficulty.js';
import { isUnlocked, requirementOf, recordResult } from './config/progress.js';
import { newRandomMapId, parseMapId } from './map/index.js';
import { TERRAIN_THEMES, TERRAIN_THEME_CODES } from './map/terrain/themes.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { audio } from './systems/Audio.js';
import { initScreen, bindScreen } from './ui/screen.js';
import { initSettingsPanel } from './ui/settingsPanel.js';
import { hydrateIcons, iconSvg, rasterizeIcons } from './ui/icons.js';
import { MapPreview } from './ui/mapPreview.js';
const $ = (id) => document.getElementById(id), PHASER_ICONS = ['heart', 'coin', 'hammer', 'shield', 'dash', 'bolt', 'gear', 'flag', 'slime', 'pause', 'sword'];
let game = null, currentMapId = '', pending = '';
if (!GAME_CONFIG.shirtColors.includes(settings.data.shirt)) settings.set({ shirt: GAME_CONFIG.shirtColors[0] });
hydrateIcons(); initScreen();
const panel = initSettingsPanel({
  onToggle: (open) => game?.scene.getScene('Game')?.setSettingsOpen?.(open),
  onCopy: () => copy(currentMapId), onPause: () => game?.scene.getScene('Game')?.togglePause(), onMenu: () => backToMenu(),
});
// Âm thanh trình duyệt chỉ mở sau thao tác chạm đầu tiên; mọi nút DOM đều có tiếng bấm.
const unlock = () => { audio.unlock(); if (!game) audio.setMusic('menu'); };
document.addEventListener('pointerdown', unlock, { capture: true });
document.addEventListener('click', (e) => { const b = e.target.closest?.('button'); if (b && !b.classList.contains('switch') && !b.closest('#setbody') && !b.closest('#settabs')) audio.play('click'); }, true);

const sw = $('swatches');
GAME_CONFIG.shirtColors.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.dataset.c = c; b.setAttribute('aria-label', 'Màu áo ' + c); b.onclick = () => { settings.set({ shirt: c }); paintSwatches(); }; sw.appendChild(b); });
const paintSwatches = () => [...sw.children].forEach((b) => b.classList.toggle('sel', b.dataset.c === settings.data.shirt));
// chọn độ khó
const dg = $('diffs');
DIFFICULTY_LIST.forEach((d) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'diff'; b.dataset.id = d.id; b.style.setProperty('--c', d.color); b.innerHTML = `<span class="dic">${iconSvg(DIFF_ICON[d.id])}</span><span>${d.name}</span><span class="dlock">${iconSvg('lock')}</span>`; b.onclick = () => { if (!isUnlocked(d.id, settings.data.cleared)) { lockedHint(d); return; } settings.set({ difficulty: d.id }); paintDiff(); }; dg.appendChild(b); });
const f1 = (n) => String(n).replace('.', ',');
function lockedHint(d) { const r = getDifficulty(requirementOf(d.id)); $('diffdesc').style.setProperty('--c', d.color); $('diffdesc').innerHTML = `<b>🔒 ${d.name} đang khóa</b>: hãy thắng độ khó <b>${r.name}</b> (sống sót đủ 100 đợt) để mở khóa.`; }
function paintDiff() {
  const d = getDifficulty(settings.data.difficulty); [...dg.children].forEach((b) => { const lk = !isUnlocked(b.dataset.id, settings.data.cleared); b.classList.toggle('sel', b.dataset.id === d.id); b.classList.toggle('locked', lk); b.setAttribute('aria-disabled', String(lk)); b.title = lk ? 'Chưa mở khóa – thắng cấp trước để mở' : ''; });
  const el = $('diffdesc'); el.style.setProperty('--c', d.color);
  el.innerHTML = `<b>Cấp ${d.level}/5 – ${d.name} (${d.en})</b>: ${d.blurb}<br><small>Máu quái ×${f1(d.hpMul)} · Số lượng ×${f1(d.countMul)} · Tháp ${d.buildCost} vàng · Thưởng ${Math.round(d.rewardMul * 100)}% · Chạm = −${d.contactDamage} tim</small>`;
  showBest();
}
function showBest() { const d = getDifficulty(settings.data.difficulty), b = settings.data.bestWaves[d.id] || (d.id === 'easy' ? settings.data.bestWave : 0); $('best').textContent = b ? `Kỷ lục ${d.name}: đợt ${b}` : ''; }
// chọn chủ đề + kích thước bản đồ mới
const mt = $('mtheme'); mt.innerHTML = '<option value="random">Ngẫu nhiên (tự chọn chủ đề)</option>' + TERRAIN_THEME_CODES.map((k) => `<option value="${k}">${TERRAIN_THEMES[k].vi} – ${TERRAIN_THEMES[k].name}</option>`).join('');
const paintMap = () => { mt.value = settings.data.mapTheme; $('msize').value = String(settings.data.mapSize); const t = TERRAIN_THEMES[settings.data.mapTheme]; $('mthemedesc').textContent = t ? t.blurb : 'Mỗi ván tự chọn một trong 7 chủ đề với địa hình khác nhau.'; };

// ---------- BẢN ĐỒ XEM TRƯỚC: luôn khớp bản đồ sẽ chơi (Map ID gõ vào, hoặc bản đồ đang chờ theo chủ đề/kích thước đã chọn) ----------
const cv = $('mpcanvas'), preview = new MapPreview(cv, null); let pt = 0;
const typedId = () => { const raw = $('mapid').value.trim(); if (!raw) return { id: pending }; const p = parseMapId(raw); return p.ok ? { id: p.id } : { error: p.error }; };
function newPending() { pending = newRandomMapId(settings.data.mapTheme, settings.data.mapSize); $('mapid').placeholder = pending; updatePreview(); }
function updatePreview() {
  clearTimeout(pt); const t = typedId(); if (t.error) { $('err').textContent = t.error; return; } $('err').textContent = '';
  $('mpload').classList.remove('off'); cv.classList.add('swap');
  pt = setTimeout(async () => { const info = await preview.show(t.id); if (!info) return;
    $('mpname').textContent = `${info.title} · ${info.size}×${info.size}`; $('mpblurb').textContent = info.blurb; $('mpid').textContent = info.id;
    $('mpchips').innerHTML = info.chips.map(([ic, tx]) => `<span class="chip">${iconSvg(ic)}${tx}</span>`).join(''); cv.classList.remove('swap'); $('mpload').classList.add('off'); }, 200);
}
mt.onchange = () => { settings.set({ mapTheme: mt.value }); paintMap(); if (!$('mapid').value.trim()) newPending(); };
$('msize').onchange = () => { settings.set({ mapSize: +$('msize').value }); if (!$('mapid').value.trim()) newPending(); };
$('mapid').oninput = () => { $('mapid').value = $('mapid').value.toUpperCase(); updatePreview(); };
$('name').value = settings.data.name || 'Nông dân'; $('name').maxLength = GAME_CONFIG.player.maxNameLength; paintSwatches(); paintDiff(); paintMap(); newPending();
function copy(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); return Promise.resolve();
}
async function loadFonts() { try { await Promise.all(FONT_FILES.map((w) => document.fonts.load(`${w} 14px Montserrat`, 'ĐợtẢạ Tiếng Việt ăâêôơư 0123456789'))); } catch { /* dùng font dự phòng */ } }
const runInfo = (id) => { const p = parseMapId(id), t = TERRAIN_THEMES[p.theme]; return `${t ? t.vi + ' – ' + t.name : p.theme} · ${p.size}×${p.size}`; };
async function start() {
  if (!isUnlocked(settings.data.difficulty, settings.data.cleared)) { settings.set({ difficulty: 'easy' }); paintDiff(); } // chặn bắt đầu cấp đang khóa
  const t = typedId(); if (t.error) { $('err').textContent = t.error; return; } const id = t.id; $('err').textContent = '';
  const btn = $('start'); btn.classList.add('busy');
  const name = ($('name').value.trim() || 'Nông dân').slice(0, GAME_CONFIG.player.maxNameLength); settings.set({ name, lastMapId: id });
  currentMapId = id; const debug = new URLSearchParams(location.search).get('debug') === '1'; const [icons] = await Promise.all([rasterizeIcons(PHASER_ICONS), loadFonts()]); audio.unlock();
  $('menu').hidden = true; panel.setRun(id, runInfo(id)); $('endmodal').hidden = true; $('pauseov').hidden = true; btn.classList.remove('busy');
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#1b2a1b', pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, input: { activePointers: 3 }, fps: { target: 60 },
    scene: [],
  });
  bindScreen(game);
  // Thứ tự thêm = thứ tự vẽ: Game trước (dưới), UI sau (trên cùng). Đảo ngược sẽ làm nút bị bản đồ che mất.
  game.scene.add('Game', GameScene, true, { mapId: id, name, shirt: settings.data.shirt, difficulty: settings.data.difficulty, debug, onEnd, openSettings: () => panel.open(), icons });
  game.scene.add('UI', UIScene, false);
}
const mmss = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
function onEnd(st) {
  const d = getDifficulty(st.difficulty), prev = settings.data.bestWaves[d.id] || (d.id === 'easy' ? settings.data.bestWave : 0), best = Math.max(prev, st.wave), cleared = recordResult(settings.data.cleared, d.id, st.won), nextUnlocked = st.won && !settings.data.cleared[d.id]; settings.set({ bestWaves: { [d.id]: best }, cleared }); paintDiff();
  const ico = $('endico'); ico.classList.toggle('lose', !st.won); ico.dataset.icon = st.won ? 'trophy' : 'skull'; hydrateIcons($('endmodal'));
  $('endtitle').textContent = st.won ? 'CHIẾN THẮNG!' : 'THẤT BẠI'; $('endsub').textContent = (st.won ? `Bạn đã sống sót qua 100 đợt ở độ khó ${d.name}.` : `Bạn gục ngã ở đợt ${st.wave} (${d.name}).`) + (st.wave > prev ? ' Kỷ lục mới!' : ` Kỷ lục: đợt ${best}.`) + (nextUnlocked && d.level < 5 ? ' Đã mở khóa độ khó tiếp theo!' : '');
  $('endstats').innerHTML = [['Độ khó', d.name], ['Slime đã diệt', st.kills], ['Vàng kiếm được', st.gold], ['Số tháp đã xây', st.towers], ['Sát thương gây ra', st.damage.toLocaleString('vi-VN')], ['Thời gian sống sót', mmss(st.time)], ['Mã bản đồ', st.mapId]].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
  $('endmodal').hidden = false;
}
function backToMenu() { game?.destroy(true); game = null; bindScreen(null); panel.setRun(null); ['tpanel', 'skillmodal', 'toast', 'pauseov', 'endmodal'].forEach((id) => ($(id).hidden = true)); $('menu').hidden = false; $('mapid').value = ''; newPending(); showBest(); audio.setMusic('menu'); }
$('start').onclick = start;
$('resume').onclick = () => game?.scene.getScene('Game')?.togglePause();
$('pauseset').onclick = () => panel.open(); $('menuset').onclick = () => panel.open();
$('endmenu').onclick = () => backToMenu();
$('endretry').onclick = () => { const id = currentMapId; game?.destroy(true); game = null; $('mapid').value = id; start(); };
$('random').onclick = () => { $('mapid').value = ''; newPending(); };
