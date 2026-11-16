import { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { api } from '../api.js';

const RANGES = [7, 14, 30, 90];
const short = (d) => d.slice(5); // MM-DD

function Delta({ now, before, invert }) {
  if (now == null || before == null) return <span className="muted">no earlier data</span>;
  const diff = Math.round((now - before) * 10) / 10;
  if (diff === 0) return <span className="muted">same as before</span>;
  const up = diff > 0;
  return <span className="muted">{up ? '▲' : '▼'} {Math.abs(diff)} vs previous period</span>;
}

export default function Trends({ version }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setError('');
    api.stats(days).then((d) => live && setData(d)).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [days, version]);

  const cards = data && [
    ['Average mood', 'mood', '/5'],
    ['Average energy', 'energy', '/5'],
    ['Average stress', 'stress', '/5'],
    ['Average sleep', 'sleepHours', ' h'],
  ];

  return (
    <div className="stack">
      <div className="card">
        <div className="entry-head">
          <h2>Your trends</h2>
          <div className="seg" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button key={r} className={days === r ? 'seg-btn on' : 'seg-btn'} onClick={() => setDays(r)}>{r}d</button>
            ))}
          </div>
        </div>
        {error && <div className="alert" role="alert">{error}</div>}
        {!data && !error && <p className="muted">Loading…</p>}
        {data && data.current.count === 0 && <p className="muted">No entries in the last {days} days. Log a few days to see trends.</p>}
      </div>

      {data && data.current.count > 0 && (
        <>
          <section className="grid">
            {cards.map(([label, key, unit]) => (
              <div className="card metric" key={key}>
                <span className="muted">{label}</span>
                <b>{data.current[key] ?? '–'}<small>{unit}</small></b>
                <Delta now={data.current[key]} before={data.previous[key]} />
              </div>
            ))}
          </section>

          <div className="card">
            <h3>Mood, energy and stress</h3>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="date" tickFormatter={short} tick={{ fontSize: 12 }} minTickGap={24} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="mood" stroke="#2f7d6b" strokeWidth={2.5} dot={false} name="Mood" />
                  <Line type="monotone" dataKey="energy" stroke="#d98a1f" strokeWidth={2.5} dot={false} name="Energy" />
                  <Line type="monotone" dataKey="stress" stroke="#b5483f" strokeWidth={2.5} dot={false} strokeDasharray="5 4" name="Stress" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3>Hours of sleep</h3>
            <div className="chart short">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.series} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="date" tickFormatter={short} tick={{ fontSize: 12 }} minTickGap={24} />
                  <YAxis domain={[0, 12]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="sleepHours" fill="#4a6fa5" radius={[4, 4, 0, 0]} name="Sleep (h)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3>Patterns in your entries</h3>
            {data.insights.length === 0
              ? <p className="muted">Not enough data yet. Patterns appear once there are at least 3 days with and without a routine.</p>
              : <ul className="insights">{data.insights.map((i) => <li key={i.title}><b>{i.title}</b><span>{i.text}</span></li>)}</ul>}
            <p className="hint">{data.note}</p>
          </div>
        </>
      )}
    </div>
  );
}
