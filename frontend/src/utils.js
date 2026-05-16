export function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function normalizeQueryCode(query, sections = []) {
  const compact = normalizeSearch(query);
  const sorted = (Array.isArray(sections) ? sections : [])
    .map((section) => section?.code)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const code of sorted) {
    if (compact.startsWith(code)) {
      const number = compact.slice(code.length);
      if (/^\d+$/.test(number)) return `${code}${Number.parseInt(number, 10)}`;
    }
  }
  return compact;
}

export function sectionStats(section = {}, collection = {}) {
  const cards = Array.isArray(section?.cards) ? section.cards : [];
  const total = cards.length;
  const owned = cards.filter((code) => Number(collection?.[code] || 0) > 0).length;
  const missing = total - owned;
  const duplicates = cards.reduce((sum, code) => sum + Math.max(0, Number(collection?.[code] || 0) - 1), 0);
  return { total, owned, missing, duplicates, percent: total ? Math.round((owned / total) * 100) : 0 };
}

export function cardStatus(quantity) {
  const safeQuantity = Math.max(0, Number(quantity || 0));
  if (safeQuantity <= 0) return 'missing';
  if (safeQuantity === 1) return 'owned';
  return 'duplicate';
}
