import { WAVE_SETTINGS, waveSpec } from '../config/waves.js';
import { MONSTER_SETTINGS } from '../config/slimes.js';
// Chọn `count` cổng từ 8 vị trí, rải xa nhau (farthest-point), điểm đầu chọn ngẫu nhiên theo rng.
export function selectGates(gates, count, rng) {
  const n = Math.max(1, Math.min(8, count)), pick = [Math.floor(rng() * gates.length)];
  while (pick.length < n) {
    let best = -1, bd = -1;
    gates.forEach((g, i) => { if (pick.includes(i)) return; const d = Math.min(...pick.map((j) => (g.x - gates[j].x) ** 2 + (g.y - gates[j].y) ** 2)); if (d > bd) { bd = d; best = i; } });
    pick.push(best);
  }
  return pick.map((i) => gates[i]);
}
// Vị trí xuất hiện ngẫu nhiên trong vùng 5x5 của cổng; chỉ ô đi được (không cây/đá/sông/tháp).
export function randomSpawnCell(grid, gate, rng, radius = 2) {
  for (let t = 0; t < 40; t++) {
    const x = gate.x + Math.floor(rng() * (2 * radius + 1)) - radius, y = gate.y + Math.floor(rng() * (2 * radius + 1)) - radius;
    if (grid.isWalkable(x, y)) return { x: x + 0.5, y: y + 0.5 };
  }
  return { x: gate.x + 0.5, y: gate.y + 0.5 };
}
function pickType(weights, rng) {
  const e = Object.entries(weights).filter(([, w]) => w > 0), sum = e.reduce((a, [, w]) => a + w, 0); let r = rng() * sum;
  for (const [t, w] of e) { r -= w; if (r <= 0) return t; } return e[e.length - 1][0];
}
// Đợt tự bắt đầu theo đồng hồ, KHÔNG cần diệt hết đợt trước. Hết giới hạn đồng thời => xếp hàng chờ, không xóa quái cũ.
export class WaveDirector {
  constructor({ grid, world, gates, rng, settings = WAVE_SETTINGS, maxActive = MONSTER_SETTINGS.maxActive }) {
    Object.assign(this, { grid, world, gates, rng, settings, maxActive });
    this.wave = 0; this.countdown = settings.firstWaveDelay; this.queue = []; this.acc = 0; this.spawned = 0; this.finishedSpawning = false;
  }
  startWave() {
    this.wave++; const s = waveSpec(this.wave);
    for (let i = 0; i < s.count; i++) this.queue.push({ type: pickType(s.weights, this.rng), hpMul: s.hpMul, speedMul: s.speedMul });
    this.countdown = this.wave >= this.settings.totalWaves ? Infinity : this.settings.interval; this.currentSpec = s;
  }
  queueDebug(n) { for (let i = 0; i < n; i++) this.queue.push({ type: 'green', hpMul: 1, speedMul: 1 }); }
  update(dt) {
    this.countdown -= dt; if (this.countdown <= 0 && this.wave < this.settings.totalWaves) this.startWave();
    this.acc += dt * this.settings.spawnPerSecond;
    while (this.acc >= 1 && this.queue.length && this.world.active < this.maxActive) {
      this.acc -= 1; const q = this.queue.shift(), g = this.gates[this.spawned++ % this.gates.length], p = randomSpawnCell(this.grid, g, this.rng);
      this.world.spawn(q.type, p.x, p.y, q.hpMul, q.speedMul, q.rewardMul);
    }
    if (this.acc > 1) this.acc = 1;
  }
}
