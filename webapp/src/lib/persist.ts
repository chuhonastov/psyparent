let storageFailed = false;
export function hasStorageError() { return storageFailed; }
function failed() {
  storageFailed = true;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('psyparent:storage-error'));
}
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    try { return JSON.parse(value) as T; } catch { return fallback; }
  } catch { failed(); return fallback; }
}
/** Tells the Telegram copy (sync.ts) that records changed. */
export function dataChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('psyparent:data-changed'));
}
export function writeJSON(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); dataChanged(); return true; }
  catch { failed(); return false; }
}
export function deleteLocalData() {
  try {
    // kora.sync.v1 stays: its deletion marks keep the Telegram copy from bringing the records back.
    const keys = Object.keys(localStorage).filter(k => k.startsWith('parentguide.') || k.startsWith('psyparent.') || (k.startsWith('kora.') && k !== 'kora.sync.v1'));
    keys.forEach(k => localStorage.removeItem(k));
    dataChanged();
    window.dispatchEvent(new Event('psyparent:visit-updated'));
    window.dispatchEvent(new Event('psyparent:all-data-cleared'));
    return true;
  } catch { failed(); return false; }
}
