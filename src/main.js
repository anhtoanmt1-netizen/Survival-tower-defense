import Phaser from 'phaser';
import '@fontsource/montserrat/400.css'; import '@fontsource/montserrat/500.css'; import '@fontsource/montserrat/600.css'; import '@fontsource/montserrat/700.css'; import '@fontsource/montserrat/800.css';
import { GAME_CONFIG } from './config/gameConfig.js';
import { FONT_FILES } from './config/ui.js';
import { settings } from './config/settings.js';
import { DIFFICULTY_LIST, getDifficulty } from './config/difficulty.js';
import { newRandomMapId, parseMapId } from './map/index.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { audio } from './systems/Audio.js';
import { initScreen, bindScreen } from './ui/screen.js';
import { initSettingsPanel } from './ui/settingsPanel.js';
const $ = (id) => document.getElementById(id);
let game = null, currentMapId = '';
if (!GAME_CONFIG.shirtColors.includes(settings.data.shirt)) settings.set({ shirt: GAME_CONFIG.shirtColors[0] });
initScreen();
const panel = initSettingsPanel({ onToggle: (open) => game?.scene.getScene('Game')?.setSettingsOpen?.(open) });
// Âm thanh trình duyệt chỉ mở sau thao tác chạm đầu tiên; mọi nút DOM đều có tiếng bấm.
const unlock = () => { audio.unlock(); if (!game) audio.setMusic('menu'); };
document.addEventListener('pointerdown', unlock, { capture: true });
document.addEventListener('click', (e) => { const b = e.target.closest?.('button'); if (b && !b.classList.contains('switch') && !b.closest('#setbody') && !b.closest('#settings .seg')) audio.play('click'); }, true);

const sw = $('swatches');
GAME_CONFIG.shirtColors.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.dataset.c = c; b.setAttribute('aria-label', 'Màu áo ' + c); b.onclick = () => { settings.set({ shirt: c }); paintSwatches(); }; sw.appendChild(b); });
const paintSwatches = () => [...sw.children].forEach((b) => b.classList.toggle('sel', b.dataset.c === settings.data.shirt));
// chọn độ khó
const dg = $('diffs');
DIFFICULTY_LIST.forEach((d) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'diff'; b.dataset.id = d.id; b.style.setProperty('--c', d.color); b.innerHTML = `<span class="ic">${d.icon}</span><span>${d.name}</span>`; b.onclick = () => { settings.set({ difficulty: d.id }); paintDiff(); }; dg.appendChild(b); });
const f1 = (n) => String(n).replace('.', ',');
function paintDiff() {
  const d = getDifficulty(settings.data.difficulty); [...dg.children].forEach((b) => b.classList.toggle('sel', b.dataset.id === d.id));
  const el = $('diffdesc'); el.style.setProperty('--c', d.color);
  el.innerHTML = `<b>Cấp ${d.level}/5 – ${d.name} (${d.en})</b>: ${d.blurb}<br><small>Máu quái ×${f1(d.hpMul)} · Số lượng ×${f1(d.countMul)} · Tháp ${d.buildCost}🪙 · Vàng ${Math.round(d.rewardMul * 100)}% · Chạm = −${d.contactDamage} tim</small>`;
  showBest();
}
function showBest() { const d = getDifficulty(settings.data.difficulty), b = settings.data.bestWaves[d.id] || (d.id === 'easy' ? settings.data.bestWave : 0); $('best').textContent = b ? `Kỷ lục ${d.name}: đợt ${b}` : ''; }

