const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(payload?.error || payload || 'Erro inesperado.');
  return payload;
}

export const api = {
  getCards: () => request('/cards'),
  getCollection: () => request('/collection'),
  saveCollection: (collection) => request('/collection', { method: 'POST', body: JSON.stringify({ collection }) }),
  previewImport: (text) => request('/import', { method: 'POST', body: JSON.stringify({ text }) }),
  confirmImport: (token) => request('/import/confirm', { method: 'POST', body: JSON.stringify({ token }) }),
  exportText: (mode) => request(`/export/${mode}`, { headers: {} }),
};
