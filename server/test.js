// Offline tests: validation, error handling and stats logic (no database needed).
// CRUD against MongoDB is verified by running the app (see README).
const assert = require('assert');
const app = require('./app');
const { buildStats } = require('./stats');

const today = new Date().toISOString().slice(0, 10);
const good = { date: today, sleepHours: 7.5, mood: 4, energy: 3, stress: 2, routines: ['exercise'], notes: 'ok' };

(async () => {
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}/api`;
  const call = async (path, method = 'GET', body, raw) => {
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: raw ?? (body && JSON.stringify(body)) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  let n = 0; const t = (name, ok) => { assert(ok, name); console.log('  pass -', name); n++; };

  t('health check', (await call('/health')).status === 200);
  t('unknown route -> 404', (await call('/nope')).status === 404);
  let r = await call('/entries', 'POST', { ...good, mood: 9 });
  t('mood 9 -> 400 with field detail', r.status === 400 && r.json.details.some((d) => d.field === 'mood'));
  r = await call('/entries', 'POST', { ...good, sleepHours: 30 });
  t('sleep 30h -> 400', r.status === 400);
  r = await call('/entries', 'POST', { ...good, date: '2999-01-01' });
  t('future date -> 400', r.status === 400);
  r = await call('/entries', 'POST', { ...good, date: '2026-13-45' });
  t('impossible date -> 400', r.status === 400);
  r = await call('/entries', 'POST', { ...good, routines: ['hacking'] });
  t('unknown routine -> 400', r.status === 400);
  r = await call('/entries', 'POST', { ...good, notes: 'x'.repeat(1001) });
  t('notes > 1000 chars -> 400', r.status === 400);
  r = await call('/entries', 'POST', {});
  t('empty body -> 400 with many errors', r.status === 400 && r.json.details.length >= 4);
  r = await call('/entries', 'POST', null, '{bad json');
  t('malformed JSON -> 400', r.status === 400 && /JSON/.test(r.json.message));
  r = await call('/entries/123', 'DELETE');
  t('invalid id -> 400', r.status === 400);
  r = await call('/entries/stats?days=2');
  t('stats days=2 -> 400', r.status === 400);

  // stats logic
  const day = (i) => new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
  const mk = (i, sleep, mood, routines) => ({ date: day(i), sleepHours: sleep, mood, energy: 3, stress: 3, routines });
  const list = [];
  for (let i = 9; i >= 0; i--) list.push(i % 2 ? mk(i, 8, 4, ['exercise']) : mk(i, 5, 2, []));
  const s = buildStats(list, 10, day(9));
  t('stats: counts', s.current.count === 10 && s.previous.count === 0);
  t('stats: sleep insight present', s.insights.some((i) => i.title === 'Sleep and mood' && /averaged 4,/.test(i.text)));
  t('stats: routine insight present', s.insights.some((i) => i.title === 'Exercise'));
  t('stats: too little data -> no insight', buildStats(list.slice(0, 4), 10, day(9)).insights.length === 0);
  t('stats: has non-diagnostic note', /not a diagnosis/.test(s.note));

  server.close();
  console.log(`\n${n} tests passed`);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
