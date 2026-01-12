const STORAGE_KEY = 'parentguide:visitQuestions';

export type VisitQuestion = {
  id: string;
  text: string;
  createdAt: number;
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function load(): VisitQuestion[] {
  const data = safeParse<VisitQuestion[]>(localStorage.getItem(STORAGE_KEY));
  if (!Array.isArray(data)) return [];
  // sanitize
  return data
    .filter((x) => x && typeof x.text === 'string')
    .map((x) => ({
      id: typeof x.id === 'string' ? x.id : cryptoId(),
      text: x.text,
      createdAt: typeof x.createdAt === 'number' ? x.createdAt : Date.now()
    }));
}

function save(items: VisitQuestion[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function cryptoId() {
  // works in modern browsers; fallback just in case
  // @ts-ignore
  return (globalThis.crypto?.randomUUID?.() ?? `q_${Date.now()}_${Math.random().toString(16).slice(2)}`);
}

/** Add a question (deduplicates by text). */
export function addVisitQuestion(text: string) {
  const t = (text ?? '').trim();
  if (!t) return;

  const items = load();
  const exists = items.some((q) => q.text.toLowerCase() === t.toLowerCase());
  if (exists) return;

  items.unshift({ id: cryptoId(), text: t, createdAt: Date.now() });
  save(items);
}

/** Get all saved questions (newest first). */
export function getVisitQuestions(): VisitQuestion[] {
  return load().sort((a, b) => b.createdAt - a.createdAt);
}

/** Remove one question by id. */
export function removeVisitQuestion(id: string) {
  const items = load().filter((q) => q.id !== id);
  save(items);
}

/** Clear all questions. */
export function clearVisitQuestions() {
  save([]);
}

/** Export questions as plain text for copying. */
export function exportVisitText(title = 'Вопросы к врачу'): string {
  const items = getVisitQuestions();
  if (!items.length) return `${title}:\n— (пока пусто)`;
  return `${title}:\n` + items.map((q, i) => `${i + 1}. ${q.text}`).join('\n');
}
