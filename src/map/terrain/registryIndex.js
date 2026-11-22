import { REGISTRY } from './registry.js';
// Tra cứu Asset Registry + quy tắc kết nối theo cạnh (edges) và nhóm.
export const ASSETS = REGISTRY, BY_ID = Object.fromEntries(REGISTRY.map((a) => [a.id, a]));
export const byGroup = (g) => REGISTRY.filter((a) => a.group === g), bySub = (s) => REGISTRY.filter((a) => a.sub === s);
export const asset = (id) => { const a = BY_ID[id]; if (!a) throw new Error('Asset không có trong registry: ' + id); return a; };
// Hai nhãn cạnh có thể ghép nhau? ('grass|sand' = chấp nhận cả hai; 'any' = mọi loại)
export const edgeMatches = (label, kind) => label === 'any' || kind === 'any' || label.split('|').includes(kind);
// Từ ô thực tế suy ra loại cạnh để đối chiếu với metadata sprite
export const ASSET_MANIFEST = REGISTRY.map((a) => [a.id, a.src]);
