export type VisitSheet = {
  createdAt: string;
  items: string[];
};

const KEY = 'parentguide.visitSheet.v1';

export function loadVisitSheet(): VisitSheet {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { createdAt: new Date().toISOString(), items: [] };
  try {
    const parsed = JSON.parse(raw) as VisitSheet;
    if (!Array.isArray(parsed.items)) throw new Error('bad');
    return parsed;
  } catch {
    return { createdAt: new Date().toISOString(), items: [] };
  }
}

export function saveVisitSheet(sheet: VisitSheet) {
  localStorage.setItem(KEY, JSON.stringify(sheet));
}
