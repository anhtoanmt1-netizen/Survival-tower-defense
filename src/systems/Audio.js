import { settings } from '../config/settings.js';
// Âm thanh tổng hợp bằng WebAudio (không cần file mp3 -> chạy offline trong APK, nhẹ).
// BỐN NHÓM âm lượng độc lập, mỗi nhóm một bus + bật/tắt + âm lượng riêng (lưu trong settings.audio):
//   ambient (nhạc nền, âm thanh môi trường, giao diện/sự kiện hệ thống) · tower (xây, nâng cấp, bắn, trúng đòn) · monster (xuất hiện, chết, tấn công, vàng rơi) · character (bước chân, Dash, kỹ năng, nhận sát thương)
// Gọi audio.unlock() trong sự kiện chạm đầu tiên (trình duyệt/Android yêu cầu), sau đó audio.play('tên') ở mọi nơi.
const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);
// Tiến trình hợp âm (La thứ): Am – F – C – G, mỗi hợp âm 1 ô nhịp = 8 bước móc đơn.
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]], ROOTS = [33, 29, 36, 31];
const ARP = [0, 2, 1, 2, 0, 1, 2, 1], LEAD = [0, -1, 2, -1, 1, -1, 2, 1];
// minGap: giãn cách tối thiểu (ms) giữa hai lần phát cùng một âm -> nhiều tháp bắn cùng lúc không thành tiếng ồn.
const GAP = { shoot_arrow: 55, shoot_ice: 55, shoot_fire: 55, hit: 45, crit: 60, slime_die: 50, slime_spawn: 140, slime_attack: 120, coin: 70, click: 30, warn: 200, footstep: 70, dash: 120 };
export const GROUPS = ['ambient', 'tower', 'monster', 'character'];
// Mỗi hiệu ứng thuộc đúng MỘT nhóm. Âm giao diện (bấm, mở/đóng bảng) và tiếng báo đợt/thắng/thua thuộc ambient.
export const SFX_GROUP = {
  click: 'ambient', open: 'ambient', close: 'ambient', error: 'ambient', warn: 'ambient', wave_start: 'ambient', wave_boss: 'ambient', win: 'ambient', lose: 'ambient',
  sell: 'tower', build_start: 'tower', build_done: 'tower', upgrade: 'tower', evolve: 'tower', pick: 'tower', shoot_arrow: 'tower', shoot_ice: 'tower', shoot_fire: 'tower', hit: 'tower', crit: 'tower',
  coin: 'monster', slime_die: 'monster', slime_spawn: 'monster', slime_attack: 'monster',
  footstep: 'character', dash: 'character', dash_ready: 'character', speed: 'character', player_hurt: 'character', player_die: 'character', skill_invincible: 'character', skill_phase: 'character', phase_end: 'character',
};
// Cấu hình âm lượng thực của một nhóm (thuần, kiểm thử được): ambient dùng khóa cũ music/musicVol để không mất cài đặt của người chơi.
export const groupSetting = (a, g) => (g === 'ambient' ? { on: a.music, vol: a.musicVol } : { on: a[g], vol: a[g + 'Vol'] });

