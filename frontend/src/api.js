const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  if (!rawText) return contentType.includes('application/json') ? {} : '';
  if (!contentType.includes('application/json')) return rawText;

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error('O backend retornou um JSON inválido.');
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new Error(`Não foi possível conectar ao backend em ${API_URL}. Verifique se o servidor está rodando.`);
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || payload || `Erro HTTP ${response.status}.`);
  }
  return payload;
}

export const api = {
  getCards: () => request('/cards'),
  getCollection: () => request('/collection'),
  saveCollection: (collection) => request('/collection', { method: 'POST', body: JSON.stringify({ collection: collection || {} }) }),
  previewImport: (text) => request('/import', { method: 'POST', body: JSON.stringify({ text: text || '' }) }),
  confirmImport: (token) => request('/import/confirm', { method: 'POST', body: JSON.stringify({ token }) }),
  exportText: (mode) => request(`/export/${mode}`),
};
