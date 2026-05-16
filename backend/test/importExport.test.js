import test from 'node:test';
import assert from 'node:assert/strict';
import { getCards } from '../src/store.js';
import { normalizeCardCode } from '../src/cards.js';
import { buildExport, parseImportText } from '../src/importExport.js';

test('normaliza variações de código', async () => {
  const cards = await getCards();
  assert.equal(normalizeCardCode('RSA1', cards), 'RSA1');
  assert.equal(normalizeCardCode('RSA 01', cards), 'RSA1');
  assert.equal(normalizeCardCode('esp01', cards), 'ESP1');
});

test('importa formato por códigos e conta repetidas', async () => {
  const cards = await getCards();
  const preview = parseImportText('RSA1, RSA 01, KOR3, XXX99', cards);
  assert.equal(preview.additions.RSA1, 2);
  assert.equal(preview.additions.KOR3, 1);
  assert.equal(preview.totalFound, 3);
  assert.equal(preview.totalInvalid, 1);
});

test('importa formato seção - números', async () => {
  const cards = await getCards();
  const preview = parseImportText('FWC - 1, 1, 14', cards);
  assert.deepEqual(preview.additions, { FWC1: 2, FWC14: 1 });
});

test('exporta agrupado na ordem do checklist', async () => {
  const cards = await getCards();
  const collection = { FWC1: 3, COL5: 1, ESP9: 0 };
  assert.equal(buildExport(cards, collection, 'duplicates'), 'FWC - 1, 1\n');
  assert.match(buildExport(cards, collection, 'missing'), /^FWC - 2, 3/);
});