class AudioSystem {
  constructor() {
    this.ctx = null; this.last = {}; this.voices = 0; this.musicMode = null; this.step = 0; this.next = 0; this.timer = null; this.intensity = 0;
    settings.on((d, keys) => { if (keys.includes('audio')) this.apply(); });
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!this.ctx) return; document.hidden ? this.ctx.suspend() : this.ctx.resume(); });
  }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; const c = (this.ctx = new AC());
      this.master = c.createGain(); this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 4;
      this.musicBus = c.createGain(); this.bus = { ambient: c.createGain(), tower: c.createGain(), monster: c.createGain(), character: c.createGain() }; this.sfxBus = this.bus.ambient; this.curBus = this.sfxBus;
      this.musicBus.connect(this.master); for (const g of GROUPS) this.bus[g].connect(this.master); this.master.connect(this.comp); this.comp.connect(c.destination);
      const len = c.sampleRate; this.noiseBuf = c.createBuffer(1, len, c.sampleRate); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.apply();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.wantMusic && !this.timer) this.setMusic(this.wantMusic);
  }
  apply() {
    if (!this.ctx) return; const a = settings.data.audio, t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(a.music ? a.musicVol * 0.55 : 0, t, 0.05); // nhạc nền (ambient)
    for (const g of GROUPS) { const q = groupSetting(a, g); this.bus[g].gain.setTargetAtTime(q.on ? q.vol : 0, t, 0.05); } // mỗi nhóm một bus riêng: chỉnh nhóm này không đụng nhóm khác
    if (this.ambience) this.ambience.gain.gain.setTargetAtTime(a.music ? a.musicVol * 0.5 : 0, t, 0.2);
  }
  // ---------- phần tử cơ bản ----------
  tone({ type = 'sine', f0, f1 = f0, dur = 0.15, vol = 0.3, at = 0, attack = 0.005, bus = this.curBus, lp = 0, vib = 0 }) {
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain(); let out = g;
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; g.connect(f); out = f; }
    if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 6; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    out.connect(bus); o.start(t); o.stop(t + dur + 0.05); this.voices++; o.onended = () => this.voices--;
  }
  noise({ f0, f1 = f0, q = 1, type = 'bandpass', dur = 0.12, vol = 0.3, at = 0, bus = this.curBus }) {
    const c = this.ctx, t = c.currentTime + at, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); this.voices++; s.onended = () => this.voices--;
  }
  // ---------- hiệu ứng ----------
  play(name, o = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const grp = SFX_GROUP[name] || 'ambient', q = groupSetting(settings.data.audio, grp); if (!q.on || q.vol <= 0) return; // nhóm tắt: không tạo nút âm thanh nào
    const now = performance.now(), gap = GAP[name] ?? 0; if (gap && now - (this.last[name] || 0) < gap) return; this.last[name] = now;
    if (this.voices > 40) return; const fn = SFX[name]; if (!fn) return; const p = (o.pitch ?? 1) * (1 + (Math.random() - 0.5) * 0.08);
    try { this.curBus = this.bus[grp]; fn(this, p, o.vol ?? 1); } catch { /* âm thanh không bao giờ được làm sập game */ }
  }
  // ---------- âm thanh môi trường: gió nhẹ qua cỏ (một nguồn nhiễu lặp + bộ lọc + dao động chậm, gần như không tốn CPU) ----------
  startAmbience() {
    if (!this.ctx || this.ambience) return; const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    src.buffer = this.noiseBuf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.6; g.gain.value = 0; lfo.frequency.value = 0.11; lg.gain.value = 0.014; lfo.connect(lg); lg.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(this.musicBus); src.start(); lfo.start(); this.ambience = { src, lfo, gain: g, base: 0.03 }; this.apply(); g.gain.setTargetAtTime(0.03, c.currentTime, 0.8);
  }
  stopAmbience() { const a = this.ambience; if (!a) return; this.ambience = null; try { a.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3); setTimeout(() => { a.src.stop(); a.lfo.stop(); }, 1200); } catch { /* đã dừng */ } }
  // ---------- nhạc nền: chuỗi hợp âm + bass + arpeggio + trống, cường độ tăng theo trận ----------
  setMusic(mode) { // 'menu' | 'calm' | 'battle' | null
    this.wantMusic = mode; this.musicMode = mode; this.intensity = mode === 'battle' ? 1 : mode === 'calm' ? 0.5 : 0;
    if (!this.ctx) return; if (!mode) { clearInterval(this.timer); this.timer = null; return; }
    if (!this.timer) { this.step = 0; this.next = this.ctx.currentTime + 0.1; this.timer = setInterval(() => this.schedule(), 80); }
  }
  stopMusic(fade = 0.8) {
    this.wantMusic = null; this.musicMode = null; clearInterval(this.timer); this.timer = null;
    if (this.ctx) { const g = this.musicBus.gain, t = this.ctx.currentTime; g.cancelScheduledValues(t); g.setTargetAtTime(0, t, fade / 3); setTimeout(() => this.apply(), fade * 1000 + 200); }
  }
  schedule() {
    const c = this.ctx; if (!c || c.state !== 'running') { if (c) this.next = Math.max(this.next, c.currentTime); return; }
    const spb = 60 / (this.musicMode === 'battle' ? 112 : this.musicMode === 'calm' ? 96 : 80) / 2; // giây / bước móc đơn
    while (this.next < c.currentTime + 0.3) { this.note(this.step, this.next - c.currentTime, spb); this.step++; this.next += spb; }
  }
  note(step, at, spb) {
    const bar = Math.floor(step / 8) % 4, s = step % 8, ch = CHORDS[bar], I = this.intensity, bus = this.musicBus;
    if (s === 0) for (const n of ch) this.tone({ type: 'triangle', f0: MIDI(n), dur: spb * 8.2, vol: 0.09, at, attack: spb * 2.2, bus, lp: 1400 }); // pad
    if (s % 4 === 0 || (I > 0.7 && s % 2 === 0)) this.tone({ type: 'sine', f0: MIDI(ROOTS[bar]), dur: spb * 1.8, vol: I > 0.7 ? 0.24 : 0.2, at, bus, lp: 500 }); // bass
    if (I > 0.3 || s % 2 === 0) this.tone({ type: 'triangle', f0: MIDI(ch[ARP[s]] + 12), dur: spb * 1.4, vol: 0.075, at, bus, lp: 3000 }); // arpeggio
    if (I > 0.45 && LEAD[s] >= 0 && bar % 2 === 1) this.tone({ type: 'sine', f0: MIDI(ch[LEAD[s]] + 24), dur: spb * 2, vol: 0.06, at, bus, vib: 4 }); // giai điệu cao
    if (I > 0.7) {
      if (s % 4 === 0) { this.tone({ type: 'sine', f0: 140, f1: 45, dur: 0.16, vol: 0.34, at, bus }); }
      if (s % 4 === 2) this.noise({ f0: 1800, q: 0.7, dur: 0.1, vol: 0.12, at, bus });
      if (s % 2 === 1) this.noise({ f0: 8000, type: 'highpass', dur: 0.04, vol: 0.05, at, bus });
    }
  }
}

