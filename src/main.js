import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig.js';
import { newRandomMapId, parseMapId } from './map/index.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { NetGameScene } from './scenes/NetGameScene.js';
import { createLobby } from './ui/lobby.js';
const $ = (id) => document.getElementById(id);
const KEY = 'std.settings.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* bỏ qua */ } };
let game = null, settings = load(), currentMapId = '', mode = 'solo', lobby = null;
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
  mode = 'solo'; $('pausebtn').hidden = false; runGame(GameScene, { mapId: id, name: settings.name, shirt: settings.shirt, debug: new URLSearchParams(location.search).get('debug') === '1', onEnd });
}
function runGame(Scene, data) {
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#1b2a1b', pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, input: { activePointers: 3 }, fps: { target: 60 },
    scene: [],
  });
  // Thứ tự thêm = thứ tự vẽ: Game trước (dưới), UI sau (trên cùng). Đảo ngược sẽ làm nút bị bản đồ che mất.
  game.scene.add('Game', Scene, true, data);
  game.scene.add('UI', UIScene, false);
}
const mmss = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
function onEnd(st) {
  const prev = settings.bestWave || 0; settings.bestWave = Math.max(prev, st.wave); save(settings);
  $('endtitle').textContent = st.won ? '🏆 CHIẾN THẮNG!' : '💀 THẤT BẠI'; $('endsub').textContent = (st.won ? (mode === 'net' ? 'Cả đội đã sống sót qua 100 đợt.' : 'Bạn đã sống sót qua 100 đợt.') : (mode === 'net' ? `Cả đội gục ngã ở đợt ${st.wave}.` : `Bạn gục ngã ở đợt ${st.wave}.`)) + (st.wave > prev ? ' Kỷ lục mới!' : ` Kỷ lục: đợt ${settings.bestWave}.`);
  $('endstats').innerHTML = [['Slime đã diệt', st.kills], ['Vàng kiếm được', st.gold + ' 🪙'], ['Số tháp đã xây', st.towers], ['Sát thương gây ra', st.damage.toLocaleString('vi-VN')], ['Thời gian sống sót', mmss(st.time)], ['Mã bản đồ', st.mapId]].concat(st.players ? [['Người chơi', st.players.map((p) => p.name).join(', ')]] : []).map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
  $('endmodal').hidden = false; $('endretry').textContent = mode === 'net' ? 'Về phòng chờ (chủ phòng)' : 'Chơi lại bản đồ này';
}
function backToMenu() { if (mode === 'net') { lobby.leave(); mode = 'solo'; $('netstat').hidden = true; $('mp').hidden = true; } $('pausebtn').hidden = false; game?.destroy(true); game = null; ['tpanel', 'skillmodal', 'toast', 'pauseov', 'endmodal'].forEach((id) => ($(id).hidden = true)); $('hud').hidden = true; $('menu').hidden = false; $('mapid').value = settings.lastMapId || ''; $('best').textContent = settings.bestWave ? `Kỷ lục: đợt ${settings.bestWave}` : ''; }
$('start').onclick = start;
$('pausebtn').onclick = () => game?.scene.getScene('Game')?.togglePause(); $('resume').onclick = () => game?.scene.getScene('Game')?.togglePause();
$('endmenu').onclick = () => backToMenu();
$('endretry').onclick = () => { if (mode === 'net') { if (lobby.isHost()) lobby.requestRematch(); else toast('Chờ chủ phòng bấm chơi lại.'); return; } const id = currentMapId; game?.destroy(true); game = null; $('mapid').value = id; start(); };
$('best').textContent = settings.bestWave ? `Kỷ lục: đợt ${settings.bestWave}` : '';
$('random').onclick = () => { $('mapid').value = newRandomMapId(); };
$('copy').onclick = () => copy($('hudid').textContent).then(() => { $('copy').textContent = 'Đã chép'; setTimeout(() => ($('copy').textContent = 'Chép mã'), 1200); });
$('back').onclick = () => { if (confirm(mode === 'net' ? 'Rời phòng? Bạn sẽ thoát khỏi ván nhiều người.' : 'Thoát về menu? Ván hiện tại sẽ mất.')) backToMenu(); };
function toast(m) { const el = $('toast'); el.textContent = m; el.className = 'err'; el.hidden = false; setTimeout(() => (el.hidden = true), 2500); }
lobby = createLobby({
  settings, save, copy, toast,
  startNet(session) { // vào ván nhiều người
    mode = 'net'; settings.name = ($('name').value.trim() || 'Nông dân').slice(0, GAME_CONFIG.player.maxNameLength); save(settings);
    $('menu').hidden = true; $('mp').hidden = true; $('hud').hidden = false; $('hudid').textContent = session.room.code; $('pausebtn').hidden = true; $('endmodal').hidden = true; $('pauseov').hidden = true;
    runGame(NetGameScene, { session, name: settings.name, shirt: settings.shirt, onEnd });
  },
  leftGame() { game?.destroy(true); game = null; ['tpanel', 'skillmodal', 'endmodal'].forEach((id) => ($(id).hidden = true)); $('hud').hidden = true; $('netstat').hidden = true; },
  onEnd,
  netStatus(s, inGame) { const el = $('netstat'); if (!inGame && mode !== 'net') { el.hidden = true; return; } el.hidden = s === 'open'; el.textContent = s === 'reconnecting' ? 'Mất kết nối – đang thử vào lại…' : s === 'closed' ? 'Đã mất kết nối với máy chủ.' : 'Đang kết nối…'; },
});
$('name').addEventListener('change', () => { settings.name = ($('name').value.trim() || 'Nông dân').slice(0, GAME_CONFIG.player.maxNameLength); save(settings); });
$('mpbtn').onclick = () => { settings.name = ($('name').value.trim() || 'Nông dân').slice(0, GAME_CONFIG.player.maxNameLength); save(settings); lobby.open(); };
