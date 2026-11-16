import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import EntryForm from './components/EntryForm.jsx';
import EntryList from './components/EntryList.jsx';
import Trends from './components/Trends.jsx';

const TABS = [
  { id: 'log', label: 'Log' },
  { id: 'trends', label: 'Trends' },
  { id: 'history', label: 'History' },
];

export default function App() {
  const [tab, setTab] = useState('log');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [version, setVersion] = useState(0); // bumps after every change so Trends refetches

  const load = useCallback(async () => {
    setError('');
    try {
      setEntries(await api.list());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changed = async () => { setEditing(null); setVersion((v) => v + 1); await load(); };

  const remove = async (entry) => {
    if (!window.confirm(`Delete the entry for ${entry.date}?`)) return;
    try { await api.remove(entry._id); await changed(); } catch (e) { setError(e.message); }
  };

  const startEdit = (entry) => { setEditing(entry); setTab('log'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Wellbeing Journal</h1>
          <p className="sub">A private place to notice your own patterns.</p>
        </div>
      </header>

      <nav className="tabs" role="tablist" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {error && <div className="alert" role="alert">{error} <button className="link" onClick={load}>Retry</button></div>}

      <main>
        {tab === 'log' && (
          <EntryForm key={editing?._id || 'new'} editing={editing} entries={entries}
            onSaved={changed} onCancel={() => setEditing(null)} />
        )}
        {tab === 'trends' && <Trends version={version} />}
        {tab === 'history' && (
          loading ? <p className="muted">Loading…</p> :
          <EntryList entries={entries} onEdit={startEdit} onDelete={remove} />
        )}
      </main>

      <footer className="footer">
        This journal shows patterns in what you enter. It does not diagnose or treat any condition.
        If you are struggling, consider talking to a doctor, counsellor or someone you trust.
      </footer>
    </div>
  );
}
