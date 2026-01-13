type VisitState = {
  questions: string[];
  meds: string[]; // medication ids
  notes: Record<string, string>; // medId -> dose/regimen/comment
};

const KEY = 'parentguide.visit.v1';

/**
 * Legacy keys (older code paths may still write here)
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

function normalizeNotes(raw: any): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const id = (k ?? '').toString().trim();
    const note = (v ?? '').toString();
    if (!id) continue;
    if (note.trim() === '') continue;
    out[id] = note;
  }
  return out;
}

function normalize(raw: any): VisitState {
  // Very old legacy: array of questions only
  if (Array.isArray(raw)) {
    return { questions: uniq(raw), meds: [], notes: {} };
  }

  // Current: object with questions/meds/notes
  if (raw && typeof raw === 'object') {
    const questions = Array.isArray(raw.questions) ? raw.questions : [];
    const meds = Array.isArray(raw.meds) ? raw.meds : [];

    // notes might be stored under "notes" (new) or "medNotes" (some variants)
    const notesRaw = (raw.notes ?? raw.medNotes ?? raw.medsNotes) as any;

    return {
      questions: uniq(questions),
      meds: uniq(meds),
      notes: normalizeNotes(notesRaw),
    };
  }

  return { questions: [], meds: [], notes: {} };
}

function merge(a: VisitState, b: VisitState): VisitState {
  // b can only add questions/meds; notes are taken from a (primary)
  return {
    questions: uniq([...(a.questions ?? []), ...(b.questions ?? [])]),
    meds: uniq([...(a.meds ?? []), ...(b.meds ?? [])]),
    notes: { ...(a.notes ?? {}) },
  };
}

export function getVisit(): VisitState {
  const primary = normalize(safeParse(KEY));

  // Legacy stores: arrays only
  const legacyQRaw = safeParse(LEGACY_Q);
  const legacyMRaw = safeParse(LEGACY_M);

  const legacy: VisitState = {
    questions: Array.isArray(legacyQRaw) ? uniq(legacyQRaw) : [],
    meds: Array.isArray(legacyMRaw) ? uniq(legacyMRaw) : [],
    notes: {},
  };

  // Ensure notes only for meds that exist (clean up)
  const merged = merge(primary, legacy);
  const medSet = new Set(merged.meds);
  const notes: Record<string, string> = {};
  for (const [id, note] of Object.entries(merged.notes ?? {})) {
    if (medSet.has(id) && note.trim() !== '') notes[id] = note;
  }
  return { ...merged, notes };
}

function setVisit(next: VisitState) {
  const safe: VisitState = {
    questions: uniq(next.questions ?? []),
    meds: uniq(next.meds ?? []),
    notes: normalizeNotes(next.notes ?? {}),
  };

  // Write primary (includes notes)
  localStorage.setItem(KEY, JSON.stringify(safe));

  // Write legacy arrays for older code paths
  localStorage.setItem(LEGACY_Q, JSON.stringify(safe.questions));
  localStorage.setItem(LEGACY_M, JSON.stringify(safe.meds));

  // Same-tab updates
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function clearVisit() {
  setVisit({ questions: [], meds: [], notes: {} });
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
  const nextNotes = { ...(cur.notes ?? {}) };
  delete nextNotes[id];

  setVisit({
    ...cur,
    meds: cur.meds.filter((x) => x !== id),
    notes: nextNotes,
  });
}

/** NEW: set or clear note for a medication */
export function setVisitMedicationNote(medId: string, note: string) {
  const id = (medId ?? '').toString().trim();
  if (!id) return;

  const cur = getVisit();
  const nextNotes = { ...(cur.notes ?? {}) };

  const v = (note ?? '').toString();
  if (v.trim() === '') delete nextNotes[id];
  else nextNotes[id] = v;

  // If someone sets a note, ensure the med is present
  const meds = cur.meds.includes(id) ? cur.meds : [...cur.meds, id];

  setVisit({ ...cur, meds, notes: nextNotes });
}

/** Backward-compatible aliases */
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
