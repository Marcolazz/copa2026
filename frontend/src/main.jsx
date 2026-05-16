import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api.js';
import { cardStatus, normalizeQueryCode, normalizeSearch, sectionStats } from './utils.js';
import './styles.css';

function StatCard({ label, value, tone, onClick, active, hint }) {
  const className = `stat ${tone || ''} ${onClick ? 'clickable' : ''} ${active ? 'active' : ''}`;
  const content = <><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</>;
  if (onClick) {
    return <button type="button" className={className} onClick={onClick} aria-pressed={active}>{content}</button>;
  }
  return <div className={className}>{content}</div>;
}

const FILTERS = {
  all: { title: 'Todas as figurinhas', empty: 'Nenhuma figurinha cadastrada neste filtro.' },
  owned: { title: 'Figurinhas que tenho', empty: 'Você ainda não marcou nenhuma figurinha como tenho.' },
  missing: { title: 'Figurinhas faltantes', empty: 'Parabéns! Nenhuma figurinha faltante neste filtro.' },
  duplicates: { title: 'Figurinhas repetidas', empty: 'Você ainda não tem figurinhas repetidas.' },
};

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
  const haystack = [section.code, section.namePt, section.nameEn, code].map(normalizeSearch);
  return haystack.some((item) => item.includes(normalized) || item.includes(codeQuery));
}

