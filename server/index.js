// Máy chủ multiplayer + phục vụ bản web (thư mục dist). Chạy: node server/index.js   (PORT, mặc định 8080; đường dẫn WebSocket: /ws)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachWebSocket } from './ws.js';
import { GameServer } from './gameServer.js';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.map': 'application/json' };
export function createServer({ port = 0, distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist'), log = () => {} } = {}) {
  const game = new GameServer({ log });
  const http_ = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ok: true, rooms: game.rooms.size, sessions: game.sessions.size })); }
    let file = path.join(distDir, path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(distDir)) { res.writeHead(403); return res.end(); }
    if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Chưa có bản build web: chạy `npm run build` rồi khởi động lại máy chủ.'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }); res.end(data);
    });
  });
  attachWebSocket(http_, { path: '/ws', onConnection: (conn) => game.connect(conn) });
  return { http: http_, game, listen: () => new Promise((r) => http_.listen(port, () => { game.start(); r(http_.address().port); })), close: () => { game.stop(); http_.closeAllConnections?.(); http_.close(); } };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const s = createServer({ port: Number(process.env.PORT) || 8080, log: (...a) => console.error(...a) });
  s.listen().then((p) => console.log(`Survival Tower Defense server: http://localhost:${p}  (ws path /ws)`));
}