$('name').value = settings.data.name || 'Nông dân'; $('name').maxLength = GAME_CONFIG.player.maxNameLength; $('mapid').value = settings.data.lastMapId || ''; paintSwatches(); paintDiff();
function copy(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); return Promise.resolve();
}
async function loadFonts() { try { await Promise.all(FONT_FILES.map((w) => document.fonts.load(`${w} 14px Montserrat`, 'ĐợtẢạ Tiếng Việt ăâêôơư 0123456789'))); } catch { /* dùng font dự phòng */ } }
async function start() {
  const raw = $('mapid').value.trim(); let id = raw;
  if (!raw) id = newRandomMapId(); else { const p = parseMapId(raw); if (!p.ok) { $('err').textContent = p.error; return; } id = p.id; }
  $('err').textContent = '';
  const name = ($('name').value.trim() || 'Nông dân').slice(0, GAME_CONFIG.player.maxNameLength); settings.set({ name, lastMapId: id });
  currentMapId = id; $('menu').hidden = true; $('hud').hidden = false; $('hudid').textContent = id; $('endmodal').hidden = true; $('pauseov').hidden = true;
  const debug = new URLSearchParams(location.search).get('debug') === '1'; await loadFonts(); audio.unlock();
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#1b2a1b', pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, input: { activePointers: 3 }, fps: { target: 60 },
    scene: [],
  });
  bindScreen(game);
  // Thứ tự thêm = thứ tự vẽ: Game trước (dưới), UI sau (trên cùng). Đảo ngược sẽ làm nút bị bản đồ che mất.
  game.scene.add('Game', GameScene, true, { mapId: id, name, shirt: settings.data.shirt, difficulty: settings.data.difficulty, debug, onEnd });
  game.scene.add('UI', UIScene, false);
}
const mmss = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
function onEnd(st) {
  const d = getDifficulty(st.difficulty), prev = settings.data.bestWaves[d.id] || (d.id === 'easy' ? settings.data.bestWave : 0), best = Math.max(prev, st.wave); settings.set({ bestWaves: { [d.id]: best } });
  $('endtitle').textContent = st.won ? '🏆 CHIẾN THẮNG!' : '💀 THẤT BẠI'; $('endsub').textContent = (st.won ? `Bạn đã sống sót qua 100 đợt ở độ khó ${d.name}.` : `Bạn gục ngã ở đợt ${st.wave} (${d.name}).`) + (st.wave > prev ? ' Kỷ lục mới!' : ` Kỷ lục: đợt ${best}.`);
  $('endstats').innerHTML = [['Độ khó', `${d.icon} ${d.name}`], ['Slime đã diệt', st.kills], ['Vàng kiếm được', st.gold + ' 🪙'], ['Số tháp đã xây', st.towers], ['Sát thương gây ra', st.damage.toLocaleString('vi-VN')], ['Thời gian sống sót', mmss(st.time)], ['Mã bản đồ', st.mapId]].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
  $('endmodal').hidden = false;
}
function backToMenu() { game?.destroy(true); game = null; bindScreen(null); ['tpanel', 'skillmodal', 'toast', 'pauseov', 'endmodal'].forEach((id) => ($(id).hidden = true)); $('hud').hidden = true; $('menu').hidden = false; $('mapid').value = settings.data.lastMapId || ''; showBest(); audio.setMusic('menu'); }
$('start').onclick = start;
$('pausebtn').onclick = () => game?.scene.getScene('Game')?.togglePause(); $('resume').onclick = () => game?.scene.getScene('Game')?.togglePause();
$('hudset').onclick = () => panel.open(); $('pauseset').onclick = () => panel.open(); $('menuset').onclick = () => panel.open();
$('endmenu').onclick = () => backToMenu();
$('endretry').onclick = () => { const id = currentMapId; game?.destroy(true); game = null; $('mapid').value = id; start(); };
$('random').onclick = () => { $('mapid').value = newRandomMapId(); };
$('copy').onclick = () => copy($('hudid').textContent).then(() => { $('copy').textContent = 'Đã chép'; setTimeout(() => ($('copy').textContent = 'Chép mã'), 1200); });
$('back').onclick = () => { if (confirm('Thoát về menu? Ván hiện tại sẽ mất.')) backToMenu(); };
