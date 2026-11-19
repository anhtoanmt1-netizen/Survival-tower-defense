import { isBlocking, isBuildableTerrain } from './tiles.js';
// Lớp truy vấn dùng chung cho người chơi, AI quái vật, kiểm tra xây tháp. `extra` = ô bị chiếm động (tháp...).
export class Grid {
  constructor(map) {
    this.width = map.width; this.height = map.height; this.tiles = map.tiles;
    this.extra = new Uint8Array(map.width * map.height); this.version = 0; // tăng mỗi khi ô bị chiếm/giải phóng => flow field tính lại
  }
  setBlocked(x, y, v) { const i = y * this.width + x; if (this.inBounds(x, y) && this.extra[i] !== (v ? 1 : 0)) { this.extra[i] = v ? 1 : 0; this.version++; } }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }
  tile(x, y) { return this.tiles[y * this.width + x]; }
  isWalkable(x, y) { return this.inBounds(x, y) && !isBlocking(this.tiles[y * this.width + x]) && !this.extra[y * this.width + x]; }
  isBuildable(x, y) { return this.inBounds(x, y) && isBuildableTerrain(this.tiles[y * this.width + x]) && !this.extra[y * this.width + x]; }
}
