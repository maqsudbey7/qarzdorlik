/** Ilova (PWA): service worker, "o'rnatish" so'rovi, internet holati. */
import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Ilova ishga tushganda bir marta chaqiriladi. */
export function setupPwa() {
  // Chrome/Android: o'rnatish so'rovini ushlab qolamiz — o'zimizning chiroyli tugmamiz orqali ko'rsatamiz
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => { deferred = null; installed = true; emit(); });
  window.addEventListener('online', emit);
  window.addEventListener('offline', emit);

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  }
}

/** O'rnatish oynasini ochadi. true — foydalanuvchi o'rnatdi. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  await e.prompt();
  const { outcome } = await e.userChoice;
  deferred = null;
  if (outcome === 'accepted') installed = true;
  emit();
  return outcome === 'accepted';
}

/** Chiqishda: shu telefondagi saqlangan ma'lumot va rasmlarni o'chirish. */
export function clearUserData() {
  navigator.serviceWorker?.controller?.postMessage('clear-user-data');
  if ('caches' in window) ['qarz-api-v1', 'qarz-photos-v1'].forEach((k) => caches.delete(k).catch(() => {}));
}

export interface InstallState { canPrompt: boolean; standalone: boolean; installed: boolean; ios: boolean }
let snapshot: InstallState | null = null;
function getInstall(): InstallState {
  const next = { canPrompt: !!deferred, standalone: isStandalone(), installed, ios: isIOS() };
  if (!snapshot || Object.entries(next).some(([k, v]) => snapshot![k as keyof InstallState] !== v)) snapshot = next;
  return snapshot;
}

export const useInstall = () => useSyncExternalStore(subscribe, getInstall);
export const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine);
