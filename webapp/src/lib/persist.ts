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
export function writeJSON(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { failed(); return false; }
}
export function deleteLocalData() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('parentguide.') || k.startsWith('psyparent.'));
    keys.forEach(k => localStorage.removeItem(k));
    window.dispatchEvent(new Event('psyparent:visit-updated'));
    window.dispatchEvent(new Event('psyparent:all-data-cleared'));
    return true;
  } catch { failed(); return false; }
}
