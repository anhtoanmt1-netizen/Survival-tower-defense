// Nhận diện nền tảng chạy game: APK (Capacitor), PWA đã cài, hay trình duyệt thường. An toàn khi chạy ngoài trình duyệt (kiểm thử Node).
const nav = () => (typeof navigator !== 'undefined' ? navigator : {});
const win = () => (typeof window !== 'undefined' ? window : {});
export const isCapacitor = () => !!win().Capacitor?.isNativePlatform?.();
export const isStandalone = () => { try { return !!win().matchMedia?.('(display-mode: standalone)').matches || nav().standalone === true; } catch { return false; } };
export const isMobile = () => /Android|iPhone|iPad|iPod|Mobile/i.test(nav().userAgent || '') || (win().matchMedia?.('(pointer: coarse)').matches ?? false);
export const platformName = () => (isCapacitor() ? 'apk' : isStandalone() ? 'pwa' : 'web');
// Thông số phần cứng thô (có thể thiếu trên iOS/Firefox) -> dùng cho gợi ý chế độ hiệu năng
export const hardware = () => ({ cores: nav().hardwareConcurrency || 4, memGb: nav().deviceMemory || 4, mobile: isMobile() });
