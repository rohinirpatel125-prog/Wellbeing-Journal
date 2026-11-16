const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function EntryList({ entries, onEdit, onDelete }) {
  if (!entries.length) {
    return <div className="card"><p className="muted">No entries yet. Add your first one in the Log tab.</p></div>;
  }
  return (
    <div className="list">
      {entries.map((e) => (
        <article className="card entry" key={e._id}>
          <div className="entry-head">
            <h3>{fmt(e.date)}</h3>
            <div className="actions">
              <button className="btn small" onClick={() => onEdit(e)}>Edit</button>
              <button className="btn small danger" onClick={() => onDelete(e)}>Delete</button>
            </div>
          </div>
          <ul className="stats">
            <li><span>Sleep</span><b>{e.sleepHours} h</b></li>
            <li><span>Mood</span><b>{e.mood}/5</b></li>
            <li><span>Energy</span><b>{e.energy}/5</b></li>
            <li><span>Stress</span><b>{e.stress}/5</b></li>
          </ul>
          {e.routines?.length > 0 && <div className="chips">{e.routines.map((r) => <span className="chip on static" key={r}>{r}</span>)}</div>}
          {e.notes && <p className="notes">{e.notes}</p>}
        </article>
      ))}
    </div>
  );
}
