import { NetClient } from '../net/client.js';
import { GameSession } from '../net/gameSession.js';
import { PALETTE, normalizeCode } from '../net/protocol.js';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Màn hình nhiều người: kết nối máy chủ, tạo/vào phòng, phòng chờ. ctx: {settings, save, copy, startNet(session), leftGame(), onEnd(stats), netStatus(status)}
export function createLobby(ctx) {
  let client = null, session = null, inGame = false;
  // Trong APK, location.host = "localhost" là chính ứng dụng, KHÔNG phải máy chủ => không tự điền. Trên web do server phục vụ thì tự điền theo trang.
  const isNative = () => !!(globalThis.Capacitor?.isNativePlatform?.() || (location.hostname === 'localhost' && !location.port && !!globalThis.Capacitor));
  const defaultUrl = () => (isNative() ? '' : location.protocol.startsWith('http') && location.host ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws` : 'ws://localhost:8080/ws');
  const httpBase = (u) => u.replace(/^ws/, 'http').replace(/\/ws\/?$/, '');
  const err = (m) => { $('mperr').textContent = m || ''; }, lerr = (m) => { $('lerr').textContent = m || ''; };
  const show = (w) => { $('mpconnect').hidden = w !== 'connect'; $('mplobby').hidden = w !== 'lobby'; };
  function open(code) { $('mp').hidden = false; $('menu').hidden = true; $('srvurl').value = ctx.settings.serverUrl || defaultUrl(); if (code) $('roomcode').value = code; err(''); show(session && session.room ? 'lobby' : 'connect'); }
  function close() { try { client?.close(); } catch { /* bỏ qua */ } client = null; session = null; inGame = false; }
  async function connect(action) {
    err(''); const url = $('srvurl').value.trim();
    if (!url) return err('Hãy nhập địa chỉ máy chủ, ví dụ ws://192.168.1.10:8080/ws (cùng Wi-Fi) hoặc wss://ten-mien/ws (qua Internet).');
    if (!/^wss?:\/\//.test(url)) return err('Địa chỉ máy chủ phải bắt đầu bằng ws:// hoặc wss://');
    const code = normalizeCode($('roomcode').value); if (action === 'join' && code.length !== 6) return err('Mã phòng gồm 6 ký tự.');
    ctx.settings.serverUrl = url; ctx.save(ctx.settings); close(); client = new NetClient(url); session = new GameSession(client); wire();
    $('mpcreate').disabled = $('mpjoin').disabled = true;
    try { await client.connect(); } catch (e) { $('mpcreate').disabled = $('mpjoin').disabled = false; close(); return err(`${e.message || 'Không kết nối được.'} (${url}). Kiểm tra: máy chủ đang chạy; cùng Wi-Fi nếu dùng địa chỉ nội bộ; dùng wss:// nếu qua Internet.`); }
    const base = { ...client.hello(), name: ctx.settings.name, color: ctx.settings.shirt };
    client.send(action === 'create' ? { t: 'create', ...base, respawn: true } : { t: 'join', ...base, code });
  }
  function wire() {
    client.onstatus = (s) => ctx.netStatus?.(s, inGame);
    session.on('room', (room) => {
      $('mpcreate').disabled = $('mpjoin').disabled = false;
      if (inGame && room.state === 'lobby') { inGame = false; ctx.leftGame(); $('mp').hidden = false; }  // chủ phòng chọn chơi lại: về phòng chờ
      if (!inGame) { render(room); show('lobby'); $('mp').hidden = false; $('menu').hidden = true; }
    }).on('start', (m, rejoin) => { if (!rejoin) { inGame = true; $('mp').hidden = true; ctx.startNet(session); } })
      .on('err', (m) => { $('mpcreate').disabled = $('mpjoin').disabled = false; if (!$('mplobby').hidden && !inGame) lerr(m.msg); else if (inGame) ctx.toast?.(m.msg); else { err(m.msg); close(); } })
      .on('fatal', (msg) => { err(msg); lerr(msg); ctx.toast?.(msg); })
      .on('end', (st) => ctx.onEnd(st)).on('left', () => {});
  }
  function render(room) {
    const me = session.you?.id, isHost = room.hostId === me, link = `${httpBase($('srvurl').value.trim() || defaultUrl())}/?room=${room.code}`;
    $('lcode').textContent = room.code; lerr('');
    $('lplayers').innerHTML = room.players.map((p) => `<div class="pl"><i style="background:${p.color}"></i><b>${esc(p.name)}</b>${p.host ? ' 👑' : ''}${p.id === me ? ' (bạn)' : ''}<span>${p.connected ? '' : 'mất kết nối'}</span></div>`).join('') + `<small>${room.players.length}/${room.max} người</small>`;
    const sw = $('lswatches'); sw.innerHTML = '';
    for (const c of PALETTE) { const taken = room.players.some((p) => p.color === c && p.id !== me), b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.disabled = taken; b.classList.toggle('sel', room.players.find((p) => p.id === me)?.color === c); b.setAttribute('aria-label', 'Màu ' + c); b.onclick = () => { client.send({ t: 'color', color: c }); ctx.settings.shirt = c; ctx.save(ctx.settings); }; sw.appendChild(b); }
    $('lmapid').value = room.mapId; $('lmapid').disabled = !isHost; $('lmapset').hidden = $('lmaprand').hidden = !isHost; $('lrespawn').checked = !!room.opts.respawn; $('lrespawn').disabled = !isHost;
    $('lstart').hidden = !isHost; $('lhint').textContent = isHost ? 'Bạn là chủ phòng: bấm Bắt đầu khi mọi người đã sẵn sàng. Số cổng quái = số người chơi.' : 'Đang chờ chủ phòng bắt đầu…';
    $('lshare').dataset.link = link; $('lcopy').dataset.code = room.code;
  }
  $('mpcreate').onclick = () => connect('create'); $('mpjoin').onclick = () => connect('join');
  $('mpback').onclick = () => { close(); $('mp').hidden = true; $('menu').hidden = false; };
  $('lleave').onclick = () => { client?.send({ t: 'leave' }); close(); show('connect'); };
  $('lstart').onclick = () => client?.send({ t: 'start' });
  $('lmapset').onclick = () => client?.send({ t: 'map', mapId: $('lmapid').value.trim() }); $('lmaprand').onclick = () => client?.send({ t: 'map', mapId: 'random' });
  $('lrespawn').onchange = () => client?.send({ t: 'opts', respawn: $('lrespawn').checked });
  $('lcopy').onclick = () => ctx.copy($('lcopy').dataset.code).then(() => { $('lcopy').textContent = 'Đã chép'; setTimeout(() => ($('lcopy').textContent = 'Chép mã'), 1200); });
  $('lshare').onclick = async () => {
    const link = $('lshare').dataset.link, code = $('lcode').textContent, text = `Vào phòng ${code} chơi Survival Tower Defense cùng mình!`;
    if (navigator.share) { try { await navigator.share({ title: 'Survival Tower Defense', text, url: link }); return; } catch { /* người dùng hủy */ } }
    ctx.copy(`${text} ${link}`).then(() => { $('lshare').textContent = 'Đã chép link'; setTimeout(() => ($('lshare').textContent = 'Mời bạn'), 1400); });
  };
  const roomFromUrl = (u) => { const m = /[?&]room=([A-Za-z0-9]{4,8})/.exec(u || ''); return m ? normalizeCode(m[1]) : null; };
  // Link mời: ?room=CODE (web) hoặc survivaltd://join?room=CODE (Android, cần @capacitor/app + intent-filter – xem README)
  const fromLink = roomFromUrl(location.search); if (fromLink) open(fromLink);
  try { globalThis.Capacitor?.Plugins?.App?.addListener?.('appUrlOpen', (e) => { const c = roomFromUrl(e.url); if (c) open(c); }); } catch { /* không phải app */ }
  return {
    open, roomFromUrl, isActive: () => !!client,
    leave() { try { client?.send({ t: 'leave' }); } catch { /* bỏ qua */ } close(); },
    requestRematch() { client?.send({ t: 'again' }); }, isHost: () => session?.room?.hostId === session?.you?.id,
  };
}
