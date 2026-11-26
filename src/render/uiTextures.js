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
  // Đế joystick: kính tối trong suốt, viền vàng mảnh + vòng sáng, 4 mũi tên hướng và 4 chấm phụ
  make(scene, 'ui_joy_base', 256, 256, (c) => {
    smooth(c); const g = c.createRadialGradient(128, 120, 14, 128, 128, 124); g.addColorStop(0, 'rgba(34,52,44,.30)'); g.addColorStop(0.75, 'rgba(10,18,14,.55)'); g.addColorStop(1, 'rgba(6,10,8,.72)');
    c.fillStyle = g; disc(c, 128, 128, 120); c.fill();
    const rg = c.createLinearGradient(0, 8, 0, 248); rg.addColorStop(0, '#fff0b0'); rg.addColorStop(0.5, '#e0b13a'); rg.addColorStop(1, '#8a5f14'); c.strokeStyle = rg; c.lineWidth = 7; disc(c, 128, 128, 117); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2.5; disc(c, 128, 128, 92); c.stroke();
    c.fillStyle = 'rgba(255,236,170,.9)'; for (let i = 0; i < 4; i++) { c.save(); c.translate(128, 128); c.rotate(i * Math.PI / 2); c.beginPath(); c.moveTo(0, -106); c.lineTo(10, -88); c.lineTo(-10, -88); c.closePath(); c.fill(); c.restore(); }
    c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; disc(c, 128 + Math.cos(a) * 98, 128 + Math.sin(a) * 98, 4); c.fill(); }
  });
  // Núm: ngọc vàng bóng có điểm sáng
  make(scene, 'ui_knob', S, S, (c) => {
    smooth(c); const g = c.createRadialGradient(C - 16, C - 20, 4, C, C, C - 4); g.addColorStop(0, '#fffdf0'); g.addColorStop(0.5, '#f1dc95'); g.addColorStop(1, '#a8802a'); c.fillStyle = g; disc(c, C, C, C - 4); c.fill();
    c.strokeStyle = 'rgba(70,44,6,.75)'; c.lineWidth = 5; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(C - 8, C - 20, 22, 11, -0.5, 0, TAU); c.fill();
  });
}
