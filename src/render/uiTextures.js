import { make } from './textures.js';
// Texture giao diện "Modern Fantasy" vẽ bằng canvas (2x để nét, lọc tuyến tính nên không răng cưa): mặt nút kính bóng, viền vàng vát cạnh,
// đế joystick kính mờ có vạch hướng, núm ngọc, vòng sáng. Chỉ vẽ MỘT lần lúc khởi động; mỗi khung chỉ là ảnh có sẵn → rất nhẹ.
export function createUiTextures(scene) {
  const S = 128, C = 64, TAU = 6.2832;
  const smooth = (c) => { c.imageSmoothingEnabled = true; };
  const disc = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
  // Mặt nút (trắng-xám để được nhuộm màu theo từng nút): chuyển sắc dọc + vệt sáng bán nguyệt phía trên như kính
  make(scene, 'ui_face', S, S, (c) => {
    smooth(c); const g = c.createLinearGradient(0, 8, 0, S - 8); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#dedede'); g.addColorStop(1, '#9a9a9a');
    c.fillStyle = g; disc(c, C, C, C - 5); c.fill();
    const sh = c.createRadialGradient(C, C + 18, 10, C, C + 18, C - 6); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.28)'); c.fillStyle = sh; disc(c, C, C, C - 5); c.fill(); // tối dần ra mép → có độ sâu
    const gl = c.createLinearGradient(0, 10, 0, C); gl.addColorStop(0, 'rgba(255,255,255,.85)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gl; c.beginPath(); c.ellipse(C, C - 22, C - 22, 30, 0, 0, TAU); c.fill();
  });
  // Viền vàng vát cạnh: gờ ngoài tối, dải vàng chuyển sắc, vạch sáng mảnh bên trong
  make(scene, 'ui_rim', S, S, (c) => {
    smooth(c); c.beginPath(); c.arc(C, C, C - 2, 0, TAU); c.arc(C, C, C - 10, 0, TAU, true); c.fillStyle = '#0c130c'; c.fill();
    const g = c.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#fff6c9'); g.addColorStop(0.35, '#f0c24a'); g.addColorStop(0.7, '#b9821f'); g.addColorStop(1, '#6e4a0f');
    c.beginPath(); c.arc(C, C, C - 4, 0, TAU); c.arc(C, C, C - 9, 0, TAU, true); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.5; c.beginPath(); c.arc(C, C, C - 5.2, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 3; disc(c, C, C, C - 11); c.stroke();
  });
  make(scene, 'ui_ring', S, S, (c) => { smooth(c); const g = c.createRadialGradient(C, C, C - 26, C, C, C); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, S, S); });
  // Mặt nút kính mờ (nhuộm màu theo từng nút): sáng nhẹ ở trên, đậm dần xuống dưới, vệt sáng mảnh phía trên; dùng với alpha ~0.8 để trong mờ
  make(scene, 'ui_glass', S, S, (c) => {
    smooth(c); const g = c.createLinearGradient(0, 6, 0, S - 6); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#cfcfcf'); g.addColorStop(1, '#8c8c8c');
    c.fillStyle = g; disc(c, C, C, C - 4); c.fill();
    const gl = c.createLinearGradient(0, 8, 0, C - 4); gl.addColorStop(0, 'rgba(255,255,255,.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gl; c.beginPath(); c.ellipse(C, C - 24, C - 20, 28, 0, 0, TAU); c.fill();
  });
  // Viền mảnh sang trọng: 2.5px, vàng nhạt chuyển sắc, nửa trên sáng hơn nửa dưới
  make(scene, 'ui_rim_thin', S, S, (c) => {
    smooth(c); const g = c.createLinearGradient(0, 0, 0, S); g.addColorStop(0, 'rgba(255,244,200,.95)'); g.addColorStop(0.5, 'rgba(240,200,110,.65)'); g.addColorStop(1, 'rgba(190,140,50,.5)');
    c.strokeStyle = g; c.lineWidth = 2.6; disc(c, C, C, C - 3.5); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1; disc(c, C, C, C - 8); c.stroke();
  });
  // Đế joystick: kính mờ, viền mảnh, 4 chevron mảnh, vòng trong mờ (không còn viền dày)
  make(scene, 'ui_joy_base', 256, 256, (c) => {
    smooth(c); const g = c.createRadialGradient(128, 124, 10, 128, 128, 122); g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(0.7, 'rgba(20,34,28,.28)'); g.addColorStop(1, 'rgba(8,14,10,.42)');
    c.fillStyle = g; disc(c, 128, 128, 120); c.fill();
    const rg = c.createLinearGradient(0, 8, 0, 248); rg.addColorStop(0, 'rgba(255,244,200,.9)'); rg.addColorStop(1, 'rgba(210,160,60,.55)'); c.strokeStyle = rg; c.lineWidth = 3; disc(c, 128, 128, 118); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 1.5; disc(c, 128, 128, 84); c.stroke();
    c.strokeStyle = 'rgba(255,240,190,.75)'; c.lineWidth = 3.2; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 0; i < 4; i++) { c.save(); c.translate(128, 128); c.rotate(i * Math.PI / 2); c.beginPath(); c.moveTo(-9, -93); c.lineTo(0, -103); c.lineTo(9, -93); c.stroke(); c.restore(); }
  });
  // Núm: ngọc kính trong suốt, viền mảnh, điểm sáng
  make(scene, 'ui_knob', S, S, (c) => {
    smooth(c); const g = c.createRadialGradient(C - 14, C - 18, 4, C, C, C - 4); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.55, 'rgba(250,232,170,.8)'); g.addColorStop(1, 'rgba(214,170,70,.72)'); c.fillStyle = g; disc(c, C, C, C - 5); c.fill();
    c.strokeStyle = 'rgba(255,248,215,.95)'; c.lineWidth = 2.6; disc(c, C, C, C - 6); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(C - 8, C - 20, 20, 9, -0.5, 0, TAU); c.fill();
  });
}