function ImportModal({ onClose, onImported }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  async function handlePreview() {
    setError('');
    try { setPreview(await api.previewImport(text)); } catch (err) { setError(err.message); }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (file) setText(await file.text());
  }

  async function confirm() {
    setError('');
    try {
      const result = await api.confirmImport(preview.token);
      onImported(result.collection, result.summary);
      onClose();
    } catch (err) { setError(err.message); }
  }

  return <div className="overlay" role="dialog" aria-modal="true">
    <div className="modal">
      <button className="iconButton close" onClick={onClose}>×</button>
      <h2>Importar TXT</h2>
      <p>Cole o texto ou selecione um arquivo .txt. A prévia valida as figurinhas antes de salvar.</p>
      <input type="file" accept=".txt,text/plain" onChange={handleFile} />
      <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="FWC - 1, 1, 14\nCOL - 5, 18" />
      {error && <div className="error">{error}</div>}
      {preview && <div className="preview">
        <div className="previewGrid">
          <StatCard label="Encontradas" value={preview.totalFound} tone="green" />
          <StatCard label="Inválidas" value={preview.totalInvalid} tone="red" />
          <StatCard label="Formato" value={preview.format === 'section-numbers' ? 'Sigla - números' : 'Códigos'} />
        </div>
        <h3>Prévia</h3>
        <div className="chips">{preview.preview.map((item) => <span key={item.code}>{item.code} × {item.quantity}</span>)}</div>
        {!!preview.invalid.length && <><h3>Códigos inválidos</h3><div className="chips invalid">{preview.invalid.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div></>}
      </div>}
      <div className="actions"><button onClick={handlePreview}>Gerar prévia</button><button disabled={!preview || preview.totalFound === 0} onClick={confirm}>Confirmar importação</button></div>
    </div>
  </div>;
}

function ExportModal({ onClose }) {
  const [mode, setMode] = useState('all');
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api.exportText(mode).then(setText).catch((err) => setError(err.message)); }, [mode]);

  function download() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `figurinhas-${mode}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="overlay" role="dialog" aria-modal="true">
    <div className="modal">
      <button className="iconButton close" onClick={onClose}>×</button>
      <h2>Exportar TXT</h2>
      <div className="segmented">
        <button className={mode === 'all' ? 'active' : ''} onClick={() => setMode('all')}>Todas que tenho</button>
        <button className={mode === 'duplicates' ? 'active' : ''} onClick={() => setMode('duplicates')}>Repetidas</button>
        <button className={mode === 'missing' ? 'active' : ''} onClick={() => setMode('missing')}>Faltantes</button>
      </div>
      {error && <div className="error">{error}</div>}
      <textarea readOnly value={text || 'Nenhuma figurinha para este filtro.'} />
      <div className="actions"><button onClick={() => navigator.clipboard.writeText(text)}>Copiar texto</button><button onClick={download}>Baixar .txt</button></div>
    </div>
  </div>;
}

function SectionList({ cards, collection, query, onOpen }) {
  const filtered = useMemo(() => {
    const normalized = normalizeSearch(query);
    const codeQuery = normalizeQueryCode(query, cards);
    if (!normalized) return cards;
    return cards.filter((section) => {
      const haystack = [section.code, section.namePt, section.nameEn, ...section.cards].map(normalizeSearch);
      return haystack.some((item) => item.includes(normalized) || item.includes(codeQuery));
    });
  }, [cards, query]);

  return <div className="sections">
    {filtered.map((section) => {
      const stats = sectionStats(section, collection);
      return <button className="sectionCard" key={section.code} onClick={() => onOpen(section.code)}>
        <div className="sectionTop"><span className="badge">{section.code}</span><span>{stats.percent}%</span></div>
        <h2>{section.namePt}</h2><p>{section.nameEn}</p>
        <div className="progress"><span style={{ width: `${stats.percent}%` }} /></div>
        <div className="miniStats"><span>Total {stats.total}</span><span>Tenho {stats.owned}</span><span>Faltam {stats.missing}</span><span>Rep. {stats.duplicates}</span></div>
      </button>;
    })}
  </div>;
}

function GlobalStickerView({ cards, collection, filter, query, onBack, onQuantity }) {
  const visibleSections = cards.map((section) => ({
    ...section,
    cards: section.cards.filter((code) => shouldShowCard(collection[code] || 0, filter) && cardMatchesQuery(section, code, query, cards)),
  })).filter((section) => section.cards.length > 0);
  const totalVisible = visibleSections.reduce((sum, section) => sum + section.cards.length, 0);
  const meta = FILTERS[filter] || FILTERS.all;

  return <main>
    <div className="filterHeader">
      <div><p className="eyebrow dark">Visualização filtrada</p><h2>{meta.title}</h2><p>{totalVisible} figurinha(s) encontrada(s). Clique em uma figurinha para incrementar ou use −/clique direito para decrementar.</p></div>
      <button className="back" onClick={onBack}>Limpar filtro</button>
    </div>
    {visibleSections.length === 0 && <div className="emptyState">{meta.empty}</div>}
    {visibleSections.map((section) => <section className="globalSection" key={section.code}>
      <div className="globalSectionHeader"><span className="badge">{section.code}</span><strong>{section.namePt}</strong><span>{section.cards.length} resultado(s)</span></div>
      <div className="cardsGrid">
        {section.cards.map((code) => {
          const quantity = collection[code] || 0;
          return <div className={`sticker ${cardStatus(quantity)}`} key={code} onClick={() => onQuantity(code, 1)} onContextMenu={(event) => { event.preventDefault(); onQuantity(code, -1); }}>
            <strong>{code}</strong><span>{quantity === 0 ? 'Faltando' : quantity === 1 ? 'Tenho' : 'Repetida'}</span><b>{quantity}</b><button onClick={(event) => { event.stopPropagation(); onQuantity(code, -1); }}>−</button>
          </div>;
        })}
      </div>
    </section>)}
  </main>;
}

function SectionDetail({ section, collection, onBack, onQuantity }) {
  return <main>
    <button className="back" onClick={onBack}>← Voltar</button>
    <div className="detailHeader"><div><span className="badge">{section.code}</span><h1>{section.namePt}</h1><p>{section.nameEn}</p></div></div>
    <div className="cardsGrid">
      {section.cards.map((code) => {
        const quantity = collection[code] || 0;
        return <div className={`sticker ${cardStatus(quantity)}`} key={code} onClick={() => onQuantity(code, 1)} onContextMenu={(event) => { event.preventDefault(); onQuantity(code, -1); }}>
          <strong>{code}</strong><span>{quantity === 0 ? 'Faltando' : quantity === 1 ? 'Tenho' : 'Repetida'}</span><b>{quantity}</b><button onClick={(event) => { event.stopPropagation(); onQuantity(code, -1); }}>−</button>
        </div>;
      })}
    </div>
  </main>;
}

function App() {
  const [cards, setCards] = useState([]);
  const [collection, setCollection] = useState({});
  const [summary, setSummary] = useState({ total: 0, owned: 0, missing: 0, duplicates: 0, percent: 0 });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [dashboardFilter, setDashboardFilter] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getCards(), api.getCollection()]).then(([cardData, collectionData]) => {
      setCards(cardData); setCollection(collectionData.collection); setSummary(collectionData.summary);
    }).catch((err) => setError(err.message));
  }, []);

  async function changeQuantity(code, delta) {
    const next = { ...collection, [code]: Math.max(0, (collection[code] || 0) + delta) };
    setCollection(next);
    try { const saved = await api.saveCollection(next); setCollection(saved.collection); setSummary(saved.summary); }
    catch (err) { setError(err.message); }
  }

  const currentSection = cards.find((section) => section.code === selected);

  function openDashboardFilter(filter) {
    setSelected(null);
    setDashboardFilter((current) => current === filter ? null : filter);
  }

  return <>
    <header className="hero">
      <div><p className="eyebrow">Panini Copa do Mundo 2026</p><h1>Controle de Figurinhas</h1><p>Gerencie figurinhas faltantes, coladas e repetidas com dados locais em JSON.</p></div>
      <div className="heroActions"><button onClick={() => setModal('import')}>Importar TXT</button><button onClick={() => setModal('export')}>Exportar TXT</button></div>
    </header>
    {error && <div className="error pageError">{error}</div>}
    <section className="dashboard">
      <StatCard label="Completo" value={`${summary.percent}%`} />
      <StatCard label="Total geral" value={summary.total} onClick={() => openDashboardFilter('all')} active={dashboardFilter === 'all'} hint="ver todas" />
      <StatCard label="Tenho" value={summary.owned} tone="green" onClick={() => openDashboardFilter('owned')} active={dashboardFilter === 'owned'} hint="ver tenho" />
      <StatCard label="Faltantes" value={summary.missing} tone="red" onClick={() => openDashboardFilter('missing')} active={dashboardFilter === 'missing'} hint="ver faltantes" />
      <StatCard label="Repetidas" value={summary.duplicates} tone="orange" onClick={() => openDashboardFilter('duplicates')} active={dashboardFilter === 'duplicates'} hint="ver repetidas" />
    </section>
    {currentSection ? <SectionDetail section={currentSection} collection={collection} onBack={() => setSelected(null)} onQuantity={changeQuantity} /> : <>
      <main><div className="toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por RSA1, RSA 01, Brasil, South Africa..." /></div></main>
      {dashboardFilter ? <GlobalStickerView cards={cards} collection={collection} filter={dashboardFilter} query={query} onBack={() => setDashboardFilter(null)} onQuantity={changeQuantity} /> : <main><SectionList cards={cards} collection={collection} query={query} onOpen={setSelected} /></main>}
    </>}
    {modal === 'import' && <ImportModal onClose={() => setModal(null)} onImported={(newCollection, newSummary) => { setCollection(newCollection); setSummary(newSummary); }} />}
    {modal === 'export' && <ExportModal onClose={() => setModal(null)} />}
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
