import express from 'express';
import { getCards, getCollection, saveCollection, AppError } from './store.js';
import { summarize } from './cards.js';
import { applyImport, buildExport, decodeImportToken, parseImportText } from './importExport.js';

const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export function createApp() {
  const app = express();
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  });
  app.use(express.json({ limit: '2mb' }));

  app.get('/cards', asyncHandler(async (_req, res) => {
    res.json(await getCards());
  }));

  app.get('/collection', asyncHandler(async (_req, res) => {
    const cards = await getCards();
    const collection = await getCollection();
    res.json({ collection, summary: summarize(cards, collection) });
  }));

  app.post('/collection', asyncHandler(async (req, res) => {
    const collection = await saveCollection(req.body?.collection || req.body || {});
    const cards = await getCards();
    res.json({ collection, summary: summarize(cards, collection) });
  }));

  app.post('/import', asyncHandler(async (req, res) => {
    const cards = await getCards();
    res.json(parseImportText(req.body?.text || '', cards));
  }));

  app.post('/import/confirm', asyncHandler(async (req, res) => {
    const preview = req.body?.token ? decodeImportToken(req.body.token) : { additions: req.body?.additions || {} };
    const current = await getCollection();
    const collection = await saveCollection(applyImport(current, preview));
    const cards = await getCards();
    res.json({ collection, summary: summarize(cards, collection) });
  }));

  app.get('/export/:mode(all|duplicates|missing)', asyncHandler(async (req, res) => {
    const cards = await getCards();
    const collection = await getCollection();
    const text = buildExport(cards, collection, req.params.mode);
    res.type('text/plain').send(text);
  }));

  app.use((req, res) => {
    res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
  });

  app.use((error, _req, res, _next) => {
    const status = error instanceof AppError ? error.status : 500;
    res.status(status).json({ error: error.message || 'Erro interno.', details: error.details });
  });

  return app;
}

const isEntryPoint = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isEntryPoint) {
  const port = Number.parseInt(process.env.PORT || '3001', 10);
  createApp().listen(port, () => {
    console.log(`Backend disponível em http://localhost:${port}`);
  });
}
