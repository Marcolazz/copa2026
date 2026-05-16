import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { cardStatus, normalizeQueryCode, normalizeSearch, sectionStats } from './utils.js';

const EMPTY_SUMMARY = Object.freeze({ total: 0, owned: 0, missing: 0, duplicates: 0, percent: 0 });

const FILTERS = Object.freeze({
  all: { title: 'Todas as figurinhas', empty: 'Nenhuma figurinha cadastrada neste filtro.' },
  owned: { title: 'Figurinhas que tenho', empty: 'Você ainda não marcou nenhuma figurinha como tenho.' },
  missing: { title: 'Figurinhas faltantes', empty: 'Parabéns! Nenhuma figurinha faltante neste filtro.' },
  duplicates: { title: 'Figurinhas repetidas', empty: 'Você ainda não tem figurinhas repetidas.' },
});

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asCollection(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function buildSummary(cards, collection) {
  const safeCards = asArray(cards);
  const safeCollection = asCollection(collection);
  let total = 0;
  let owned = 0;
  let missing = 0;
  let duplicates = 0;

  safeCards.forEach((section) => {
    asArray(section?.cards).forEach((code) => {
      const quantity = Math.max(0, safeNumber(safeCollection?.[code]));
      total += 1;
      if (quantity > 0) owned += 1;
      if (quantity === 0) missing += 1;
      if (quantity > 1) duplicates += quantity - 1;
    });
  });

  return { total, owned, missing, duplicates, percent: total ? Math.round((owned / total) * 1000) / 10 : 0 };
}

function normalizeSummary(summary, cards, collection) {
  const fallback = buildSummary(cards, collection);
  const source = summary && typeof summary === 'object' ? summary : fallback;
  return {
    total: safeNumber(source.total, fallback.total),
    owned: safeNumber(source.owned, fallback.owned),
    missing: safeNumber(source.missing, fallback.missing),
    duplicates: safeNumber(source.duplicates, fallback.duplicates),
    percent: safeNumber(source.percent, fallback.percent),
  };
}

function shouldShowCard(quantity, filter) {
  if (filter === 'owned') return quantity > 0;
  if (filter === 'missing') return quantity === 0;
  if (filter === 'duplicates') return quantity > 1;
  return true;
}

function cardMatchesQuery(section, code, query, allSections) {
  const normalized = normalizeSearch(query);
  if (!normalized) return true;
  const codeQuery = normalizeQueryCode(query, allSections);
  const haystack = [section?.code, section?.namePt, section?.nameEn, code].map(normalizeSearch);
  return haystack.some((item) => item.includes(normalized) || item.includes(codeQuery));
}

function StatCard({ label, value, tone = '', onClick, active = false, hint = '' }) {
  const className = `stat ${tone} ${onClick ? 'clickable' : ''} ${active ? 'active' : ''}`.trim();
  const content = <><span>{label}</span><strong>{value ?? 0}</strong>{hint ? <small>{hint}</small> : null}</>;

  if (onClick) {
    return <button type="button" className={className} onClick={onClick} aria-pressed={active}>{content}</button>;
  }

  return <div className={className}>{content}</div>;
}

function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return <div className="error pageError" role="alert">
    <span>{message}</span>
    {onRetry ? <button type="button" onClick={onRetry}>Tentar novamente</button> : null}
  </div>;
}

function LoadingState() {
  return <main><div className="loadingCard">Carregando checklist e coleção...</div></main>;
}

