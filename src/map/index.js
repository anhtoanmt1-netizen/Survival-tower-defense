import { EDITIONS, CURRENT_EDITION } from './generators/index.js';
import { parseMapId, formatMapId, randomSeed } from './mapId.js';
import { validateMap } from './validate.js';
import { DEFAULT_THEME } from '../config/themes/index.js';
export function newRandomMapId(theme = DEFAULT_THEME, size) {
  return formatMapId({ theme, edition: CURRENT_EDITION, seed: randomSeed(), size });
}
// Cùng Map ID => cùng bản đồ (từng bit), trên mọi thiết bị.
export function generateMap(mapIdString) {
  const p = parseMapId(mapIdString);
  if (!p.ok) throw new Error(p.error);
  const base = EDITIONS[p.edition].generators[p.theme]({ seed: p.seed, size: p.size });
  const map = { ...base, id: p.id, theme: p.theme, edition: p.edition, seed: p.seed };
  const v = validateMap(map);
  if (!v.ok) throw new Error('Bản đồ không hợp lệ: ' + v.errors.join(' '));
  map.stats = v.stats;
  return map;
}
export { parseMapId, formatMapId };
