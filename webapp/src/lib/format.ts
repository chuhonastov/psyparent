export function cleanTitle(raw: string): string {
  const s = (raw ?? '').toString();

  // Убираем любые пометки в круглых скобках: "(примечание)", "(сон)" и т.п.
  const noParens = s.replace(/\s*\([^)]*\)\s*/g, ' ');

  // Нормализуем пробелы
  return noParens.replace(/\s{2,}/g, ' ').trim();
}
