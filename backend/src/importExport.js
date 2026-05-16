import { AppError } from './store.js';
import { makeIndexes, normalizeCardCode, parseCardNumber } from './cards.js';

function tokenizeSimpleLine(line) {
  const regex = /[A-Za-z]{2,4}\s*0*\d+/g;
  return line.match(regex) || [];
}

export function parseImportText(text, cards) {
  if (!text || !text.trim()) throw new AppError('Importação vazia.', 400);
  const indexes = makeIndexes(cards);
  const additions = {};
  const invalid = [];
  let detectedFormat = null;

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new AppError('Importação vazia.', 400);

  for (const line of lines) {
    const dashMatch = line.match(/^([A-Za-z]{2,4})\s*-\s*(.+)$/);
    if (dashMatch) {
      detectedFormat = detectedFormat || 'section-numbers';
      const section = dashMatch[1].toUpperCase();
      const values = dashMatch[2].split(/[;,]/).map((item) => item.trim()).filter(Boolean);
      values.forEach((value) => {
        if (!/^0*\d+$/.test(value)) {
          invalid.push(value);
          return;
        }
        const normalized = normalizeCardCode(`${section}${value}`, cards);
        if (indexes.cardSet.has(normalized)) additions[normalized] = (additions[normalized] || 0) + 1;
        else invalid.push(`${section}${value}`);
      });
      continue;
    }

    const tokens = tokenizeSimpleLine(line);
    if (tokens.length) {
      detectedFormat = detectedFormat || 'card-codes';
      tokens.forEach((token) => {
        const normalized = normalizeCardCode(token, cards);
        if (indexes.cardSet.has(normalized)) additions[normalized] = (additions[normalized] || 0) + 1;
        else invalid.push(token);
      });
      const leftovers = line.replace(/[A-Za-z]{2,4}\s*0*\d+/g, '').split(/[;,\s]+/).filter(Boolean);
      invalid.push(...leftovers);
      continue;
    }

    invalid.push(line);
  }

  const totalFound = Object.values(additions).reduce((sum, count) => sum + count, 0);
  if (!detectedFormat && !totalFound) throw new AppError('Formato desconhecido.', 400, { invalid });

  return {
    token: Buffer.from(JSON.stringify({ additions })).toString('base64'),
    format: detectedFormat,
    additions,
    preview: Object.entries(additions).map(([code, quantity]) => ({ code, quantity })),
    totalFound,
    totalInvalid: invalid.length,
    invalid,
  };
}

export function applyImport(collection, importPreview) {
  const next = { ...collection };
  Object.entries(importPreview.additions || {}).forEach(([code, quantity]) => {
    next[code] = (next[code] || 0) + quantity;
  });
  return next;
}

export function decodeImportToken(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    if (!decoded || typeof decoded !== 'object' || !decoded.additions) throw new Error('invalid');
    return decoded;
  } catch {
    throw new AppError('Prévia de importação inválida ou expirada.', 400);
  }
}

export function buildExport(cards, collection, mode) {
  const lines = [];
  cards.forEach((section) => {
    const values = [];
    section.cards.forEach((card) => {
      const quantity = collection[card] || 0;
      const number = parseCardNumber(card);
      let repeat = 0;
      if (mode === 'all') repeat = quantity;
      if (mode === 'duplicates') repeat = Math.max(0, quantity - 1);
      if (mode === 'missing') repeat = quantity === 0 ? 1 : 0;
      for (let index = 0; index < repeat; index += 1) values.push(number);
    });
    if (values.length) lines.push(`${section.code} - ${values.join(', ')}`);
  });
  return `${lines.join('\n')}${lines.length ? '\n' : ''}`;
}
