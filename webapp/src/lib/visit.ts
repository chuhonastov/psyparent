type VisitState = {
  questions: string[];
  meds: string[];
};

const KEY = 'parentguide.visit.v1';

/**
 * Legacy keys (for backward compatibility)
 * Some parts of the app may still write here.
 */
const LEGACY_Q = 'parentguide.visit.questions.v1';
const LEGACY_M = 'parentguide.visit.meds.v1';

const EVENT = 'parentguide:visit:updated';

function uniq(arr: string[]) {
  const out: string[] = [];
  const s = new Set<string>();
  for (const x of arr) {
    const v = (x ?? '').toString().trim();
    if (!v) continue;
    if (s.has(v)) continue;
    s.add(v);
    out.push(v);
  }
  return out;
}

function safeParse(key: string): any {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalize(raw: any): VisitState {
  // Legacy: sometimes stored as array of questions
  if (Array.isArray(raw)) {
    return { questions: uniq(raw), meds: [] };
  }

  // Current: object with questions/meds
  if (raw && typeof raw === 'object') {
    const questions = Array.isArray(raw.questions) ? raw.questions : [];
    const meds = Array.isArray(raw.meds) ? raw.meds : [];
    return { questions: uniq(questions), meds: uniq(meds) };
  }

  return { questions: [], meds: [] };
}

function merge(a: VisitState, b: VisitState): VisitState {
  return {
    questions: uniq([...(a.questions ?? []), ...(b.questions ?? [])]),
    meds: uniq([...(a.meds ?? []), ...(b.meds ?? [])]),
  };
}

export function getVisit(): VisitState {
  const primary = normalize(safeParse(KEY));

  // Read legacy stores (if any)
  const legacyQRaw = safeParse(LEGACY_Q);
  const legacyMRaw = safeParse(LEGACY_M);

  const legacy: VisitState = {
    questions: Array.isArray(legacyQRaw) ? uniq(legacyQRaw) : [],
    meds: Array.isArray(legacyMRaw) ? uniq(legacyMRaw) : [],
  };

  return merge(primary, legacy);
}

function setVisit(next: VisitState) {
  const safe: VisitState = {
    questions: uniq(next.questions),
    meds: uniq(next.meds),
  };

  // Write primary
  localStorage.setItem(KEY, JSON.stringify(safe));

  // Also write legacy arrays for older code paths
  localStorage.setItem(LEGACY_Q, JSON.stringify(safe.questions));
  localStorage.setItem(LEGACY_M, JSON.stringify(safe.meds));

  // Same-tab updates (storage event does not fire in same tab)
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function clearVisit() {
  setVisit({ questions: [], meds: [] });
}

export function addVisitQuestion(text: string) {
  const q = (text ?? '').toString().trim();
  if (!q) return;

  const cur = getVisit();
  if (cur.questions.includes(q)) return;

  setVisit({ ...cur, questions: [...cur.questions, q] });
}

export function removeVisitQuestion(text: string) {
  const q = (text ?? '').toString().trim();
  if (!q) return;

  const cur = getVisit();
  setVisit({ ...cur, questions: cur.questions.filter((x) => x !== q) });
}

function extractMedId(medOrId: any): string {
  if (typeof medOrId === 'string') return medOrId.trim();
  if (medOrId && typeof medOrId === 'object') {
    if (typeof medOrId.id === 'string') return medOrId.id.trim();
    if (typeof medOrId.medId === 'string') return medOrId.medId.trim();
    if (typeof medOrId.slug === 'string') return medOrId.slug.trim();
  }
  return '';
}

export function addVisitMedication(medOrId: any) {
  const id = extractMedId(medOrId);
  if (!id) return;

  const cur = getVisit();
  if (cur.meds.includes(id)) return;

  setVisit({ ...cur, meds: [...cur.meds, id] });
}

export function removeVisitMedication(medOrId: any) {
  const id = extractMedId(medOrId);
  if (!id) return;

  const cur = getVisit();
  setVisit({ ...cur, meds: cur.meds.filter((x) => x !== id) });
}

/** Backward-compatible aliases (in case some files import old names) */
export const addVisitMed = addVisitMedication;
export const removeVisitMed = removeVisitMedication;
export const addVisitDrug = addVisitMedication;
export const removeVisitDrug = removeVisitMedication;

export function subscribeVisit(onChange: () => void) {
  const handler = () => onChange();
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === LEGACY_Q || e.key === LEGACY_M) onChange();
  };

  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', onStorage);
  };
}
