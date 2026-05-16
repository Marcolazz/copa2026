import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, '..', '..');
export const dataDir = path.join(rootDir, 'data');
export const cardsPath = path.join(dataDir, 'cards.json');
export const collectionPath = path.join(dataDir, 'collection.json');

export class AppError extends Error {
  constructor(message, status = 400, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function readJson(filePath, label) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') throw new AppError(`${label} ausente.`, 404);
    if (error instanceof SyntaxError) throw new AppError(`${label} está com JSON corrompido.`, 500);
    throw new AppError(`Falha ao ler ${label}.`, 500, error.message);
  }
}

export async function writeJson(filePath, data, label) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  } catch (error) {
    throw new AppError(`Falha ao salvar ${label}.`, 500, error.message);
  }
}

export async function getCards() {
  const cards = await readJson(cardsPath, 'cards.json');
  if (!Array.isArray(cards)) throw new AppError('cards.json deve conter uma lista.', 500);
  return cards;
}

export function buildEmptyCollection(cards) {
  return cards.reduce((collection, section) => {
    section.cards.forEach((card) => {
      collection[card] = 0;
    });
    return collection;
  }, {});
}

export function normalizeCollection(cards, collection = {}) {
  const empty = buildEmptyCollection(cards);
  return Object.fromEntries(
    Object.keys(empty).map((code) => [code, Math.max(0, Number.parseInt(collection[code] ?? 0, 10) || 0)]),
  );
}

export async function getCollection() {
  const cards = await getCards();
  try {
    const current = await readJson(collectionPath, 'collection.json');
    const normalized = normalizeCollection(cards, current);
    if (JSON.stringify(current) !== JSON.stringify(normalized)) {
      await writeJson(collectionPath, normalized, 'collection.json');
    }
    return normalized;
  } catch (error) {
    if (error.status === 404) {
      const empty = buildEmptyCollection(cards);
      await writeJson(collectionPath, empty, 'collection.json');
      return empty;
    }
    throw error;
  }
}

export async function saveCollection(collection) {
  const cards = await getCards();
  const normalized = normalizeCollection(cards, collection);
  await writeJson(collectionPath, normalized, 'collection.json');
  return normalized;
}
