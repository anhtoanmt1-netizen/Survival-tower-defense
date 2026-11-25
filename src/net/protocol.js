import { SLIMES, SLIME_TYPES, MONSTER_SETTINGS } from '../config/slimes.js';
import { WAVE_SETTINGS, waveSpec } from '../config/waves.js';
import { TOWER_TYPES, BRANCHES } from '../config/towers.js';
import { ECON } from '../config/economy.js';
import { SKILLS, SPEED_UPGRADE } from '../config/skills.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
export const PROTOCOL_VERSION = 2; // 2: thêm tường (lệnh wall/sellwall, sự kiện 'wl', trường walls trong 'start')
export const MAX_PLAYERS = 8;
export const TICK_RATE = 20;               // server mô phỏng + gửi snapshot 20 lần/giây
export const RECONNECT_GRACE = 60;         // giây giữ chỗ người chơi mất kết nối
export const RESPAWN_TIME = 15;            // giây hồi sinh (nếu phòng bật hồi sinh)
export const KINDS = ['arrow', 'ice', 'fire'];
export const TYPES = SLIME_TYPES;
export const PALETTE = GAME_CONFIG.shirtColors; // 8 màu = 8 người, không trùng
const fnv = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
// Băm cấu hình cân bằng: máy khách và máy chủ phải cùng phiên bản game thì mới chơi chung
export function configChecksum() {
  return fnv(JSON.stringify([SLIMES, MONSTER_SETTINGS, WAVE_SETTINGS, [1, 25, 50, 100].map(waveSpec), TOWER_TYPES, BRANCHES, ECON, SKILLS, SPEED_UPGRADE, GAME_CONFIG.player, PROTOCOL_VERSION])).toString(16);
}
export function mapChecksum(tiles) { let h = 0x811c9dc5; for (let i = 0; i < tiles.length; i++) { h ^= tiles[i]; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }
export const cleanName = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, GAME_CONFIG.player.maxNameLength) || 'Nông dân';
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ ký tự dễ nhầm I,O,0,1
export const normalizeCode = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1').slice(0, 6);
export const num = (v, lo, hi, def = 0) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def);