function ImportModal({ onClose, onImported }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  async function handlePreview() {
    setError('');
    setPreview(null);
    setIsBusy(true);
    try {
      const nextPreview = await api.previewImport(text);
      setPreview({
        ...nextPreview,
        preview: asArray(nextPreview?.preview),
        invalid: asArray(nextPreview?.invalid),
        totalFound: safeNumber(nextPreview?.totalFound),
        totalInvalid: safeNumber(nextPreview?.totalInvalid),
      });
    } catch (err) {
      setError(err?.message || 'Falha ao gerar prévia da importação.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleFile(event) {
    setError('');
    const file = event?.target?.files?.[0];
    if (!file) return;
    try {
      setText(await file.text());
      setPreview(null);
    } catch {
      setError('Não foi possível ler o arquivo TXT selecionado.');
    }
  }

  async function confirm() {
    if (!preview?.token) return;
    setError('');
    setIsBusy(true);
    try {
      const result = await api.confirmImport(preview.token);
      const importedCollection = asCollection(result?.collection ?? result);
      onImported?.(importedCollection, normalizeSummary(result?.summary, [], importedCollection));
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Falha ao confirmar importação.');
    } finally {
      setIsBusy(false);
    }
  }

  return <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="import-title">
    <div className="modal">
      <button type="button" className="iconButton close" onClick={onClose} aria-label="Fechar importação">×</button>
      <h2 id="import-title">Importar TXT</h2>
      <p>Cole o texto ou selecione um arquivo .txt. A prévia valida as figurinhas antes de salvar.</p>
      <input type="file" accept=".txt,text/plain" onChange={handleFile} />
      <textarea value={text} onChange={(event) => { setText(event.target.value); setPreview(null); }} placeholder="FWC - 1, 1, 14\nCOL - 5, 18" />
      {error ? <div className="error" role="alert">{error}</div> : null}
      {preview ? <div className="preview">
        <div className="previewGrid">
          <StatCard label="Encontradas" value={preview.totalFound} tone="green" />
          <StatCard label="Inválidas" value={preview.totalInvalid} tone="red" />
          <StatCard label="Formato" value={preview.format === 'section-numbers' ? 'Sigla - números' : 'Códigos'} />
        </div>
        <h3>Prévia</h3>
        <div className="chips">{preview.preview.map((item) => <span key={item?.code}>{item?.code} × {safeNumber(item?.quantity)}</span>)}</div>
        {preview.invalid.length ? <><h3>Códigos inválidos</h3><div className="chips invalid">{preview.invalid.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div></> : null}
      </div> : null}
      <div className="actions"><button type="button" disabled={isBusy} onClick={handlePreview}>{isBusy ? 'Processando...' : 'Gerar prévia'}</button><button type="button" disabled={isBusy || !preview?.token || preview.totalFound === 0} onClick={confirm}>Confirmar importação</button></div>
    </div>
  </div>;
}

function ExportModal({ onClose }) {
  const [mode, setMode] = useState('all');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    api.exportText(mode)
      .then((exportedText) => { if (active) setText(typeof exportedText === 'string' ? exportedText : ''); })
      .catch((err) => { if (active) setError(err?.message || 'Falha ao exportar TXT.'); });
    return () => { active = false; };
  }, [mode]);

  async function copyText() {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopyStatus('Texto copiado.');
    } catch {
      setCopyStatus('Não foi possível copiar automaticamente.');
    }
  }

  function download() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `figurinhas-${mode}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="export-title">
    <div className="modal">
      <button type="button" className="iconButton close" onClick={onClose} aria-label="Fechar exportação">×</button>
      <h2 id="export-title">Exportar TXT</h2>
      <div className="segmented">
        <button type="button" className={mode === 'all' ? 'active' : ''} onClick={() => setMode('all')}>Todas que tenho</button>
        <button type="button" className={mode === 'duplicates' ? 'active' : ''} onClick={() => setMode('duplicates')}>Repetidas</button>
        <button type="button" className={mode === 'missing' ? 'active' : ''} onClick={() => setMode('missing')}>Faltantes</button>
      </div>
      {error ? <div className="error" role="alert">{error}</div> : null}
      {copyStatus ? <div className="notice">{copyStatus}</div> : null}
      <textarea readOnly value={text || 'Nenhuma figurinha para este filtro.'} />
      <div className="actions"><button type="button" onClick={copyText}>Copiar texto</button><button type="button" onClick={download}>Baixar .txt</button></div>
    </div>
  </div>;
}

function SectionList({ cards, collection, query, onOpen }) {
  const safeCards = asArray(cards);
  const safeCollection = asCollection(collection);
  const filtered = useMemo(() => {
    const normalized = normalizeSearch(query);
    const codeQuery = normalizeQueryCode(query, safeCards);
    if (!normalized) return safeCards;
    return safeCards.filter((section) => {
      const haystack = [section?.code, section?.namePt, section?.nameEn, ...asArray(section?.cards)].map(normalizeSearch);
      return haystack.some((item) => item.includes(normalized) || item.includes(codeQuery));
    });
  }, [safeCards, query]);

  if (!filtered.length) {
    return <div className="emptyState">Nenhum país/seção encontrado para a busca atual.</div>;
  }

  return <div className="sections">
    {filtered.map((section, index) => {
      const stats = sectionStats(section, safeCollection);
      const sectionCode = section?.code || `section-${index}`;
      return <button type="button" className="sectionCard" key={sectionCode} onClick={() => onOpen?.(section?.code)}>
        <div className="sectionTop"><span className="badge">{section?.code || '---'}</span><span>{stats.percent}%</span></div>
        <h2>{section?.namePt || 'Sem nome'}</h2><p>{section?.nameEn || 'No name'}</p>
        <div className="progress"><span style={{ width: `${stats.percent}%` }} /></div>
        <div className="miniStats"><span>Total {stats.total}</span><span>Tenho {stats.owned}</span><span>Faltam {stats.missing}</span><span>Rep. {stats.duplicates}</span></div>
      </button>;
    })}
  </div>;
}

function StickerCard({ code, quantity, onQuantity }) {
  const safeQuantity = Math.max(0, safeNumber(quantity));
  return <div className={`sticker ${cardStatus(safeQuantity)}`} onClick={() => onQuantity?.(code, 1)} onContextMenu={(event) => { event.preventDefault(); onQuantity?.(code, -1); }}>
    <strong>{code}</strong><span>{safeQuantity === 0 ? 'Faltando' : safeQuantity === 1 ? 'Tenho' : 'Repetida'}</span><b>{safeQuantity}</b><button type="button" onClick={(event) => { event.stopPropagation(); onQuantity?.(code, -1); }} aria-label={`Diminuir ${code}`}>−</button>
  </div>;
}

function GlobalStickerView({ cards, collection, filter, query, onBack, onQuantity }) {
  const safeCards = asArray(cards);
  const safeCollection = asCollection(collection);
  const visibleSections = safeCards.map((section) => ({
    ...section,
    cards: asArray(section?.cards).filter((code) => shouldShowCard(safeNumber(safeCollection?.[code]), filter) && cardMatchesQuery(section, code, query, safeCards)),
  })).filter((section) => section.cards.length > 0);
  const totalVisible = visibleSections.reduce((sum, section) => sum + section.cards.length, 0);
  const meta = FILTERS?.[filter] || FILTERS.all;

  return <main>
    <div className="filterHeader">
      <div><p className="eyebrow dark">Visualização filtrada</p><h2>{meta.title}</h2><p>{totalVisible} figurinha(s) encontrada(s). Clique em uma figurinha para incrementar ou use −/clique direito para decrementar.</p></div>
      <button type="button" className="back" onClick={onBack}>Limpar filtro</button>
    </div>
    {!visibleSections.length ? <div className="emptyState">{meta.empty}</div> : null}
    {visibleSections.map((section, index) => <section className="globalSection" key={section?.code || `global-${index}`}>
      <div className="globalSectionHeader"><span className="badge">{section?.code || '---'}</span><strong>{section?.namePt || 'Sem nome'}</strong><span>{section.cards.length} resultado(s)</span></div>
      <div className="cardsGrid">
        {section.cards.map((code) => <StickerCard key={code} code={code} quantity={safeCollection?.[code]} onQuantity={onQuantity} />)}
      </div>
    </section>)}
  </main>;
}

function SectionDetail({ section, collection, onBack, onQuantity }) {
  const cards = asArray(section?.cards);
  const safeCollection = asCollection(collection);
  return <main>
    <button type="button" className="back" onClick={onBack}>← Voltar</button>
    <div className="detailHeader"><div><span className="badge">{section?.code || '---'}</span><h1>{section?.namePt || 'Sem nome'}</h1><p>{section?.nameEn || 'No name'}</p></div></div>
    {!cards.length ? <div className="emptyState">Nenhuma figurinha cadastrada nesta seção.</div> : null}
    <div className="cardsGrid">
      {cards.map((code) => <StickerCard key={code} code={code} quantity={safeCollection?.[code]} onQuantity={onQuantity} />)}
    </div>
  </main>;
}

export default function App() {
  const [cards, setCards] = useState([]);
  const [collection, setCollection] = useState({});
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [dashboardFilter, setDashboardFilter] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [cardData, collectionData] = await Promise.all([api.getCards(), api.getCollection()]);
      const safeCards = asArray(cardData);
      const safeCollection = asCollection(collectionData?.collection ?? collectionData);
      setCards(safeCards);
      setCollection(safeCollection);
      setSummary(normalizeSummary(collectionData?.summary, safeCards, safeCollection));
    } catch (err) {
      setCards([]);
      setCollection({});
      setSummary(EMPTY_SUMMARY);
      setError(err?.message || 'Falha ao carregar dados do backend em http://localhost:3001.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const currentSection = useMemo(() => asArray(cards).find((section) => section?.code === selected) || null, [cards, selected]);

  const changeQuantity = useCallback(async (code, delta) => {
    if (!code) return;
    const quantityDelta = safeNumber(delta);
    const next = { ...asCollection(collection), [code]: Math.max(0, safeNumber(collection?.[code]) + quantityDelta) };
    setCollection(next);
    setSummary(buildSummary(cards, next));
    setIsSaving(true);
    setError('');
    try {
      const saved = await api.saveCollection(next);
      const savedCollection = asCollection(saved?.collection ?? saved);
      setCollection(savedCollection);
      setSummary(normalizeSummary(saved?.summary, cards, savedCollection));
    } catch (err) {
      setError(err?.message || 'Falha ao salvar collection.json.');
    } finally {
      setIsSaving(false);
    }
  }, [cards, collection]);

  function openDashboardFilter(filter) {
    setSelected(null);
    setDashboardFilter((current) => current === filter ? null : filter);
  }

  function handleImported(newCollection, newSummary) {
    const safeCollection = asCollection(newCollection);
    setCollection(safeCollection);
    setSummary(normalizeSummary(newSummary, cards, safeCollection));
  }

  return <>
    <header className="hero">
      <div><p className="eyebrow">Panini Copa do Mundo 2026</p><h1>Controle de Figurinhas</h1><p>Gerencie figurinhas faltantes, coladas e repetidas com dados locais em JSON.</p></div>
      <div className="heroActions"><button type="button" onClick={() => setModal('import')}>Importar TXT</button><button type="button" onClick={() => setModal('export')}>Exportar TXT</button></div>
    </header>
    <ErrorMessage message={error} onRetry={loadData} />
    <section className="dashboard">
      <StatCard label="Completo" value={`${summary?.percent ?? 0}%`} />
      <StatCard label="Total geral" value={summary?.total ?? 0} onClick={() => openDashboardFilter('all')} active={dashboardFilter === 'all'} hint="ver todas" />
      <StatCard label="Tenho" value={summary?.owned ?? 0} tone="green" onClick={() => openDashboardFilter('owned')} active={dashboardFilter === 'owned'} hint="ver tenho" />
      <StatCard label="Faltantes" value={summary?.missing ?? 0} tone="red" onClick={() => openDashboardFilter('missing')} active={dashboardFilter === 'missing'} hint="ver faltantes" />
      <StatCard label="Repetidas" value={summary?.duplicates ?? 0} tone="orange" onClick={() => openDashboardFilter('duplicates')} active={dashboardFilter === 'duplicates'} hint="ver repetidas" />
    </section>
    {isSaving ? <div className="savingIndicator">Salvando...</div> : null}
    {isLoading ? <LoadingState /> : currentSection ? <SectionDetail section={currentSection} collection={collection} onBack={() => setSelected(null)} onQuantity={changeQuantity} /> : <>
      <main><div className="toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por RSA1, RSA 01, Brasil, South Africa..." /></div></main>
      {dashboardFilter ? <GlobalStickerView cards={cards} collection={collection} filter={dashboardFilter} query={query} onBack={() => setDashboardFilter(null)} onQuantity={changeQuantity} /> : <main><SectionList cards={cards} collection={collection} query={query} onOpen={setSelected} /></main>}
    </>}
    {modal === 'import' ? <ImportModal onClose={() => setModal(null)} onImported={handleImported} /> : null}
    {modal === 'export' ? <ExportModal onClose={() => setModal(null)} /> : null}
  </>;
}
