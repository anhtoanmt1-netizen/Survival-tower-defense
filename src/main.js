import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig.js';
import { newRandomMapId, parseMapId } from './map/index.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
const $ = (id) => document.getElementById(id);
const KEY = 'std.settings.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* bỏ qua */ } };
let game = null, settings = load();
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
  $('menu').hidden = true; $('hud').hidden = false; $('hudid').textContent = id;
  const debug = new URLSearchParams(location.search).get('debug') === '1';
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#1b2a1b', pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }, input: { activePointers: 3 }, fps: { target: 60 },
    scene: [],
  });
  game.scene.add('UI', UIScene, false);
  game.scene.add('Game', GameScene, true, { mapId: id, name: settings.name, shirt: settings.shirt, debug });
}
function backToMenu() { game?.destroy(true); game = null; $('hud').hidden = true; $('menu').hidden = false; $('mapid').value = settings.lastMapId || ''; }
$('start').onclick = start;
$('random').onclick = () => { $('mapid').value = newRandomMapId(); };
$('copy').onclick = () => copy($('hudid').textContent).then(() => { $('copy').textContent = 'Đã chép'; setTimeout(() => ($('copy').textContent = 'Chép mã'), 1200); });
$('back').onclick = () => { if (confirm('Thoát về menu? Ván hiện tại sẽ mất.')) backToMenu(); };
