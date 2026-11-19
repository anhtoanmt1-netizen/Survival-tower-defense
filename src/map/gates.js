// 8 cổng quái vật: TL, T, TR, R, BR, B, BL, L (đúng thứ tự spec). Neo cách mép `inset` ô.
export const GATE_NAMES = ['TL', 'T', 'TR', 'R', 'BR', 'B', 'BL', 'L'];
export function gateAnchors(W, H, inset = 4) {
  const mx = W >> 1, my = H >> 1, ex = W - 1 - inset, ey = H - 1 - inset;
  return [[inset, inset], [mx, inset], [ex, inset], [ex, my], [ex, ey], [mx, ey], [inset, ey], [inset, my]]
    .map(([x, y], i) => ({ name: GATE_NAMES[i], x, y }));
}
