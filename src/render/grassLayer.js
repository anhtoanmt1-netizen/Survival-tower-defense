import { GAME_CONFIG } from '../config/gameConfig.js';
import { VISUAL } from '../config/visual.js';
import { GRASS_SPRITES } from '../config/art.js';
import { GrassPlanner, GRASS_CHUNK, GRASS_TILE } from '../map/grassPlan.js';
import { perf } from '../systems/Perf.js';
// CỎ từ tài nguyên grass.png (9 cụm cắt sẵn: public/assets/grass/grass_0..8.png). Bố trí theo cụm tự nhiên ở map/grassPlan.js (thuần logic, tất định theo Map ID).
// Hiệu năng: chỉ tạo sprite cho các khối 8x8 ô trong khung nhìn (hồ chứa + giới hạn theo chế độ hiệu năng); gió là hàm của thời gian (cập nhật thưa theo nhịp perf, không cộng dồn lỗi);
// nghiêng khi nhân vật bước qua chỉ duyệt các búi GẦN nhân vật, búi vừa bị đẩy được theo dõi riêng để trả về dần rồi thôi xử lý.
const TS = GAME_CONFIG.tileSize;
export const GRASS_KEYS = Array.from({ length: GRASS_SPRITES }, (_, i) => `grass_img_${i}`);
export const createGrassTextures = () => {}; // cỏ dùng ảnh nạp sẵn (preloadWorldAssets); giữ tên hàm để GameScene/NetGameScene không đổi
const ORIGIN_Y = 0.88;                     // chân búi cỏ nằm ở 88% chiều cao ảnh (phần viền dưới là rìa lá)
export class GrassLayer {
  constructor(scene, map, density = 1) {
    this.scene = scene; this.map = map; this.plan = new GrassPlanner(map); this.chunks = new Map(); this.t = 0; this.animated = true; this.bending = new Set(); this.pool = [];
    this.keyOf = (id) => id; this.view = null; this.keep = 1; this.density = density; this.accDt = 0; this.setQuality(); this.lastPerf = perf.p.id;
  }
  // tỉ lệ búi được giữ (làm thưa theo rank, ổn định giữa các khung): chế độ cao = 1, tiết kiệm ≈ 0,4 – cụm vẫn giữ hình dạng, chỉ thưa dần
  setQuality() { const base = perf.p.grassTufts / VISUAL.grass.maxTufts; this.keep = Math.max(0.25, Math.min(1, base)) * Math.min(1, this.density); }
  makeChunk(cx, cy) {
    const list = [], tufts = this.plan.chunk(cx, cy);
    for (const q of tufts) {
      if (q.rank > this.keep) continue;
      const s = (this.pool.pop() || this.scene.add.image(0, 0, this.keyOf('grass_img_0'))).setTexture(this.keyOf(`grass_img_${q.v}`)).setVisible(true).setOrigin(0.5, ORIGIN_Y).setPosition(q.x, q.y).setDepth(q.y).setScale(q.sc * (q.flip ? -1 : 1), q.sc).setRotation(0);
      list.push({ ...q, s, b: 0, sy: q.sc });
    }
    return list;
  }
  dropChunk(k) { const l = this.chunks.get(k); if (!l) return; for (const q of l) { q.s.setVisible(false); this.pool.push(q.s); this.bending.delete(q); } this.chunks.delete(k); }
  rebuild() { for (const k of [...this.chunks.keys()]) this.dropChunk(k); this.rect = null; }
  // Cập nhật theo camera/người chơi. animate=false => cỏ tĩnh. player: {x,y} theo ô, null khi tạm dừng (cỏ vẫn đung đưa theo gió).
  update(dt, cam, player, animate) {
    if (this.lastPerf !== perf.p.id) { this.lastPerf = perf.p.id; this.setQuality(); this.rebuild(); }
    const v = cam.worldView, CW = GRASS_CHUNK * TS, W = this.plan.chunksX, H = this.plan.chunksY, G = VISUAL.grass;
    const x0 = Math.max(0, Math.floor(v.left / CW) - 0), x1 = Math.min(W - 1, Math.floor(v.right / CW)), y0 = Math.max(0, Math.floor(v.top / CW) - 0), y1 = Math.min(H - 1, Math.floor((v.bottom + 40) / CW));
    const r = this.rect;
    if ((x1 - x0 + 1) * (y1 - y0 + 1) <= perf.p.grassCells / (GRASS_CHUNK * GRASS_CHUNK) * 4 && (!r || r[0] !== x0 || r[1] !== x1 || r[2] !== y0 || r[3] !== y1)) {
      for (const k of [...this.chunks.keys()]) { const x = k % W, y = (k / W) | 0; if (x < x0 - 1 || x > x1 + 1 || y < y0 - 1 || y > y1 + 1) this.dropChunk(k); }
      for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) { if (x < 0 || y < 0 || x >= W || y >= H) continue; const k = y * W + x; if (!this.chunks.has(k)) this.chunks.set(k, this.makeChunk(x, y)); }
      this.rect = [x0, x1, y0, y1];
    }
    this.t += dt; this.accDt += dt;
    if (!animate) { if (this.animated) { for (const l of this.chunks.values()) for (const q of l) { q.s.rotation = 0; q.s.scaleY = q.sc; q.b = 0; } this.bending.clear(); this.animated = false; } return; }
    this.animated = true; if (!perf.due(1)) return; // khung này bỏ qua cập nhật cỏ (gió là hàm của thời gian nên không giật khi bỏ khung); dt được cộng dồn
    const step = this.accDt; this.accDt = 0; const t = this.t, windDir = G.windDir ?? 0.35;
    // 1) gió: sóng chạy ngang qua bản đồ (pha theo toạ độ) + nhịp riêng của từng cụm (amp, spd, ph); chỉ búi trong khung nhìn
    const wx = Math.cos(windDir), wy = Math.sin(windDir), gust = 0.65 + 0.35 * Math.sin(t * 0.37);
    for (const l of this.chunks.values()) for (const q of l) { const wave = Math.sin(t * 1.25 * q.spd - (q.x * wx + q.y * wy) * 0.012 + q.ph * 0.3) * G.wind * gust * q.amp + Math.sin(t * 2.6 * q.spd + q.ph) * G.gust * q.amp; q.wind = wave; if (!this.bending.has(q)) q.s.rotation = wave; }
    // 2) tương tác nhân vật: chỉ các búi trong bán kính; búi đang nghiêng nhưng đã ra xa thì trả về dần rồi bỏ khỏi danh sách
    const px = player ? player.x * TS : -1e9, py = player ? player.y * TS : -1e9, R = G.bendRadius, R2 = R * R, k1 = Math.min(1, step * 14), k2 = Math.min(1, step * 5);
    if (player) { const pcx = Math.floor(px / CW), pcy = Math.floor(py / CW);
      for (let cy = pcy - 1; cy <= pcy + 1; cy++) for (let cx = pcx - 1; cx <= pcx + 1; cx++) { const l = this.chunks.get(cy * W + cx); if (!l) continue;
        for (const q of l) { const dx = q.x - px, dy = (q.y - py) * 1.4, d2 = dx * dx + dy * dy; if (d2 < R2) { const d = Math.sqrt(d2), f = 1 - d / R; q.target = Math.sign(dx || 1) * f * G.bendMax; q.b += (q.target - q.b) * k1; this.bending.add(q); } } } }
    for (const q of this.bending) {
      const dx = q.x - px, dy = (q.y - py) * 1.4; if (!(dx * dx + dy * dy < R2)) q.b += (0 - q.b) * k2;
      if (Math.abs(q.b) < 0.004 && !(dx * dx + dy * dy < R2)) { q.b = 0; q.s.rotation = q.wind || 0; q.s.scaleY = q.sc; this.bending.delete(q); continue; }
      q.s.rotation = (q.wind || 0) + q.b; q.s.scaleY = q.sc * (1 - 0.14 * Math.min(1, Math.abs(q.b) / G.bendMax)); // bị giẫm: nghiêng + hơi dẹp
    }
  }
  regrade(grader, g) { this.keyOf = (id) => grader.keyOf(id, g); for (const l of this.chunks.values()) for (const q of l) q.s.setTexture(this.keyOf(`grass_img_${q.v}`)); for (const s of this.pool) s.setTexture(this.keyOf('grass_img_0')); }
  destroy() { for (const k of [...this.chunks.keys()]) this.dropChunk(k); for (const s of this.pool) s.destroy(); this.pool.length = 0; this.bending.clear(); }
}
