import { MAX_GOLD } from '../sim/economy.js';
// Hộp nhập xu ẩn (mở bằng 5 lần chạm liên tiếp vào số vàng). Kiểm tra đầu vào là hàm thuần để kiểm thử được.
export function parseGold(text, max = MAX_GOLD) {
  const t = String(text ?? '').replace(/[\s.,_]/g, '');
  if (t === '') return { ok: false, error: 'Hãy nhập một số.' };
  if (!/^\d+$/.test(t)) return { ok: false, error: 'Chỉ nhập chữ số (0-9).' };
  const v = Number(t); if (!Number.isSafeInteger(v)) return { ok: false, error: 'Số quá lớn.' };
  if (v > max) return { ok: false, error: `Tối đa ${max.toLocaleString('vi-VN')} vàng.` };
  return { ok: true, value: v };
}
export function initCoinDialog() {
  const $ = (id) => document.getElementById(id), modal = $('coinmodal'), inp = $('coininp'), err = $('coinerr'); let done = null;
  const close = (v) => { if (modal.hidden) return; modal.hidden = true; inp.blur(); const f = done; done = null; f?.(v); };
  const submit = () => { const r = parseGold(inp.value); if (!r.ok) { err.textContent = r.error; inp.focus(); return; } close(r.value); };
  $('coinok').onclick = submit; $('coincancel').onclick = () => close(null); $('coinclose').onclick = () => close(null);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') close(null); });
  inp.addEventListener('input', () => { err.textContent = ''; });
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) close(null); });
  // callback(giá trị | null) được gọi đúng một lần
  return (current, cb) => { done = cb; $('coincur').textContent = Number(current).toLocaleString('vi-VN'); inp.value = ''; err.textContent = ''; modal.hidden = false; setTimeout(() => inp.focus(), 60); };
}
