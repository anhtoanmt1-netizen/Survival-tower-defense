// Bot cân bằng: người chơi giả ĐỨNG YÊN ở giữa, tự xây/nâng tháp. Là cận dưới (người thật còn chạy, dùng kỹ năng).
// Chạy: node tools/balance.mjs [seed] [maxTowers] [strategy]
import { generateMap } from '../src/map/index.js';
import { formatMapId } from '../src/map/mapId.js';
import { Grid } from '../src/map/grid.js';
import { MonsterWorld } from '../src/sim/world.js';
import { WaveDirector } from '../src/sim/director.js';
import { TowerSystem } from '../src/sim/towers.js';
import { Economy } from '../src/sim/economy.js';
import { findPath } from '../src/core/pathfinding.js';
import { mulberry32 } from '../src/core/rng.js';
import { waveSpec } from '../src/config/waves.js';
const seed = +(process.argv[2] || 1), maxTowers = +(process.argv[3] || 16), strat = process.argv[4] || 'mix';
const m = generateMap(formatMapId({ theme: 'FOREST', edition: 2026, seed: seed * 104729 & 0x3fffffff })), grid = new Grid(m), rng = mulberry32(seed), eco = new Economy();
let hp = 3, inv = 0, leaks = 0; const p = { x: m.playerStart.x + 0.5, y: m.playerStart.y + 0.5, r: 0.3, dead: false, takeDamage() { if (inv > 0 || this_dead()) return false; leaks++; if (process.env.IMMORTAL) { inv = 1.2; return false; } hp--; inv = 1.2; if (hp <= 0) p.dead = true; return true; } };
const this_dead = () => p.dead;
const world = new MonsterWorld(grid, { onKill: (mo) => eco.add(mo.reward) }, rng);
const gate = m.gates[+(process.argv[5] || 0)], ts = new TowerSystem({ grid, world, economy: eco, gates: [gate], rng });
const dir = new WaveDirector({ grid, world, gates: [gate], rng });
const path = findPath(grid, gate.x, gate.y, m.playerStart.x, m.playerStart.y);
const cands = []; // ô quanh đường đi, cách người chơi 4..16 ô
for (let i = 0; i < path.length; i++) { const d = path.length - i; if (d < 4 || d > 18) continue; for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) { const x = path[i].x + dx, y = path[i].y + dy; if (Math.abs(dx) + Math.abs(dy) >= 2 && !cands.some((c) => c.x === x && c.y === y)) cands.push({ x, y }); } }
cands.sort((a, b) => Math.hypot(a.x - m.playerStart.x, a.y - m.playerStart.y) - Math.hypot(b.x - m.playerStart.x, b.y - m.playerStart.y));
const picks = strat === 'volley' ? ['volley'] : strat === 'burn' ? ['burn'] : ['volley', 'burn', 'frost', 'volley', 'burn', 'volley'];
function act() {
  for (let guard = 0; guard < 6; guard++) {
    for (const t of ts.towers) if (t.state === 'ready' && t.pending > 0) ts.pickBranch(t, picks[t.picks.length % picks.length]);
    const cost = ts.buildCost(), ready = ts.towers.filter((t) => t.state === 'ready');
    if (ts.towers.length < Math.min(maxTowers, 2 + Math.floor(dir.wave / 4)) && eco.gold >= cost) { const c = cands.find((c) => ts.checkPlacement(c.x, c.y, [p], { ignoreGold: true }).ok); if (c && ts.build(c.x, c.y, [p]).ok) continue; }
    const up = ready.filter((t) => t.pending === 0 && ts.upgradeInfo(t).ok).sort((a, b) => a.level - b.level)[0];
    if (up && eco.gold >= ts.upgradeInfo(up).cost) { ts.upgrade(up); continue; }
    break;
  }
}
const dt = 1 / 20; let t = 0, nextAct = 0, lastRep = 0, cleared = false;
while (t < 3300 && !p.dead) {
  t += dt; inv = Math.max(0, inv - dt); dir.update(dt); world.update(dt, [p]); ts.update(dt); eco.update(dt, ts.towers.length, ts.buildCost());
  if (t >= nextAct) { nextAct = t + 0.5; act(); }
  if (dir.wave >= 100 && dir.queue.length === 0 && world.active === 0) { cleared = true; break; }
  if (dir.wave >= lastRep + 10 || (dir.wave === 1 && lastRep === 0)) { lastRep = dir.wave; const lv = ts.towers.map((x) => x.level); console.log(`đợt ${dir.wave} t=${t | 0}s | HP ${hp} rò rỉ ${leaks} | vàng ${eco.gold} | tháp ${ts.towers.length} (LV TB ${(lv.reduce((a, b) => a + b, 0) / (lv.length || 1)).toFixed(1)}) | quái ${world.active}+${dir.queue.length}chờ | đã diệt ${world.kills}`); }
}
console.log(cleared ? `THẮNG đợt 100 lúc ${t | 0}s` : p.dead ? `THUA ở đợt ${dir.wave} lúc ${t | 0}s (quái còn ${world.active}+${dir.queue.length})` : `hết thời gian ở đợt ${dir.wave}`);
