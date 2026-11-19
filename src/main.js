import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig.js';
import { newRandomMapId, parseMapId } from './map/index.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
const $ = (id) => document.getElementById(id);
const KEY = 'std.settings.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* bỏ qua */ } };
let game = null, settings = load(), currentMapId = '';
settings.shirt = GAME_CONFIG.shirtColors.includes(settings.shirt) ? settings.shirt : GAME_CONFIG.shirtColors[0];

const sw = $('swatches');
GAME_CONFIG.shirtColors.forEach((c) => {
  const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.dataset.c = c; b.setAttribute('aria-label', 'Màu áo ' + c);
  b.onclick = () => { settings.shirt = c; paint(); }; sw.appendChild(b);
});
function paint() { [...sw.children].forEach((b) => b.classList.toggle('sel', b.dataset.c === settings.shirt)); }
$('name').value = settings.name || 'Nông dân'; $('name').maxLength = GAME_CONFIG.player.maxNameLength; $('mapid').value = settings.lastMapId || ''; paint();

function copy(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); return Promise.resolve();
}
function start() {
  const raw = $('mapid').value.trim(); let id = raw;
  if (!raw) id = newRandomMapId(); else { const p = parseMapId(raw); if (!p.ok) { $('err').textContent = p.error; return; } id = p.id; }
  $('err').textContent = '';
  settings.name = ($('name').value.trim() || 'Nông dân').slice(0, GAME_CONFIG.player.maxNameLength); settings.lastMapId = id; save(settings);
  currentMapId = id; $('menu').hidden = true; $('hud').hidden = false; $('hudid').textContent = id; $('endmodal').hidden = true; $('pauseov').hidden = true;
  const debug = new URLSearchParams(location.search).get('debug') === '1';
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#1b2a1b', pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, input: { activePointers: 3 }, fps: { target: 60 },
    scene: [],
  });
  // Thứ tự thêm = thứ tự vẽ: Game trước (dưới), UI sau (trên cùng). Đảo ngược sẽ làm nút bị bản đồ che mất.
  game.scene.add('Game', GameScene, true, { mapId: id, name: settings.name, shirt: settings.shirt, debug, onEnd });
  game.scene.add('UI', UIScene, false);
}
const mmss = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
function onEnd(st) {
  const prev = settings.bestWave || 0; settings.bestWave = Math.max(prev, st.wave); save(settings);
  $('endtitle').textContent = st.won ? '🏆 CHIẾN THẮNG!' : '💀 THẤT BẠI'; $('endsub').textContent = (st.won ? 'Bạn đã sống sót qua 100 đợt.' : `Bạn gục ngã ở đợt ${st.wave}.`) + (st.wave > prev ? ' Kỷ lục mới!' : ` Kỷ lục: đợt ${settings.bestWave}.`);
  $('endstats').innerHTML = [['Slime đã diệt', st.kills], ['Vàng kiếm được', st.gold + ' 🪙'], ['Số tháp đã xây', st.towers], ['Sát thương gây ra', st.damage.toLocaleString('vi-VN')], ['Thời gian sống sót', mmss(st.time)], ['Mã bản đồ', st.mapId]].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
  $('endmodal').hidden = false;
}
function backToMenu() { game?.destroy(true); game = null; ['tpanel', 'skillmodal', 'toast', 'pauseov', 'endmodal'].forEach((id) => ($(id).hidden = true)); $('hud').hidden = true; $('menu').hidden = false; $('mapid').value = settings.lastMapId || ''; $('best').textContent = settings.bestWave ? `Kỷ lục: đợt ${settings.bestWave}` : ''; }
$('start').onclick = start;
$('pausebtn').onclick = () => game?.scene.getScene('Game')?.togglePause(); $('resume').onclick = () => game?.scene.getScene('Game')?.togglePause();
$('endmenu').onclick = () => backToMenu();
$('endretry').onclick = () => { const id = currentMapId; game?.destroy(true); game = null; $('mapid').value = id; start(); };
$('best').textContent = settings.bestWave ? `Kỷ lục: đợt ${settings.bestWave}` : '';
$('random').onclick = () => { $('mapid').value = newRandomMapId(); };
$('copy').onclick = () => copy($('hudid').textContent).then(() => { $('copy').textContent = 'Đã chép'; setTimeout(() => ($('copy').textContent = 'Chép mã'), 1200); });
$('back').onclick = () => { if (confirm('Thoát về menu? Ván hiện tại sẽ mất.')) backToMenu(); };
