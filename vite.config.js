import fs from 'node:fs';
import path from 'node:path';
// Plugin PWA nhỏ: sau khi build, gắn mã bản build + danh sách file cần cache vào dist/sw.js. Không phụ thuộc thư viện ngoài.
export const walk = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => { const p = path.join(dir, d.name); return d.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join('/')]; });
export function pwaPlugin() {
  let outDir = 'dist';
  return {
    name: 'std-pwa', apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const sw = path.join(outDir, 'sw.js'); if (!fs.existsSync(sw)) return;
      const files = walk(outDir).filter((f) => f !== 'sw.js' && !f.endsWith('.map'));
      const shell = ['./', ...files.filter((f) => f !== 'index.html')]; // toàn bộ file build + sprite (~8MB) nạp sẵn để chơi offline
      const id = (process.env.BUILD_ID || Date.now().toString(36));
      fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace('__BUILD_ID__', id).replace("'__PRECACHE__'", JSON.stringify(shell)));
    },
  };
}
export default { base: './', plugins: [pwaPlugin()], build: { outDir: 'dist', chunkSizeWarningLimit: 2000 } };
