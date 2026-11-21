// Thông số hiệu ứng chiến đấu & môi trường tập trung một chỗ (hiệu năng + độ rối mắt chỉnh ở đây).
export const FX = {
  maxLive: 260,                                                      // tổng hạt/vòng/ánh sáng đang sống; vượt thì bỏ bớt hiệu ứng phụ
  bar: { w: 24, h: 4, show: 3, fade: 0.5, dy: 6, trailDrop: 0.9 },   // thanh máu quái: hiện 3s sau mỗi lần trúng đòn, vệt trắng tụt dần
  dmg: { maxNormal: 34, maxCrit: 14, life: 0.85, critLife: 1.1, size: 12, critSize: 21, rise: 26, critRise: 38 },
  flashMax: 14,                                                      // số ánh chớp nòng tối đa đồng thời
  leaves: { max: 22, perSecond: 5 },
  kinds: { arrow: { color: 0xfff1c9, glow: 0xffe9b0 }, ice: { color: 0x8fd0ff, glow: 0x6fc4ff }, fire: { color: 0xff8a2a, glow: 0xffa040 } },
};
