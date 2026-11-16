// Thin wrapper around fetch. Throws an Error with .details (field errors) when the API rejects a request.
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    const e = new Error('Cannot reach the server. Is the API running?');
    e.details = [];
    throw e;
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.message || 'Request failed');
    e.details = data.details || [];
    throw e;
  }
  return data;
}

export const api = {
  list: () => request('/entries'),
  stats: (days) => request(`/entries/stats?days=${days}`),
  create: (entry) => request('/entries', { method: 'POST', body: JSON.stringify(entry) }),
  update: (id, entry) => request(`/entries/${id}`, { method: 'PUT', body: JSON.stringify(entry) }),
  remove: (id) => request(`/entries/${id}`, { method: 'DELETE' }),
};

export const ROUTINES = [
  'exercise', 'meditation', 'outdoors', 'reading',
  'social time', 'screen-free evening', 'healthy meals', 'caffeine after 3pm',
];

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
