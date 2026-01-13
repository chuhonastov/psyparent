type MedDetail = {
  dose?: string;
  schedule?: string;
  goal?: string;
  monitoring?: string;
  warnings?: string; // NEW: "Важно"
  note?: string;     // free text
};

type VisitState = {
  questions: string[];
  meds: string[];
  medDetails: Record<string, MedDetail>;
};

const KEY = 'parentguide.visit.v1';
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

function cleanStr(v: any): string | undefined {
  const s = (v ?? '').toString();
  const t = s.trim();
  return t ? s : undefined;
}

function normalizeMedDetail(raw: any): MedDetail {
  if (!raw || typeof raw !== 'object') return {};
  const d: MedDetail = {};

  const dose = cleanStr((raw as any).dose);
  const schedule = cleanStr((raw as any).schedule);
  const goal = cleanStr((raw as any).goal);
  const monitoring = cleanStr((raw as any).monitoring);
  const warnings = cleanStr((raw as any).warnings); // NEW
  const note = cleanStr((raw as any).note);

  if (dose) d.dose = dose;
  if (schedule) d.schedule = schedule;
  if (goal) d.goal = goal;
  if (monitoring) d.monitoring = monitoring;
  if (warnings) d.warnings = warnings;
  if (note) d.note = note;

  return d;
}

function normalizeMedDetails(raw: any): Record<string, MedDetail> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, MedDetail> = {};

  for (const [k, v] of Object.entries(raw)) {
    const id = (k ?? '').toString().trim();
    if (!id) continue;

    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const d = normalizeMedDetail(v);
      if (Object.keys(d).length) out[id] = d;
      continue;
    }

    const note = cleanStr(v);
    if (note) out[id] = { note };
  }

  return out;
}

function normalize(raw: any): VisitState {
  if (Array.isArray(raw)) {
    return { questions: uniq(raw), meds: [], medDetails: {} };
  }

  if (raw && typeof raw === 'object') {
    const questions = Array.isArray((raw as any).questions) ? (raw as any).questions : [];
    const meds = Array.isArray((raw as any).meds) ? (raw as any).meds : [];

    const mdRaw = (raw as any).medDetails ?? (raw as any).details ?? (raw as any).medsDetails;

    // older versions: notes per med
    const legacyNotesRaw = (raw as any).notes ?? (raw as any).medNotes ?? (raw as any).medsNotes;

    const medDetailsFromNew = normalizeMedDetails(mdRaw);
    const medDetailsFromNotes = normalizeMedDetails(legacyNotesRaw);

    return {
      questions: uniq(questions),
      meds: uniq(meds),
      medDetails: { ...medDetailsFromNotes, ...medDetailsFromNew },
    };
  }

  return { questions: [], meds: [], medDetails: {} };
}

function merge(a: VisitState, b: VisitState): VisitState {
  return {
    questions: uniq([...(a.questions ?? []), ...(b.questions ?? [])]),
    meds: uniq([...(a.meds ?? []), ...(b.meds ?? [])]),
    medDetails: { ...(a.medDetails ?? {}) },
  };
}

export function getVisit(): VisitState {
  const primary = normalize(safeParse(KEY));

  const legacyQRaw = safeParse(LEGACY_Q);
  const legacyMRaw = safeParse(LEGACY_M);

  const legacy: VisitState = {
    questions: Array.isArray(legacyQRaw) ? uniq(legacyQRaw) : [],
    meds: Array.isArray(legacyMRaw) ? uniq(legacyMRaw) : [],
    medDetails: {},
  };

  const merged = merge(primary, legacy);

  const medSet = new Set(merged.meds);
  const md: Record<string, MedDetail> = {};
  for (const [id, d] of Object.entries(merged.medDetails ?? {})) {
    if (!medSet.has(id)) continue;
    if (d && typeof d === 'object' && Object.keys(d).length) md[id] = d;
  }

  return { ...merged, medDetails: md };
}

function setVisit(next: VisitState) {
  const safe: VisitState = {
    questions: uniq(next.questions ?? []),
    meds: uniq(next.meds ?? []),
    medDetails: normalizeMedDetails(next.medDetails ?? {}),
  };

  localStorage.setItem(KEY, JSON.stringify(safe));
  localStorage.setItem(LEGACY_Q, JSON.stringify(safe.questions));
  localStorage.setItem(LEGACY_M, JSON.stringify(safe.meds));

  window.dispatchEvent(new CustomEvent(EVENT));
}

export function clearVisit() {
  setVisit({ questions: [], meds: [], medDetails: {} });
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
    if (typeof (medOrId as any).id === 'string') return (medOrId as any).id.trim();
    if (typeof (medOrId as any).medId === 'string') return (medOrId as any).medId.trim();
    if (typeof (medOrId as any).slug === 'string') return (medOrId as any).slug.trim();
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
  const nextDetails = { ...(cur.medDetails ?? {}) };
  delete nextDetails[id];

  setVisit({
    ...cur,
    meds: cur.meds.filter((x) => x !== id),
    medDetails: nextDetails,
  });
}

export function setVisitMedicationField(medId: string, field: keyof MedDetail, value: string) {
  const id = (medId ?? '').toString().trim();
  if (!id) return;

  const cur = getVisit();
  const nextDetails: Record<string, MedDetail> = { ...(cur.medDetails ?? {}) };
  const prev: MedDetail = nextDetails[id] ?? {};

  const v = (value ?? '').toString();
  const t = v.trim();

  const next: MedDetail = { ...prev };
  if (!t) delete (next as any)[field];
  else (next as any)[field] = v;

  if (Object.keys(next).length === 0) delete nextDetails[id];
  else nextDetails[id] = next;

  const meds = cur.meds.includes(id) ? cur.meds : [...cur.meds, id];

  setVisit({ ...cur, meds, medDetails: nextDetails });
}

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
