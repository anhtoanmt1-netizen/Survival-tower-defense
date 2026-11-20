// WebSocket server tối giản (RFC 6455) chỉ dùng module có sẵn của Node: không cần cài thêm gói.
// Hỗ trợ: handshake, khung văn bản (kể cả phân mảnh), ping/pong, close, giới hạn kích thước, chống client chậm.
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
function frame(op, payload) {
  const len = payload.length; let h;
  if (len < 126) h = Buffer.from([0x80 | op, len]);
  else if (len < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(len, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([h, payload]);
}
export class WSConnection extends EventEmitter {
  constructor(socket, maxPayload) {
    super(); this.socket = socket; this.max = maxPayload; this.buf = Buffer.alloc(0); this.open = true; this.frags = null; this.fragLen = 0;
    socket.setNoDelay(true);
    socket.on('data', (d) => this.onData(d)); socket.on('close', () => this.finish()); socket.on('error', () => this.finish());
  }
  send(str) {
    if (!this.open) return false;
    if (this.socket.writableLength > 2 * 1024 * 1024) { this.close(1008); return false; } // client quá chậm
    this.socket.write(frame(0x1, Buffer.from(str, 'utf8'))); return true;
  }
  close(code = 1000) {
    if (!this.open) return; const b = Buffer.alloc(2); b.writeUInt16BE(code);
    try { this.socket.write(frame(0x8, b)); this.socket.end(); } catch { /* đã đóng */ } this.finish();
  }
  finish() { if (!this.open) return; this.open = false; this.emit('close'); }
  onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      if (this.buf.length < 2) return;
      const b0 = this.buf[0], b1 = this.buf[1], fin = !!(b0 & 0x80), op = b0 & 0x0f, masked = !!(b1 & 0x80); let len = b1 & 0x7f, off = 2;
      if (!masked) return this.close(1002); // client bắt buộc che (mask) dữ liệu
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; const big = this.buf.readBigUInt64BE(2); if (big > BigInt(this.max)) return this.close(1009); len = Number(big); off = 10; }
      if (len > this.max) return this.close(1009);
      if (this.buf.length < off + 4 + len) return;
      const mask = this.buf.subarray(off, off + 4), data = Buffer.from(this.buf.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < len; i++) data[i] ^= mask[i & 3];
      this.buf = this.buf.subarray(off + 4 + len);
      if (op === 0x8) { this.close(1000); return; }
      if (op === 0x9) { this.socket.write(frame(0xa, data)); continue; }
      if (op === 0xa) continue;
      if (op === 0x1 || op === 0x0) {
        if (op === 0x1) { this.frags = []; this.fragLen = 0; } if (!this.frags) return this.close(1002);
        this.frags.push(data); this.fragLen += data.length; if (this.fragLen > this.max) return this.close(1009);
        if (fin) { const msg = Buffer.concat(this.frags).toString('utf8'); this.frags = null; this.emit('message', msg); }
      } // nhị phân/khác: bỏ qua
    }
  }
}
export function attachWebSocket(httpServer, { path = '/ws', maxPayload = 16 * 1024, onConnection }) {
  httpServer.on('upgrade', (req, socket) => {
    const url = new URL(req.url, 'http://x'), key = req.headers['sec-websocket-key'];
    if (url.pathname !== path || !key || String(req.headers.upgrade).toLowerCase() !== 'websocket') { socket.destroy(); return; }
    const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    onConnection(new WSConnection(socket, maxPayload), req);
  });
}
