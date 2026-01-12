import WebApp from '@twa-dev/sdk';

/**
 * Basic Telegram WebApp initialization:
 * - expands view
 * - sets ready state
 */
export function initTwa() {
  try {
    WebApp.ready();
    WebApp.expand();
  } catch {
    // Running outside Telegram — ignore
  }
}

export function getTgUserFirstName(): string | null {
  try {
    return WebApp.initDataUnsafe?.user?.first_name ?? null;
  } catch {
    return null;
  }
}
