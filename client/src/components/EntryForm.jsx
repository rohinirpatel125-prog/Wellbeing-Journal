import { useState } from 'react';
import { api, ROUTINES, todayStr } from '../api.js';

const SCALES = [
  { key: 'mood', label: 'Mood', low: 'Low', high: 'Great' },
  { key: 'energy', label: 'Energy', low: 'Drained', high: 'Energised' },
  { key: 'stress', label: 'Stress', low: 'Calm', high: 'Very stressed' },
];

function Scale({ item, value, onChange, error }) {
  return (
    <fieldset className="field">
      <legend>{item.label}</legend>
      <div className="scale" role="radiogroup" aria-label={item.label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} role="radio" aria-checked={value === n}
            className={value === n ? 'dot on' : 'dot'} onClick={() => onChange(n)}>{n}</button>
        ))}
      </div>
      <div className="scale-labels"><span>1 · {item.low}</span><span>5 · {item.high}</span></div>
      {error && <p className="field-error">{error}</p>}
    </fieldset>
  );
}

export default function EntryForm({ editing, entries, onSaved, onCancel }) {
  const [form, setForm] = useState(() => editing
    ? { date: editing.date, sleepHours: String(editing.sleepHours), mood: editing.mood, energy: editing.energy,
        stress: editing.stress, routines: editing.routines || [], notes: editing.notes || '' }
    : { date: todayStr(), sleepHours: '', mood: 0, energy: 0, stress: 0, routines: [], notes: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); setSaved(false); };
  const toggle = (r) => set('routines', form.routines.includes(r) ? form.routines.filter((x) => x !== r) : [...form.routines, r]);

  // Same rules as the server, so people get instant feedback
  const validate = () => {
    const e = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) e.date = 'Choose a date';
    else if (form.date > todayStr()) e.date = 'Date cannot be in the future';
    const h = Number(form.sleepHours);
    if (form.sleepHours === '' || Number.isNaN(h) || h < 0 || h > 24) e.sleepHours = 'Enter hours between 0 and 24';
    SCALES.forEach(({ key, label }) => { if (!form[key]) e[key] = `Pick a ${label.toLowerCase()} rating`; });
    if (form.notes.length > 1000) e.notes = 'Notes can be at most 1000 characters';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setFormError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const payload = { ...form, sleepHours: Number(form.sleepHours) };
    try {
      if (editing) await api.update(editing._id, payload);
      else await api.create(payload);
      setSaved(true);
      if (editing) { onSaved(); return; }
      await onSaved();
      setForm({ date: todayStr(), sleepHours: '', mood: 0, energy: 0, stress: 0, routines: [], notes: '' });
      setSaved(true);
    } catch (err) {
      const fieldErrs = {};
      (err.details || []).forEach((d) => { fieldErrs[d.field] = d.message; });
      setErrors(fieldErrs);
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const existing = !editing && entries.find((x) => x.date === form.date);

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h2>{editing ? `Edit entry · ${editing.date}` : 'How was your day?'}</h2>

      {formError && <div className="alert" role="alert">{formError}</div>}
      {saved && <div className="ok" role="status">Saved.</div>}

      <div className="row">
        <label className="field">Date
          <input type="date" value={form.date} max={todayStr()} onChange={(e) => set('date', e.target.value)}
            disabled={!!editing} aria-invalid={!!errors.date} />
          {errors.date && <p className="field-error">{errors.date}</p>}
          {existing && <p className="hint">You already have an entry for this date. Edit it in History.</p>}
        </label>
        <label className="field">Hours slept
          <input type="number" inputMode="decimal" step="0.5" min="0" max="24" placeholder="e.g. 7.5"
            value={form.sleepHours} onChange={(e) => set('sleepHours', e.target.value)} aria-invalid={!!errors.sleepHours} />
          {errors.sleepHours && <p className="field-error">{errors.sleepHours}</p>}
        </label>
      </div>

      {SCALES.map((s) => <Scale key={s.key} item={s} value={form[s.key]} onChange={(v) => set(s.key, v)} error={errors[s.key]} />)}

      <fieldset className="field">
        <legend>Routines today</legend>
        <div className="chips">
          {ROUTINES.map((r) => (
            <label key={r} className={form.routines.includes(r) ? 'chip on' : 'chip'}>
              <input type="checkbox" checked={form.routines.includes(r)} onChange={() => toggle(r)} /> {r}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">Notes (optional)
        <textarea rows="4" maxLength={1000} value={form.notes} placeholder="Anything you want to remember about today…"
          onChange={(e) => set('notes', e.target.value)} />
        <span className="hint">{form.notes.length}/1000</span>
        {errors.notes && <p className="field-error">{errors.notes}</p>}
      </label>

      <div className="actions">
        <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update entry' : 'Save entry'}</button>
        {editing && <button type="button" className="btn" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
