export function normalizeQuery(value: string) {
  return value.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/gi, ' ').trim();
}
export function matchesQuery(query: string, names: string[], description = '') {
  const q = normalizeQuery(query);
  if (!q) return true;
  const terms = q.split(/\s+/);
  const namesText = names.map(normalizeQuery);
  const words = normalizeQuery(names.join(' ') + ' ' + description).split(/\s+/);
  if (namesText.includes(q)) return true;
  return terms.every(term => words.some(word => term.length <= 3 ? word === term : word.startsWith(term)));
}
