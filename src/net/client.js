import { PROTOCOL_VERSION, configChecksum } from './protocol.js';
// Kết nối WebSocket tới server. Tự kết nối lại (backoff) và vào lại phòng bằng token; lệnh chưa có kết quả được gửi lại với CÙNG id
// (server chống trùng nên không bị trừ vàng/xây hai lần).
export class NetClient {
  constructor(url, { WS = globalThis.WebSocket, setT = setTimeout, clearT = clearTimeout } = {}) {
    Object.assign(this, { url, WS, setT, clearT, ws: null, session: null, rtt: 0, cmdId: 0, pending: new Map(), status: 'closed', userClosed: false, tries: 0, inGame: false });
    this.onmessage = null; this.onstatus = null; this.pingT = null; this.retryT = null; this.pn = 0; this.retrying = false;
  }
  setStatus(s) { if (this.status !== s) { this.status = s; this.onstatus?.(s); } }
  connect(timeout = 8000) {
    return new Promise((resolve, reject) => {
      this.userClosed = false; this.setStatus(this.tries ? 'reconnecting' : 'connecting'); let done = false;
      const fail = (e) => { if (!done) { done = true; reject(e); } };
      let ws; try { ws = new this.WS(this.url); } catch (e) { return fail(e); }
      this.ws = ws; const to = this.setT(() => { fail(new Error('Hết thời gian kết nối')); try { ws.close(); } catch { /* bỏ qua */ } }, timeout);
      ws.onopen = () => { this.clearT(to); done = true; this.tries = 0; this.setStatus('open'); this.startPing(); resolve(); };
      ws.onerror = () => fail(new Error('Không kết nối được máy chủ'));
      ws.onmessage = (ev) => this.recv(ev.data);
      ws.onclose = () => { this.clearT(to); this.stopPing(); if (this.ws === ws) this.ws = null; fail(new Error('Kết nối bị đóng')); this.dropped(); };
    });
  }
  recv(data) {
    let m; try { m = JSON.parse(data); } catch { return; }
    if (m.t === 'pong') { if (m.n === this.pn) this.rtt = Math.round(performance.now() - this.pingAt); return; }
    if (m.t === 'joined') this.session = { code: m.room.code, id: m.you.id, token: m.you.token };
    if (m.t === 'res' && this.pending.has(m.id)) { const p = this.pending.get(m.id); this.pending.delete(m.id); p.cb?.(m); }
    this.onmessage?.(m);
    if (m.t === 'joined' && m.rejoined) for (const p of this.pending.values()) this.send({ t: 'cmd', id: p.id, op: p.op, ...p.args }); // gửi lại lệnh chưa có kết quả (cùng id)
  }
  send(o) { if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(o)); return true; } return false; }
  hello() { return { v: PROTOCOL_VERSION, cfg: configChecksum() }; }
  cmd(op, args = {}, cb) { const id = ++this.cmdId; this.pending.set(id, { id, op, args, cb }); this.send({ t: 'cmd', id, op, ...args }); return id; }
  startPing() { this.stopPing(); this.pingT = setInterval(() => { this.pn++; this.pingAt = performance.now(); this.send({ t: 'ping', n: this.pn }); }, 2000); this.pingT.unref?.(); }
  stopPing() { clearInterval(this.pingT); this.pingT = null; }
  dropped() {
    if (this.userClosed) return this.setStatus('closed');
    if (!this.session || !this.inGame) return this.setStatus('closed');
    if (this.retrying) return; this.retrying = true; // tránh lên lịch kết nối lại hai lần cho cùng một lần rớt
    this.setStatus('reconnecting'); this.tries++; const wait = Math.min(8000, 400 * 2 ** Math.min(this.tries, 5));
    if (this.tries > 14) { for (const p of this.pending.values()) p.cb?.({ ok: false, message: 'Mất kết nối.' }); this.pending.clear(); return this.setStatus('closed'); }
    this.retryT = this.setT(() => { this.retrying = false; this.connect().then(() => this.send({ t: 'rejoin', code: this.session.code, token: this.session.token })).catch(() => { if (!this.ws) this.dropped(); }); }, wait);
  }
  close() { this.userClosed = true; this.inGame = false; this.clearT(this.retryT); this.stopPing(); try { this.ws?.close(); } catch { /* bỏ qua */ } this.setStatus('closed'); }
}
