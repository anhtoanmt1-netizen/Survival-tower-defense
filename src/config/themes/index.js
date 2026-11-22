import { forest } from './forest.js';
import { TERRAIN_THEMES } from '../../map/terrain/themes.js';
// FOREST: chủ đề cũ (edition 2026/2027). 7 chủ đề mới (edition 2028) lấy từ map/terrain/themes.js.
export const THEMES = { FOREST: forest, ...Object.fromEntries(Object.entries(TERRAIN_THEMES).map(([k, t]) => [k, { id: k, name: t.vi, minimap: t.minimap }])) };
export const DEFAULT_THEME = 'FOREST';
