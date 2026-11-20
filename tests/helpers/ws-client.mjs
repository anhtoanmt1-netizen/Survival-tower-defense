// WebSocket client dự phòng cho test khi Node không có WebSocket toàn cục (Node 20). API giống trình duyệt: onopen/onmessage/onclose/onerror, send, close, readyState.
import http from 'node:http';
import crypto from 'node:crypto';
export class NodeWebSocket {
  constructor(url) {
    this.readyState = 0; this.onopen = this.onmessage = this.onclose = this.onerror = null; this.buf = Buffer.alloc(0);
    const u = new URL(url), key = crypto.randomBytes(16).toString('base64');
    const req = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Key': key, 'Sec-WebSocket-Version': '13' } });
    req.on('upgrade', (res, socket, head) => {
      const want = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
      if (res.headers['sec-websocket-accept'] !== want) { socket.destroy(); this.onerror?.({}); return this.fin(); }
      this.socket = socket; this.readyState = 1; socket.on('data', (d) => this.parse(d)); socket.on('close', () => this.fin()); socket.on('error', () => {});
      this.onopen?.({}); if (head.length) this.parse(head);
    });
    req.on('response', () => { this.onerror?.({}); this.fin(); });
    req.on('error', () => { this.onerror?.({}); this.fin(); });
    req.end();
  }
  frame(op, payload) {
    const len = payload.length, mask = crypto.randomBytes(4); let h;
    if (len < 126) h = Buffer.from([0x80 | op, 0x80 | len]); else if (len < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 0x80 | 126; h.writeUInt16BE(len, 2); } else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 0x80 | 127; h.writeBigUInt64BE(BigInt(len), 2); }
    const body = Buffer.from(payload); for (let i = 0; i < len; i++) body[i] ^= mask[i & 3];
    return Buffer.concat([h, mask, body]);
  }
  send(str) { if (this.readyState === 1) this.socket.write(this.frame(0x1, Buffer.from(str, 'utf8'))); }
  close() { if (this.readyState !== 1) return; try { this.socket.write(this.frame(0x8, Buffer.alloc(0))); this.socket.end(); } catch { /* đã đóng */ } }
  parse(d) {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      if (this.buf.length < 2) return; const op = this.buf[0] & 0x0f; let len = this.buf[1] & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; } else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (this.buf.length < off + len) return; const data = this.buf.subarray(off, off + len); this.buf = this.buf.subarray(off + len);
      if (op === 0x1) this.onmessage?.({ data: data.toString('utf8') }); else if (op === 0x8) { this.close(); this.fin(); return; } else if (op === 0x9) this.socket.write(this.frame(0xa, data));
    }
  }
  fin() { if (this.readyState === 3) return; this.readyState = 3; this.onclose?.({}); }
}
