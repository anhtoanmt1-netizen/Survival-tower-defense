// BỘ ICON ĐỒNG BỘ (vector, lưới 24px, nét 1.8 bo tròn, nền tô nhẹ 24%): dùng chung cho DOM (<span data-icon="tên">) và Phaser (rasterizeIcons).
// Thêm icon mới: thêm một mục vào ICONS với markup dùng currentColor; shape cần tô nhẹ thêm thuộc tính ${F}.
const F = ' fill="currentColor" fill-opacity=".24"', S = ' fill="currentColor" stroke="none"';
export const ICONS = {
  ghost: `<path${F} d="M5.5 20V11a6.5 6.5 0 0 1 13 0v9l-2.2-1.8-2.1 1.8-2.2-1.8-2.2 1.8-2.1-1.8z"/><circle${S} cx="9.6" cy="11" r="1.1"/><circle${S} cx="14.4" cy="11" r="1.1"/>`,
  leaf: `<path${F} d="M5 19c-1-8 4-14 15-14 0 10-5 15-12 14z"/><path d="M5 19c3-5 6-8 10-10"/>`,
  scale: `<path d="M12 4v16M6 20h12M5 8h14"/><path${F} d="M5 8l-2.5 6a2.8 2.8 0 0 0 5 0zM19 8l-2.5 6a2.8 2.8 0 0 0 5 0z"/>`,
  sparkle: `<path${F} d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M19 3v3M17.5 4.5h3"/>`,
  vibrate: `<rect${F} x="8" y="4" width="8" height="16" rx="2"/><path d="M4.5 9v6M2.5 10.5v3M19.5 9v6M21.5 10.5v3"/>`,
  person: `<circle${F} cx="12" cy="8" r="3.6"/><path${F} d="M5 20c0-4 3-6.4 7-6.4s7 2.4 7 6.4z"/>`,
  mute: `<path${F} d="M4 9.6h3.4L12 6v12l-4.6-3.6H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>`,
  zoom: `<circle${F} cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M10.5 8v5M8 10.5h5"/>`,
  target: `<circle cx="12" cy="12" r="8"/><circle${F} cx="12" cy="12" r="3.6"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>`,
  heart: `<path${F} d="M12 20.3s-7.4-4.5-7.4-10.1A4.2 4.2 0 0 1 12 7.7a4.2 4.2 0 0 1 7.4 2.5c0 5.6-7.4 10.1-7.4 10.1z"/>`,
  coin: `<circle${F} cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="5.2"/><path d="M12 9v6M10.2 10.6c0-.8.8-1.2 1.8-1.2s1.8.4 1.8 1.2"/>`,
  hammer: `<path${F} d="M13.2 5.2l5.6 5.6-2.2 2.2-5.6-5.6z"/><path d="M11.8 8.6L4.8 15.6a2 2 0 0 0 2.8 2.8l7-7"/>`,
  tower: `<path${F} d="M6 20.5V9.2h2.4V6.5h2v2.7h3.2V6.5h2v2.7H18v11.3z"/><path d="M10 20.5v-4.2a2 2 0 0 1 4 0v4.2"/>`,
  shield: `<path${F} d="M12 3.5l7 2.6v5.3c0 4.2-2.9 7.7-7 9.1-4.1-1.4-7-4.9-7-9.1V6.1z"/><path d="M9.2 12l2 2 3.6-3.8"/>`,
  dash: `<path d="M3.5 9h9a2.6 2.6 0 1 0-2.6-2.6"/><path d="M3.5 13.5h14a2.6 2.6 0 1 1-2.6 2.6"/><path d="M3.5 18h6.5"/>`,
  bolt: `<path${F} d="M13.2 3L5.5 13.6h5.6L10.4 21l8.1-10.6h-5.6z"/>`,
  gear: `<circle${F} cx="12" cy="12" r="6.3"/><circle cx="12" cy="12" r="2.4"/><path d="M12 3.2v2.4M12 18.4v2.4M3.2 12h2.4M18.4 12h2.4M5.8 5.8l1.7 1.7M16.5 16.5l1.7 1.7M18.2 5.8l-1.7 1.7M7.5 16.5l-1.7 1.7"/>`,
  pause: `<rect${F} x="6.2" y="5" width="4" height="14" rx="1.2"/><rect${F} x="13.8" y="5" width="4" height="14" rx="1.2"/>`,
  play: `<path${F} d="M8 5.4v13.2L19 12z"/>`,
  home: `<path${F} d="M4.5 11L12 4.5l7.5 6.5v8.5h-5v-5h-5v5h-5z"/>`,
  copy: `<rect${F} x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.2A1.7 1.7 0 0 0 13.8 4.5H6.2A1.7 1.7 0 0 0 4.5 6.2v7.6a1.7 1.7 0 0 0 1.7 1.7h2.3"/>`,
  close: `<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5"/>`,
  music: `<path d="M9 17.5V6.2l9.4-2v11.3"/><circle${F} cx="6.9" cy="17.6" r="2.3"/><circle${F} cx="16.3" cy="15.6" r="2.3"/>`,
  speaker: `<path${F} d="M4 9.6h3.4L12 6v12l-4.6-3.6H4z"/><path d="M15.4 9.2a4 4 0 0 1 0 5.6M18 6.6a7.6 7.6 0 0 1 0 10.8"/>`,
  screen: `<rect${F} x="7" y="3.5" width="10" height="17" rx="2.4"/><path d="M11 17.6h2"/>`,
  eye: `<path${F} d="M2.6 12S6 6.2 12 6.2 21.4 12 21.4 12 18 17.8 12 17.8 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.6"/>`,
  water: `<path${F} d="M12 3.4s6 6.2 6 10.6a6 6 0 0 1-12 0c0-4.4 6-10.6 6-10.6z"/><path d="M9.4 14.2a2.8 2.8 0 0 0 2.2 2.4"/>`,
  grass: `<path${F} d="M4.6 19.4c0-7.8 5-13 14.8-14 0 9.4-5.2 14.2-13.4 14.2"/><path d="M4.6 19.4l7.4-7.4"/>`,
  sun: `<circle${F} cx="12" cy="12" r="4.2"/><path d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.8 5.8l1.5 1.5M16.7 16.7l1.5 1.5M18.2 5.8l-1.5 1.5M7.3 16.7l-1.5 1.5"/>`,
  contrast: `<circle cx="12" cy="12" r="8.2"/><path${S} d="M12 3.8a8.2 8.2 0 0 1 0 16.4z"/>`,
  palette: `<path${F} d="M12 3.4a8.6 8.6 0 1 0 0 17.2c1.3 0 2-.9 2-2 0-1.5-1-1.7-1-2.9 0-1 .8-1.7 2-1.7H17a3.9 3.9 0 0 0 3.9-3.9C20.9 6.6 17 3.4 12 3.4z"/><circle${S} cx="7.8" cy="11" r="1.1"/><circle${S} cx="10.5" cy="7.6" r="1.1"/><circle${S} cx="15" cy="8" r="1.1"/>`,
  map: `<path${F} d="M3.6 6.6l5.4-2 6 2 5.4-2v12.8l-5.4 2-6-2-5.4 2z"/><path d="M9 4.6v12.8M15 6.6v12.8"/>`,
  tree: `<circle${F} cx="12" cy="9.2" r="5.6"/><path d="M12 14.8V20M9 20h6"/>`,
  refresh: `<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.6 4.4v4.2h-4.2"/>`,
  skull: `<path${F} d="M12 4a7 7 0 0 0-7 7c0 2.4 1.2 4 2.5 5v3h9v-3c1.3-1 2.5-2.6 2.5-5a7 7 0 0 0-7-7z"/><circle${S} cx="9.3" cy="11.2" r="1.3"/><circle${S} cx="14.7" cy="11.2" r="1.3"/>`,
  arrows: `<path d="M4 18.5L18.5 5.5M4.4 12l8.6-6.6M10.5 20L20 12.4"/><path d="M15.5 5.5h3v3"/>`,
  snow: `<path d="M12 3.2v17.6M4.4 7.6l15.2 8.8M4.4 16.4l15.2-8.8"/>`,
  flame: `<path${F} d="M12 3.2c1 3.6 5.2 5.4 5.2 10a5.2 5.2 0 0 1-10.4 0c0-2 1-3.2 2.2-4.2.3 1.6 1 2.2 2 2.2 0-3-.6-5 1-8z"/>`,
  sword: `<path${F} d="M5 19l9.2-9.2 5.2-5.2.4 4.6L10.2 19.4z"/><path d="M4.4 15.6l4 4"/>`,
  speed: `<circle${F} cx="12" cy="12.5" r="8"/><path d="M12 7.6v5l3.2 2M9.5 3.4h5"/>`,
  range: `<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.2"/><circle${S} cx="12" cy="12" r="1.2"/>`,
  star: `<path${F} d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.3 2.8 1-5.9-4.3-4.1 5.9-.8z"/>`,
  flag: `<path d="M6 21V4"/><path${F} d="M6 5h11.4l-2.6 3.6L17.4 12H6"/>`,
  slime: `<path${F} d="M4.6 18.6c-1.6 0-2.2-1.6-1.2-3.2 1.2-2 2.2-4.4 4.2-6.4 1.5-1.5 3.3-2 4.4-2s2.9.5 4.4 2c2 2 3 4.4 4.2 6.4 1 1.6.4 3.2-1.2 3.2z"/><circle${S} cx="9.2" cy="13" r="1.2"/><circle${S} cx="14.8" cy="13" r="1.2"/>`,
  trophy: `<path${F} d="M7.5 4.5h9v5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6.5H4.6c0 3 1.2 4.4 3.2 4.6M16.5 6.5h2.9c0 3-1.2 4.4-3.2 4.6M12 14v3.6M8.6 20h6.8"/>`,
  lock: `<rect${F} x="5.6" y="10.6" width="12.8" height="9.6" rx="2.2"/><path d="M8.4 10.6V8a3.6 3.6 0 0 1 7.2 0v2.6"/><circle${S} cx="12" cy="15.4" r="1.3"/>`,
  wall: `<path${F} d="M3.6 7h16.8v12.4H3.6z"/><path d="M3.6 11.1h16.8M3.6 15.2h16.8M9.2 7v4.1M14.8 11.1v4.1M9.2 15.2v4.2"/>`,
  camera: `<path${F} d="M4 8h3.2l1.4-2h6.8l1.4 2H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.3"/><path d="M17.6 10.6h.6"/>`,
  brush: `<path${F} d="M4.6 19.4c2.6 0 4-1.2 4-3.2l-1.6-1.6c-2 0-2.4 2-2.4 4.8z"/><path d="M8.2 14.8L18.6 4.4a1.9 1.9 0 0 1 2.7 2.7L10.8 17.4"/>`,
};
export const iconSvg = (name, { color = 'currentColor', size = 24, cls = 'ic' } = {}) => `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:${color}">${ICONS[name] || ''}</svg>`;
// Thay mọi phần tử [data-icon] chưa có nội dung bằng SVG tương ứng
export function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach((el) => { if (!el.dataset.ih || el.dataset.ih !== el.dataset.icon) { el.innerHTML = iconSvg(el.dataset.icon); el.dataset.ih = el.dataset.icon; } }); }
// Phaser: rasterize icon thành canvas (trắng + bóng tối để nổi trên nút màu). Trả về {tên: canvas}
export async function rasterizeIcons(names, size = 64) {
  const out = {}, img = (svg) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  await Promise.all(names.map(async (n) => { try { const [a, b] = await Promise.all([img(iconSvg(n, { color: '#3b2a0a', size })), img(iconSvg(n, { color: '#ffffff', size }))]); const c = document.createElement('canvas'); c.width = c.height = size + 6; const x = c.getContext('2d'); x.globalAlpha = 0.55; x.drawImage(a, 3, 5, size, size); x.globalAlpha = 1; x.drawImage(b, 3, 3, size, size); out[n] = c; } catch { /* icon lỗi không được làm sập game */ } }));
  return out;
}
