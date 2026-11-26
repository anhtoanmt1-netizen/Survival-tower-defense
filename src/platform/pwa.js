import { isCapacitor } from './device.js';
// Đăng ký service worker (chỉ bản Web/PWA, KHÔNG chạy trong APK Capacitor) + nút "Cài đặt" + báo có bản cập nhật.
export const canRegister = (nav = typeof navigator !== 'undefined' ? navigator : null, cap = isCapacitor()) => !!nav && 'serviceWorker' in nav && !cap;
export function initPwa({ onUpdate, onInstallable } = {}) {
  if (typeof window === 'undefined') return { install: async () => false };
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; onInstallable?.(true); });
  window.addEventListener('appinstalled', () => { deferred = null; onInstallable?.(false); });
  if (canRegister() && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      const watch = (w) => w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) onUpdate?.(() => { w.postMessage('SKIP_WAITING'); }); });
      watch(reg.installing); reg.addEventListener('updatefound', () => watch(reg.installing));
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    }).catch(() => {});
    let reloaded = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded) return; reloaded = true; location.reload(); });
  }
  return { install: async () => { if (!deferred) return false; deferred.prompt(); const r = await deferred.userChoice.catch(() => null); deferred = null; onInstallable?.(false); return r?.outcome === 'accepted'; } };
}
