// RNG + noise. Chỉ dùng + - * / Math.imul Math.floor (KHÔNG dùng sin/cos/pow)
// để kết quả giống hệt nhau trên mọi thiết bị (quan trọng cho Map ID).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function lattice(seed, x, y) {
  let h = (seed ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = (t) => t * t * (3 - 2 * t);
export function makeNoise(seed) {
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const a = lattice(seed, x0, y0), b = lattice(seed, x0 + 1, y0);
    const c = lattice(seed, x0, y0 + 1), d = lattice(seed, x0 + 1, y0 + 1);
    const top = a + (b - a) * fx, bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  };
}
export function fbm(noise, x, y, oct = 3) {
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) { sum += noise(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2; }
  return sum / norm;
}
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
