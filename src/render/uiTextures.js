import { make } from './textures.js';
// Texture giao diện vẽ bằng canvas (độ phân giải 2x để nét): mặt nút, viền kim loại, đế joystick, núm joystick, vòng sáng.
export function createUiTextures(scene) {
  const S = 128, C = 64;
  const smooth = (c) => { c.imageSmoothingEnabled = true; };
  make(scene, 'ui_face', S, S, (c) => { smooth(c); const g = c.createRadialGradient(C - 14, C - 18, 4, C, C, C); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#d6d6d6'); g.addColorStop(1, '#8a8a8a'); c.fillStyle = g; c.beginPath(); c.arc(C, C, C - 5, 0, 6.2832); c.fill(); });
  make(scene, 'ui_rim', S, S, (c) => {
    smooth(c); c.beginPath(); c.arc(C, C, C - 2, 0, 6.2832); c.arc(C, C, C - 9, 0, 6.2832, true); c.fillStyle = '#10180f'; c.fill();
    const g = c.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#fff3b8'); g.addColorStop(0.5, '#d9a52e'); g.addColorStop(1, '#7a5512');
    c.beginPath(); c.arc(C, C, C - 4, 0, 6.2832); c.arc(C, C, C - 9, 0, 6.2832, true); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 3; c.beginPath(); c.arc(C, C, C - 11, 0, 6.2832); c.stroke();
  });
  make(scene, 'ui_ring', S, S, (c) => { smooth(c); const g = c.createRadialGradient(C, C, C - 26, C, C, C); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, S, S); });
  make(scene, 'ui_joy_base', 256, 256, (c) => {
    smooth(c); const g = c.createRadialGradient(128, 128, 20, 128, 128, 124); g.addColorStop(0, 'rgba(20,34,27,.25)'); g.addColorStop(1, 'rgba(8,14,10,.62)'); c.fillStyle = g; c.beginPath(); c.arc(128, 128, 120, 0, 6.2832); c.fill();
    c.strokeStyle = 'rgba(224,177,58,.95)'; c.lineWidth = 8; c.beginPath(); c.arc(128, 128, 118, 0, 6.2832); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 3; c.beginPath(); c.arc(128, 128, 96, 0, 6.2832); c.stroke();
    c.fillStyle = 'rgba(255,240,180,.85)'; for (let i = 0; i < 4; i++) { c.save(); c.translate(128, 128); c.rotate(i * Math.PI / 2); c.beginPath(); c.moveTo(0, -108); c.lineTo(11, -88); c.lineTo(-11, -88); c.closePath(); c.fill(); c.restore(); }
  });
  make(scene, 'ui_knob', S, S, (c) => {
    smooth(c); const g = c.createRadialGradient(C - 14, C - 18, 4, C, C, C - 4); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#e8d9a8'); g.addColorStop(1, '#a98a38'); c.fillStyle = g; c.beginPath(); c.arc(C, C, C - 4, 0, 6.2832); c.fill();
    c.strokeStyle = 'rgba(60,40,5,.7)'; c.lineWidth = 5; c.stroke();
  });
}
