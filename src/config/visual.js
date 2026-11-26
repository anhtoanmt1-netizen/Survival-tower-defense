// Thông số hình ảnh/hiệu ứng môi trường tập trung: kích thước cây, bóng đổ, hiệu ứng nước/cỏ, khoảng chỉnh màu. Sửa tại đây, không rải trong code.
export const VISUAL = {
  tree: { footprint: 2, displayW: 112, legacyW: 52, texW: 345, refW: 345, baseOffset: 3 },         // cây 2x2 ô: rộng 112px thế giới (ô = 32px) cho cây rộng refW=345px (ảnh gốc, giữ nguyên độ phân giải); cây hẹp hơn (thông) co cùng tỉ lệ; bản đồ cũ (1 ô) giữ 52px
  shadow: { tree: [74, 24, 0.3], rock: [46, 14, 0.26], bush: [30, 10, 0.22], tower: [88, 30, 0.36] },   // [rộng, cao, độ đậm] bóng tiếp đất
  water: { max: 34, perSecond: 16, glintLife: 1.0, rippleLife: 1.9, tries: 10 },        // tia phản chiếu + gợn sóng (sprite có giới hạn số lượng)
  grass: { maxTufts: 640, wind: 0.065, gust: 0.022, windDir: 0.35, bendRadius: 26, bendMax: 0.5, density: 1.0 },   // maxTufts = mức đầy đủ (chế độ Cao cấp) để quy đổi tỉ lệ làm thưa; wind/gust: biên độ rad; windDir: hướng gió (rad); bendMax: góc nghiêng tối đa khi bị giẫm
  // Lá/cánh hoa rơi theo từng loài cây (chỉ số = tree_<i>): màu, tần suất, tốc độ rơi/trôi ngang, độ đung đưa, cỡ, xoay
  leaf: {
    default: { colors: [0x7bd34f, 0x4fa83a], rate: 0.5, vy: [14, 26], vx: [4, 14], sway: [1.5, 3], size: [0.8, 1.4], spin: 2, life: [3.2, 5.4] },
    0: { colors: [0xff7a2a, 0xd9421a, 0xf0b030], rate: 1, vy: [20, 34], vx: [6, 16], sway: [1.5, 3], size: [0.9, 1.5], spin: 3.5, life: [3, 5] },       // phong đỏ: lá rụng nhanh, xoay
    1: { colors: [0xa8e05a, 0x7bc443], rate: 0.8, vy: [8, 15], vx: [3, 9], sway: [1, 2], size: [1, 1.8], spin: 1.2, life: [4, 6.5] },                    // liễu: lá dài, chậm
    2: { colors: [0xffc2d9, 0xff9bc0, 0xffe3ee], rate: 1, vy: [8, 15], vx: [10, 26], sway: [2, 3.5], size: [0.7, 1.1], spin: 2.5, life: [4, 6.8] },      // anh đào: cánh hoa bay theo gió
    3: { colors: [0xff6a6a, 0xff9a8a], rate: 0.7, vy: [10, 18], vx: [6, 16], sway: [2, 3], size: [0.6, 1], spin: 2, life: [3.5, 5.5] },
    4: { colors: [0x7bd34f, 0x4fa83a], rate: 0.45, vy: [14, 24], vx: [4, 12], sway: [1.5, 3], size: [0.8, 1.3], spin: 2, life: [3.2, 5.2] },
    5: { colors: [0x8ed35a, 0xb5e07a], rate: 0.4, vy: [14, 24], vx: [4, 12], sway: [1.5, 3], size: [0.8, 1.2], spin: 2, life: [3.2, 5.2] },
    6: { colors: [0x9fdc5a, 0x7bc93f], rate: 0.8, vy: [20, 34], vx: [6, 18], sway: [1, 2], size: [0.6, 1.1], spin: 1.5, life: [2.8, 4.5] },
    7: { colors: [0xc8a070, 0x9b7a4a], rate: 0.25, vy: [12, 20], vx: [4, 12], sway: [1.5, 2.5], size: [0.7, 1.1], spin: 2, life: [3.5, 5.5] },
    8: { colors: [0x3f8a4a, 0x2f7040], rate: 0.5, vy: [10, 18], vx: [1, 5], sway: [0.6, 1.2], size: [0.5, 0.8], spin: 0.8, life: [3.5, 5.5] },           // thông: lá kim nhỏ, rơi thẳng
  },
  grade: { brightness: { min: -0.3, max: 0.3, def: 0 }, contrast: { min: 0.7, max: 1.4, def: 1 }, saturation: { min: 0.4, max: 1.6, def: 1 }, rebakePerFrame: 4 },
};
