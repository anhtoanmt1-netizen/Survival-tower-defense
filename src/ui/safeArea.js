// Đọc vùng an toàn (tai thỏ, thanh điều hướng) qua CSS env() từ phần tử #safe-probe.
export function safeInsets() {
  const el = document.getElementById('safe-probe'); if (!el) return { top: 0, right: 0, bottom: 0, left: 0 };
  const s = getComputedStyle(el), f = (v) => parseFloat(v) || 0;
  return { top: f(s.paddingTop), right: f(s.paddingRight), bottom: f(s.paddingBottom), left: f(s.paddingLeft) };
}
