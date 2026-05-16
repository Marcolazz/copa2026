export function stripAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function compact(value) {
  return stripAccents(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function makeIndexes(cards) {
  const cardSet = new Set();
  const bySection = new Map();
  const cardToSection = new Map();

  cards.forEach((section) => {
    bySection.set(section.code, section);
    section.cards.forEach((card) => {
      cardSet.add(card);
      cardToSection.set(card, section.code);
    });
  });

  return { cardSet, bySection, cardToSection };
}

export function normalizeCardCode(input, cards) {
  const token = compact(input);
  const sections = cards.map((section) => section.code).sort((a, b) => b.length - a.length);
  for (const code of sections) {
    if (token.startsWith(code)) {
      const number = token.slice(code.length);
      if (/^\d+$/.test(number)) {
        return `${code}${Number.parseInt(number, 10)}`;
      }
    }
  }
  return token;
}

export function parseCardNumber(cardCode) {
  const match = String(cardCode).match(/^(\D+)(\d+)$/);
  return match ? Number.parseInt(match[2], 10) : null;
}

export function summarize(cards, collection) {
  let total = 0;
  let owned = 0;
  let missing = 0;
  let duplicates = 0;

  cards.forEach((section) => {
    section.cards.forEach((card) => {
      const quantity = collection[card] || 0;
      total += 1;
      if (quantity > 0) owned += 1;
      if (quantity === 0) missing += 1;
      if (quantity > 1) duplicates += quantity - 1;
    });
  });

  return { total, owned, missing, duplicates, percent: total ? Math.round((owned / total) * 1000) / 10 : 0 };
}
