import { generateMap } from '../map/index.js';
import { Mirror } from './mirror.js';
import { mapChecksum, configChecksum } from './protocol.js';
// Nối NetClient với Mirror: nhận 'start'/'snap'/'room'/'end'... và phát sự kiện cho giao diện. Dùng chung cho game và kiểm thử.
export class GameSession {
  constructor(client, hooks = {}) { this.c = client; this.mirror = null; this.room = null; this.you = null; this.sh = { ...hooks }; this.h = {}; // sh: hàm xử lý do scene gắn vào sau khi tạo
    this.hooks = Object.fromEntries(['onFree', 'onProjFree', 'onSpawn', 'onHurt', 'onDead', 'onRevive', 'onEvent', 'onTowerRemoved', 'onWallAdded', 'onWallRemoved'].map((n) => [n, (...a) => this.sh[n]?.(...a)])); client.onmessage = (m) => this.onMsg(m); }
  on(name, fn) { this.h[name] = fn; return this; }
  emit(name, ...a) { this.h[name]?.(...a); }
  onMsg(m) {
    switch (m.t) {
      case 'joined': this.you = m.you; this.room = m.room; this.emit('room', m.room, !!m.rejoined); break;
      case 'room': this.room = m.room; this.emit('room', m.room); break;
      case 'start': {
        if (m.cfg !== configChecksum()) return this.emit('fatal', 'Cấu hình game khác máy chủ. Hãy cập nhật.');
        if (!this.mirror || this.mirror.map.id !== m.mapId) {
          const map = generateMap(m.mapId); // cùng Map ID => cùng bản đồ trên mọi máy
          if (mapChecksum(map.tiles) !== m.mapSum) return this.emit('fatal', 'Bản đồ không khớp với máy chủ (khác phiên bản thuật toán).');
          this.mirror = new Mirror({ map, gateIdx: m.gates, you: m.you, players: m.players, hooks: this.hooks }); this.mirror.applyStart(m); this.c.inGame = true; this.emit('start', m, false);
        } else { this.mirror.applyStart(m); this.c.inGame = true; this.emit('start', m, true); } // vào lại phòng
        break;
      }
      case 'snap': this.mirror?.applySnapshot(m); break;
      case 'pos': this.emit('pos', m); break;
      case 'end': this.c.inGame = false; this.emit('end', m.stats); break;
      case 'err': this.emit('err', m); break;
      case 'left': this.emit('left'); break;
    }
  }
}