const T = (a, o) => a.tone(o), N = (a, o) => a.noise(o);
const SFX = {
  click: (a, p, v) => T(a, { type: 'sine', f0: 880 * p, f1: 620 * p, dur: 0.07, vol: 0.22 * v }),
  open: (a, p, v) => { T(a, { type: 'triangle', f0: 520 * p, dur: 0.1, vol: 0.22 * v }); T(a, { type: 'triangle', f0: 780 * p, dur: 0.14, vol: 0.2 * v, at: 0.06 }); },
  close: (a, p, v) => { T(a, { type: 'triangle', f0: 700 * p, dur: 0.09, vol: 0.2 * v }); T(a, { type: 'triangle', f0: 480 * p, dur: 0.12, vol: 0.18 * v, at: 0.06 }); },
  error: (a, p, v) => { T(a, { type: 'square', f0: 170 * p, f1: 110 * p, dur: 0.2, vol: 0.16 * v, lp: 900 }); T(a, { type: 'square', f0: 150 * p, f1: 95 * p, dur: 0.2, vol: 0.12 * v, at: 0.1, lp: 900 }); },
  coin: (a, p, v) => { T(a, { type: 'square', f0: 1320 * p, dur: 0.07, vol: 0.09 * v, lp: 5000 }); T(a, { type: 'square', f0: 1760 * p, dur: 0.16, vol: 0.09 * v, at: 0.06, lp: 5000 }); },
  sell: (a, p, v) => { for (let i = 0; i < 4; i++) T(a, { type: 'square', f0: (1200 + i * 220) * p, dur: 0.08, vol: 0.08 * v, at: i * 0.05, lp: 5000 }); },
  build_start: (a, p, v) => { for (let i = 0; i < 3; i++) { N(a, { f0: 700, q: 2, dur: 0.07, vol: 0.28 * v, at: i * 0.55 }); T(a, { type: 'sine', f0: 120, f1: 60, dur: 0.1, vol: 0.3 * v, at: i * 0.55 }); } },
  build_done: (a, p, v) => { [523, 659, 784, 1046].forEach((f, i) => T(a, { type: 'triangle', f0: f * p, dur: 0.22, vol: 0.2 * v, at: i * 0.07 })); N(a, { f0: 7000, type: 'highpass', dur: 0.3, vol: 0.06 * v, at: 0.2 }); },
  upgrade: (a, p, v) => { T(a, { type: 'sawtooth', f0: 300 * p, f1: 900 * p, dur: 0.25, vol: 0.1 * v, lp: 2500 }); T(a, { type: 'triangle', f0: 1175 * p, dur: 0.3, vol: 0.2 * v, at: 0.18 }); T(a, { type: 'triangle', f0: 1568 * p, dur: 0.4, vol: 0.16 * v, at: 0.26 }); },
  evolve: (a, p, v) => { T(a, { type: 'sawtooth', f0: 150, f1: 700, dur: 0.7, vol: 0.12 * v, lp: 2200 }); [523, 659, 784, 1046, 1318].forEach((f, i) => T(a, { type: 'triangle', f0: f, dur: 0.9, vol: 0.15 * v, at: 0.5 + i * 0.06, vib: 3 })); N(a, { f0: 5000, f1: 9000, type: 'highpass', dur: 0.8, vol: 0.08 * v, at: 0.5 }); T(a, { type: 'sine', f0: 90, f1: 40, dur: 0.5, vol: 0.4 * v, at: 0.5 }); },
  pick: (a, p, v) => { [988, 1319, 1760].forEach((f, i) => T(a, { type: 'sine', f0: f * p, dur: 0.25, vol: 0.18 * v, at: i * 0.06, vib: 5 })); },
  shoot_arrow: (a, p, v) => { N(a, { f0: 2200 * p, f1: 900 * p, q: 1.2, dur: 0.08, vol: 0.12 * v }); T(a, { type: 'triangle', f0: 420 * p, f1: 210 * p, dur: 0.09, vol: 0.1 * v }); },
  shoot_ice: (a, p, v) => { T(a, { type: 'sine', f0: 1300 * p, f1: 2000 * p, dur: 0.14, vol: 0.1 * v }); N(a, { f0: 6500, type: 'highpass', dur: 0.12, vol: 0.07 * v }); },
  shoot_fire: (a, p, v) => { N(a, { f0: 900 * p, f1: 300 * p, q: 0.8, type: 'lowpass', dur: 0.16, vol: 0.2 * v }); T(a, { type: 'sawtooth', f0: 240 * p, f1: 150 * p, dur: 0.12, vol: 0.05 * v, lp: 900 }); },
  hit: (a, p, v) => { T(a, { type: 'sine', f0: 190 * p, f1: 80 * p, dur: 0.07, vol: 0.2 * v }); N(a, { f0: 1500, q: 1, dur: 0.03, vol: 0.1 * v }); },
  crit: (a, p, v) => { T(a, { type: 'sine', f0: 190 * p, f1: 70 * p, dur: 0.09, vol: 0.26 * v }); T(a, { type: 'triangle', f0: 1568 * p, f1: 2093 * p, dur: 0.14, vol: 0.16 * v }); N(a, { f0: 4000, type: 'highpass', dur: 0.08, vol: 0.1 * v }); },
  slime_die: (a, p, v) => { T(a, { type: 'sine', f0: 560 * p, f1: 130 * p, dur: 0.28, vol: 0.2 * v, vib: 30 }); N(a, { f0: 700 * p, f1: 250, q: 3, dur: 0.18, vol: 0.14 * v }); },
  slime_spawn: (a, p, v) => { T(a, { type: 'sine', f0: 180 * p, f1: 420 * p, dur: 0.12, vol: 0.09 * v }); },
  player_hurt: (a, p, v) => { T(a, { type: 'square', f0: 320, f1: 90, dur: 0.28, vol: 0.2 * v, lp: 1500 }); N(a, { f0: 900, f1: 200, dur: 0.2, vol: 0.2 * v }); },
  player_die: (a, p, v) => { [392, 330, 262, 196].forEach((f, i) => T(a, { type: 'triangle', f0: f, f1: f * 0.97, dur: 0.5, vol: 0.2 * v, at: i * 0.22, vib: 4 })); },
  skill_invincible: (a, p, v) => { [523, 659, 784, 1046].forEach((f, i) => T(a, { type: 'sine', f0: f, dur: 0.6, vol: 0.16 * v, at: i * 0.05, vib: 5 })); N(a, { f0: 6000, type: 'highpass', dur: 0.5, vol: 0.06 * v }); },
  skill_phase: (a, p, v) => { N(a, { f0: 300, f1: 3000, q: 2, dur: 0.5, vol: 0.2 * v }); T(a, { type: 'sine', f0: 200, f1: 900, dur: 0.5, vol: 0.14 * v, vib: 8 }); },
  phase_end: (a, p, v) => { N(a, { f0: 3000, f1: 300, q: 2, dur: 0.4, vol: 0.18 * v }); T(a, { type: 'sine', f0: 900, f1: 200, dur: 0.4, vol: 0.12 * v }); },
  speed: (a, p, v) => { T(a, { type: 'square', f0: 440 * p, dur: 0.08, vol: 0.09 * v, lp: 3000 }); T(a, { type: 'square', f0: 660 * p, dur: 0.14, vol: 0.09 * v, at: 0.07, lp: 3000 }); },
  warn: (a, p, v) => T(a, { type: 'square', f0: 1000 * p, dur: 0.06, vol: 0.08 * v, lp: 3000 }),
  wave_start: (a, p, v) => { T(a, { type: 'sawtooth', f0: 196, dur: 0.7, vol: 0.14 * v, lp: 900, attack: 0.08 }); T(a, { type: 'sawtooth', f0: 294, dur: 0.7, vol: 0.12 * v, lp: 900, attack: 0.08 }); },
  wave_boss: (a, p, v) => { T(a, { type: 'sawtooth', f0: 98, dur: 1.1, vol: 0.2 * v, lp: 700, attack: 0.1 }); T(a, { type: 'sawtooth', f0: 147, dur: 1.1, vol: 0.16 * v, lp: 700, attack: 0.1 }); for (let i = 0; i < 4; i++) T(a, { type: 'sine', f0: 110, f1: 40, dur: 0.2, vol: 0.4 * v, at: i * 0.22 }); },
  // bước chân: thịch trầm + xào xạc ngắn; p đổi theo chân trái/phải để không đều như máy
  footstep: (a, p, v) => { T(a, { type: 'sine', f0: 105 * p, f1: 62 * p, dur: 0.07, vol: 0.12 * v }); N(a, { f0: 900 * p, f1: 380, q: 0.7, type: 'lowpass', dur: 0.06, vol: 0.09 * v }); },
  dash: (a, p, v) => { N(a, { f0: 700, f1: 3600, q: 1.4, dur: 0.22, vol: 0.2 * v }); T(a, { type: 'sine', f0: 260 * p, f1: 640 * p, dur: 0.2, vol: 0.1 * v }); },
  dash_ready: (a, p, v) => { T(a, { type: 'sine', f0: 1175 * p, dur: 0.1, vol: 0.12 * v }); T(a, { type: 'sine', f0: 1568 * p, dur: 0.16, vol: 0.12 * v, at: 0.07 }); },
  slime_attack: (a, p, v) => { T(a, { type: 'sine', f0: 240 * p, f1: 120 * p, dur: 0.12, vol: 0.14 * v, vib: 20 }); N(a, { f0: 600, f1: 220, q: 2, dur: 0.1, vol: 0.1 * v }); },
  win: (a, p, v) => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => T(a, { type: 'triangle', f0: f, dur: i === 6 ? 1.2 : 0.22, vol: 0.2 * v, at: i * 0.16, vib: i === 6 ? 5 : 0 })); },
  lose: (a, p, v) => { [440, 392, 349, 294, 220].forEach((f, i) => T(a, { type: 'triangle', f0: f, dur: i === 4 ? 1.2 : 0.35, vol: 0.2 * v, at: i * 0.28, lp: 1500 })); },
};
export const audio = new AudioSystem();
