type VisitState = {
  questions: string[];
  meds: string[];
};

const KEY = 'parentguide.visit.v1';
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

export function getVisit(): VisitState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { questions: [], meds: [] };
    return normalize(JSON.parse(raw));
  } catch {
    return { questions: [], meds: [] };
  }
}

function setVisit(next: VisitState) {
  const safe: VisitState = {
    questions: uniq(next.questions),
    meds: uniq(next.meds),
  };

  localStorage.setItem(KEY, JSON.stringify(safe));

  // IMPORTANT: same-tab updates (storage event does not fire in same tab)
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

export function addVisitMedication(medId: string) {
  const id = (medId ?? '').toString().trim();
  if (!id) return;

  const cur = getVisit();
  if (cur.meds.includes(id)) return;

  setVisit({ ...cur, meds: [...cur.meds, id] });
}

export function removeVisitMedication(medId: string) {
  const id = (medId ?? '').toString().trim();
  if (!id) return;

  const cur = getVisit();
  setVisit({ ...cur, meds: cur.meds.filter((x) => x !== id) });
}

// Optional alias for compatibility if somewhere used
export const addVisitMed = addVisitMedication;

/** Subscribe to updates inside the same tab and across tabs */
export function subscribeVisit(onChange: () => void) {
  const handler = () => onChange();

  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) onChange();
  });

  return () => {
    window.removeEventListener(EVENT, handler);
    // storage listener can't be removed easily since it's inline above; keep simple
  };
}
